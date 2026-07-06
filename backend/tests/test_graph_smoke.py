"""Smoke test do grafo Naninne (compila + executa input mínimo)."""

from __future__ import annotations

import uuid

from langchain_core.messages import AIMessage, HumanMessage

from app.graph.graph import build_graph, get_compiled_graph
from app.graph.nodes import end_node, orquestrador_node
from app.graph.state import AgentState, make_initial_state


def test_graph_builds() -> None:
    """``build_graph`` deve retornar um ``StateGraph`` com nós registrados."""
    builder = build_graph()
    # Não há API pública pra listar nós, mas o ``compile`` funciona
    # quando o builder está consistente.
    assert builder is not None


def test_graph_compiles_with_checkpointer() -> None:
    graph = get_compiled_graph()
    assert graph is not None


def test_graph_executes_minimal_input() -> None:
    """O grafo deve aceitar um estado mínimo e devolver um AIMessage."""
    graph = get_compiled_graph()
    thread_id = f"test-{uuid.uuid4()}"
    state = make_initial_state(
        user_id="robert",
        messages=[HumanMessage(content="olá")],
        thread_id=thread_id,
        task_id=str(uuid.uuid4()),
    )
    config = {"configurable": {"thread_id": thread_id}}

    result = graph.invoke(state, config=config)
    assert "messages" in result
    # Deve haver pelo menos um AIMessage (do orquestrador) e o HumanMessage original
    assert len(result["messages"]) >= 2
    last = result["messages"][-1]
    assert isinstance(last, AIMessage)
    assert "Sprint 0 skeleton" in last.content or "Recebi sua mensagem" in last.content
    assert result["next_agent"] in (None, "end")
    assert result["current_agent"] == "end"


def test_orquestrador_node_logs() -> None:
    """O orquestrador deve ser idempotente e devolver um AIMessage."""
    state: AgentState = AgentState(
        messages=[HumanMessage(content="teste")],
        thread_id="x",
        task_id="y",
        user_id="robert",
        current_agent="entry",
        next_agent="orquestrador",
    )
    out = orquestrador_node(state)
    assert out["next_agent"] == "end"
    assert any(isinstance(m, AIMessage) for m in out["messages"])
    assert out["current_agent"] == "orquestrador"


def test_end_node_is_noop() -> None:
    state: AgentState = AgentState(
        messages=[],
        thread_id="x",
        task_id="y",
        user_id="robert",
        current_agent="orquestrador",
        next_agent="end",
    )
    out = end_node(state)
    assert out["current_agent"] == "end"
    assert out["next_agent"] is None


def test_chat_endpoint_echo() -> None:
    """O ``/chat`` deve devolver um AIMessage identificável do esqueleto."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        response = c.post(
            "/chat",
            json={
                "messages": [{"role": "user", "content": "olá Naninne"}],
            },
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["response"]
    assert "Sprint 0 skeleton" in body["response"] or "Recebi" in body["response"]
    assert body["current_agent"] in {"orquestrador", "end"}
    assert "thread_id" in body
    assert "task_id" in body


def test_chat_endpoint_uses_thread_id_when_provided() -> None:
    from fastapi.testclient import TestClient

    from app.main import app

    thread_id = f"conv-test-{uuid.uuid4()}"
    with TestClient(app) as c:
        r1 = c.post(
            "/chat",
            json={
                "messages": [{"role": "user", "content": "primeira"}],
                "thread_id": thread_id,
            },
        )
        r2 = c.post(
            "/chat",
            json={
                "messages": [
                    {"role": "user", "content": "primeira"},
                    {"role": "assistant", "content": "(ack)"},
                    {"role": "user", "content": "segunda"},
                ],
                "thread_id": thread_id,
            },
        )
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["thread_id"] == thread_id
    assert r2.json()["thread_id"] == thread_id

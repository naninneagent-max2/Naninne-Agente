"""Endpoint ``POST /chat`` — entry point do Naninne.

Payload esperado:
    {
        "messages": [{"role": "user", "content": "olá"}, ...],
        "project_id": "uuid (opcional)",
        "thread_id":  "uuid (opcional — gerado se ausente)"
    }

Resposta (Sprint 0 — echo):
    {
        "thread_id":   "...",
        "task_id":     "...",
        "response":    "...",
        "sources":     [...],
        "tokens":      {"input": 0, "output": 0},
        "cost_usd":    0.0,
        "latency_ms":  0
    }

No Sprint 2 este endpoint:
    1. Carrega Mem0 (preferências/projetos do Robert).
    2. Roda CascadeRouter (Qwen3 8B).
    3. PlanGen (Claude Sonnet 4) gera o plano.
    4. HumanApproval (interrupt) se a task for destrutiva.
    5. ParallelFanout (Send API) dispara os agentes.
    6. Consolidator + Reviewer.
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any, Literal

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from pydantic import BaseModel, Field

from app.graph.graph import get_compiled_graph
from app.graph.state import make_initial_state

logger = logging.getLogger(__name__)

Role = Literal["system", "user", "assistant", "tool"]


# ─────────────────────────────────────────────────────────────────────────────
# Schemas de request/response
# ─────────────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """Mensagem de chat vinda do frontend."""

    role: Role
    content: str
    name: str | None = None


class ChatRequest(BaseModel):
    """Payload do ``POST /chat``."""

    messages: list[ChatMessage] = Field(..., min_length=1)
    project_id: str | None = None
    thread_id: str | None = None
    user_id: str = Field(default="robert", description="Identificador do usuário (auth vem no Sprint 3).")


class TokenUsage(BaseModel):
    input: int = 0
    output: int = 0


class ChatResponse(BaseModel):
    """Resposta do ``POST /chat``."""

    thread_id: str
    task_id: str
    response: str
    sources: list[dict[str, Any]] = Field(default_factory=list)
    tokens: TokenUsage = Field(default_factory=TokenUsage)
    cost_usd: float = 0.0
    latency_ms: int = 0
    current_agent: str = "orquestrador"


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _to_langchain_messages(msgs: list[ChatMessage]) -> list[BaseMessage]:
    """Converte ``ChatMessage`` (Pydantic) em ``BaseMessage`` (LangChain)."""
    out: list[BaseMessage] = []
    for m in msgs:
        if m.role == "user":
            out.append(HumanMessage(content=m.content, name=m.name))
        elif m.role == "assistant":
            out.append(AIMessage(content=m.content, name=m.name))
        else:
            # system / tool — cai para HumanMessage com prefixo (LangGraph
            # aceita múltiplos tipos). No Sprint 2 abrimos SystemMessage.
            out.append(HumanMessage(content=f"[{m.role}] {m.content}", name=m.name))
    return out


def _last_ai_text(messages: list[BaseMessage]) -> str:
    """Retorna o conteúdo textual do último AIMessage (ou fallback)."""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage):
            content = msg.content
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                return " ".join(
                    str(p.get("text", "")) if isinstance(p, dict) else str(p)
                    for p in content
                )
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint
# ─────────────────────────────────────────────────────────────────────────────

async def chat_endpoint(req: ChatRequest) -> ChatResponse:
    """Processa uma rodada de chat no grafo Naninne.

    Para o Sprint 0, o orquestrador é um skeleton que devolve um echo
    informativo. A partir do Sprint 2, o grafo completo entra em ação.
    """
    thread_id = req.thread_id or f"conv-{uuid.uuid4()}"
    task_id = str(uuid.uuid4())
    user_id = req.user_id or "robert"

    lc_messages = _to_langchain_messages(req.messages)
    initial_state = make_initial_state(
        user_id=user_id,
        messages=lc_messages,
        thread_id=thread_id,
        task_id=task_id,
        project_id=req.project_id,
    )

    config = {
        "configurable": {
            "thread_id": thread_id,
            "user_id": user_id,
            "task_id": task_id,
        }
    }

    graph = get_compiled_graph()
    t0 = time.perf_counter()
    try:
        # ``invoke`` (síncrono) para o Sprint 0. No Sprint 2, ``ainvoke``.
        result: dict[str, Any] = graph.invoke(initial_state, config=config)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Falha ao invocar o grafo (thread=%s).", thread_id)
        return ChatResponse(
            thread_id=thread_id,
            task_id=task_id,
            response=f"[erro interno] {exc!s}",
            latency_ms=int((time.perf_counter() - t0) * 1000),
        )
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    response_text = _last_ai_text(result.get("messages", []))
    return ChatResponse(
        thread_id=thread_id,
        task_id=task_id,
        response=response_text,
        sources=list(result.get("sources", []) or []),
        tokens=TokenUsage(
            input=int(result.get("tokens_input", 0) or 0),
            output=int(result.get("tokens_output", 0) or 0),
        ),
        cost_usd=float(result.get("cost_usd", 0.0) or 0.0),
        latency_ms=elapsed_ms,
        current_agent=result.get("current_agent", "orquestrador"),
    )


__all__ = ["chat_endpoint", "ChatRequest", "ChatResponse", "ChatMessage", "TokenUsage"]

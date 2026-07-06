"""Nós do grafo Naninne (Sprint 0 — esqueleto).

Implementa apenas o nó ``orquestrador`` (PlanGen + Consolidator combinados)
e o nó ``end`` (no-op). Os agentes especializados (Leitor, Visionário,
Pesquisador, etc.) entram nos próximos sprints.

A lógica real do Orquestrador (planning com Claude Sonnet 4 + cascata de
modelos) está documentada em ``docs/arquitetura-orquestrador.md`` §7 e será
adicionada no Sprint 2.
"""

from __future__ import annotations

import logging
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage

from app.graph.state import AgentState

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Orquestrador (nó principal)
# ─────────────────────────────────────────────────────────────────────────────

def orquestrador_node(state: AgentState) -> dict[str, Any]:
    """Skeleton do Orquestrador (Claude Sonnet 4 + cascata de modelos).

    Por enquanto:
        1. Loga quantas mensagens recebeu.
        2. Gera um echo simples (a última mensagem do usuário repetida)
           — para que o ``/chat`` endpoint devolva algo útil no Sprint 0.
        3. Define ``next_agent="end"`` para terminar o grafo.

    TODO (Sprint 2): substituir por:
        - CascadeRouter (Qwen3 8B) → classifica simple/complex/ambiguous.
        - PlanGen (Claude Sonnet 4) → gera plano de execução.
        - HumanApproval (interrupt) → pausa para Robert revisar.
        - ParallelFanout (Send API) → dispara agentes em paralelo.
        - Consolidator → agrega outputs.
        - Revisor → auditoria final.
    """
    msgs: list[BaseMessage] = state.get("messages", []) or []
    logger.info("Orquestrador recebeu %d mensagens (thread=%s).", len(msgs), state.get("thread_id"))

    # Echo mínimo para o esqueleto (Sprint 0)
    last_user_msg = _last_user_text(msgs) or ""
    response_text = (
        f"[Sprint 0 skeleton] Recebi sua mensagem: \"{last_user_msg}\". "
        "A lógica real do Orquestrador (planning, cascata de modelos, fan-out paralelo) "
        "será implementada no Sprint 2 conforme docs/arquitetura-orquestrador.md §7."
    )

    return {
        "messages": [AIMessage(content=response_text, name="orquestrador")],
        "current_agent": "orquestrador",
        "next_agent": "end",
        "tokens_output": len(response_text),  # aproximação grosseira só p/ smoke test
        "latency_ms": 0,
    }


# ─────────────────────────────────────────────────────────────────────────────
# End (nó terminal)
# ─────────────────────────────────────────────────────────────────────────────

def end_node(state: AgentState) -> dict[str, Any]:
    """Nó terminal — apenas loga o encerramento e mantém o estado."""
    logger.info("Grafo finalizado (thread=%s).", state.get("thread_id"))
    return {
        "current_agent": "end",
        "next_agent": None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _last_user_text(messages: list[BaseMessage]) -> str | None:
    """Retorna o conteúdo da última mensagem do usuário (ou ``None``)."""
    for msg in reversed(messages):
        # ``type(msg).__name__`` cobre tanto HumanMessage quanto subclasses.
        if type(msg).__name__ in {"HumanMessage", "HumanMessageChunk"}:
            content = msg.content
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                # Caso multimodal (lista de parts)
                return " ".join(
                    str(p.get("text", "")) if isinstance(p, dict) else str(p)
                    for p in content
                )
    return None


__all__ = ["orquestrador_node", "end_node"]

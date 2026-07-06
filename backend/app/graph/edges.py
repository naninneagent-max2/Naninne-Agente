"""Arestas condicionais do grafo Naninne (Sprint 0 — esqueleto).

A máquina completa (ver ``docs/arquitetura-orquestrador.md`` §3) tem:
    orquestrador → [cascata] → plan_gen → human_approval → fanout → … → reviewer → end

O esqueleto do Sprint 0 implementa apenas o desvio mínimo:
    orquestrador → (end | orquestrador)   — i.e. um loop "single-step".
"""

from __future__ import annotations

import logging

from app.graph.state import AgentName, AgentState

logger = logging.getLogger(__name__)


def route_after_orquestrador(state: AgentState) -> AgentName:
    """Decide o próximo nó após o Orquestrador.

    Regras:
        - Se ``state["error"]`` → ``"end"`` (falha reportada).
        - Se ``state["next_agent"]`` é ``None`` ou ``"end"`` → ``"end"``.
        - Caso contrário → roteia para o agente pedido (placeholder: "orquestrador").
    """
    if state.get("error"):
        logger.warning("Estado com erro — finalizando grafo: %s", state["error"])
        return "end"

    target = state.get("next_agent")
    if target in (None, "end"):
        return "end"

    # Placeholder: o Sprint 2 adicionará routing real para memory_read,
    # cascade_router, plan_gen, human_approval, parallel_fanout, etc.
    logger.info("Routing após orquestrador → %s (placeholder).", target)
    if target == "orquestrador":
        return "orquestrador"
    return "end"


__all__ = ["route_after_orquestrador"]

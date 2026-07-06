"""Compilação do grafo Naninne (Sprint 0 — esqueleto).

O grafo atual é o mínimo viável para validar:
    1. PostgresSaver (ou SqliteSaver como fallback) está funcional.
    2. O nó ``orquestrador`` recebe o estado, processa, e devolve um AIMessage.
    3. O roteamento condicional encerra o grafo via nó ``end``.

A expansão para MemoryRead / CascadeRouter / PlanGen / HumanApproval /
ParallelFanout / Consolidator / Reviewer acontece no Sprint 2 (ver
``docs/arquitetura-orquestrador.md`` §3 para o state machine alvo).
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

from langgraph.graph import END, START, StateGraph

from app.config import settings
from app.db.checkpointer import CheckpointerType, get_checkpointer
from app.graph.edges import route_after_orquestrador
from app.graph.nodes import end_node, orquestrador_node
from app.graph.state import AgentState

logger = logging.getLogger(__name__)


def build_graph() -> StateGraph:
    """Constrói (sem compilar) o ``StateGraph`` com os nós do Sprint 0.

    Separar build/compile facilita testes que querem inspecionar a
    estrutura sem tocar o checkpointer.
    """
    builder: StateGraph = StateGraph(AgentState)

    # ── Nós ──
    builder.add_node("orquestrador", orquestrador_node)
    builder.add_node("end", end_node)

    # ── Entry point ──
    builder.add_edge(START, "orquestrador")

    # ── Edges ──
    # Condicional após o orquestrador (decide se vai pro end ou loop)
    builder.add_conditional_edges(
        "orquestrador",
        route_after_orquestrador,
        {
            "orquestrador": "orquestrador",   # placeholder p/ loop futuro
            "end": "end",
        },
    )
    # End → END
    builder.add_edge("end", END)

    return builder


@lru_cache(maxsize=1)
def get_compiled_graph() -> Any:
    """Retorna o grafo compilado (singleton, com checkpointer conectado).

    O ``lru_cache`` garante que o checkpointer é criado uma única vez
    por processo. Em testes, faça ``get_compiled_graph.cache_clear()``
    para forçar nova compilação.
    """
    logger.info("Compilando grafo Naninne (checkpointer=%s).", settings.checkpointer_backend)
    builder = build_graph()
    cp: CheckpointerType = get_checkpointer()
    graph = builder.compile(checkpointer=cp)
    logger.info("Grafo compilado com sucesso.")
    return graph


def reset_graph() -> None:
    """Limpa o singleton (usado em testes que precisam reconfigurar)."""
    get_compiled_graph.cache_clear()


__all__ = ["build_graph", "get_compiled_graph", "reset_graph"]

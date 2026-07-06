"""Estado partilhado do grafo Naninne (AgentState).

A especificação canônica vive em
``docs/arquitetura-orquestrador.md`` §3 — aqui temos o subset necessário
para o esqueleto do Sprint 0 (sem MemoryRead/CascadeRouter/Consolidator/
Reviewer ainda).
"""

from __future__ import annotations

import operator
from typing import Annotated, Literal, TypedDict

from langgraph.graph.message import add_messages
from langgraph.managed import IsLastStep

# ─────────────────────────────────────────────────────────────────────────────
# Constantes de routing
# ─────────────────────────────────────────────────────────────────────────────

AgentName = Literal[
    "orquestrador",
    "memory_read",
    "cascade_router",
    "plan_gen",
    "human_approval",
    "parallel_fanout",
    "consolidator",
    "reviewer",
    "end",
]


# ─────────────────────────────────────────────────────────────────────────────
# AgentState (Sprint 0 — esqueleto)
# ─────────────────────────────────────────────────────────────────────────────

class AgentState(TypedDict, total=False):
    """Estado do grafo Naninne.

    Marcado ``total=False`` para que campos opcionais (ex.: ``project_id``)
    possam ser omitidos no input inicial. LangGraph faz merge por canal;
    ``messages`` usa ``add_messages`` (acumula), ``tool_calls``/``sources``
    usam ``add`` (concatena), ``agent_outputs``/``retry_counts`` usam
    ``operator.ior`` (merge de dicts).
    """

    # ── Identidade & sessão ──
    task_id: str                            # UUID, único por invocação
    project_id: str | None
    user_id: str                            # default "robert" (preenchido em routers)
    thread_id: str                          # mesmo valor do config; mantido no state para auditoria

    # ── Mensagens (acumulado, append-only) ──
    messages: Annotated[list, add_messages]

    # ── Controle de execução ──
    current_agent: str                      # último nó que rodou
    next_agent: AgentName | None            # próximo nó escolhido pelo edge condicional

    # ── Auditoria & tool-use ──
    tool_calls: Annotated[list[dict], operator.add]
    sources: Annotated[list[dict], operator.add]

    # ── Métricas de execução (somadas ao longo da thread) ──
    tokens_input: int
    tokens_output: int
    cost_usd: float
    latency_ms: int

    # ── Erros ──
    error: str | None

    # ── Limite de recursão do LangGraph ──
    is_last_step: IsLastStep


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_initial_state(
    *,
    user_id: str,
    messages: list,
    thread_id: str,
    task_id: str,
    project_id: str | None = None,
) -> AgentState:
    """Constrói o estado inicial usado pelo ``/chat`` router.

    Os demais campos ficam em default (LangGraph cuida do merge).
    """
    return AgentState(
        task_id=task_id,
        thread_id=thread_id,
        project_id=project_id,
        user_id=user_id,
        messages=messages,                    # type: ignore[typeddict-item]
        current_agent="entry",
        next_agent="orquestrador",
        tool_calls=[],
        sources=[],
        tokens_input=0,
        tokens_output=0,
        cost_usd=0.0,
        latency_ms=0,
        error=None,
    )


__all__ = ["AgentState", "AgentName", "make_initial_state"]

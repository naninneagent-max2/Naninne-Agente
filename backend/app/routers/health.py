"""Endpoint ``GET /health`` — readiness/liveness do backend.

Retorna:
    {
        "status": "ok" | "degraded",
        "graph_compiled": bool,
        "checkpointer_connected": bool,
        "models": {"claude_sonnet": "stub"|"configured", ...},
        "environment": "dev"|"staging"|"prod"
    }
"""

from __future__ import annotations

import logging

from pydantic import BaseModel

from app.config import settings
from app.db.checkpointer import checkpointer_healthcheck
from app.graph.graph import get_compiled_graph
from app.models.llm import list_available_models

logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    status: str
    graph_compiled: bool
    checkpointer_connected: bool
    models: dict[str, str]
    environment: str


def health_endpoint() -> HealthResponse:
    """Checagem rápida de sanidade do backend."""
    graph_ok = False
    try:
        get_compiled_graph()
        graph_ok = True
    except Exception as exc:  # noqa: BLE001
        logger.error("Falha ao obter grafo compilado: %s", exc)

    cp_ok = checkpointer_healthcheck()

    if graph_ok and cp_ok:
        status = "ok"
    elif graph_ok or cp_ok:
        status = "degraded"
    else:
        status = "down"

    return HealthResponse(
        status=status,
        graph_compiled=graph_ok,
        checkpointer_connected=cp_ok,
        models=list_available_models(),
        environment=settings.environment,
    )


__all__ = ["health_endpoint", "HealthResponse"]

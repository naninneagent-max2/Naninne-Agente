"""Teste do endpoint ``GET /health``."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_200() -> None:
    response = client.get("/health")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] in {"ok", "degraded", "down"}
    assert "graph_compiled" in body
    assert "checkpointer_connected" in body
    assert "models" in body
    assert "environment" in body


def test_health_compiles_graph() -> None:
    """O /health deve reportar graph_compiled=True (a inicialização ocorre no lifespan)."""
    # O TestClient do FastAPI executa o lifespan se usado como context manager.
    with TestClient(app) as c:
        response = c.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["graph_compiled"] is True, body
    assert body["checkpointer_connected"] is True, body
    assert body["status"] == "ok", body

"""FastAPI app do Naninne (Sprint 0 — esqueleto).

Rotas:
    GET  /health        — readiness/liveness
    POST /chat          — entry point da conversa
    GET  /docs          — Swagger UI (FastAPI nativo)

CORS: liberado para ``http://localhost:3000`` (frontend Next.js).
Lifespan: inicializa o grafo + checkpointer uma única vez no startup.

Execução local:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.graph.graph import get_compiled_graph
from app.routers.chat import ChatRequest, ChatResponse, chat_endpoint
from app.routers.health import HealthResponse, health_endpoint

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────

def _configure_logging() -> None:
    """Configura logging estruturado (stdlib, formato JSON-like)."""
    root = logging.getLogger()
    if root.handlers:
        # Já configurado (reload do uvicorn)
        return

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
    )
    root.addHandler(handler)
    root.setLevel(settings.log_level.upper())

    # Silencia bibliotecas muito verbosas por padrão
    for noisy in ("httpx", "httpcore", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


_configure_logging()
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Inicializa o grafo (e checkpointer) no startup; libera no shutdown."""
    logger.info("Naninne backend iniciando (env=%s, checkpointer=%s).",
                settings.environment, settings.checkpointer_backend)
    try:
        # ``get_compiled_graph`` é lazy + cached; chamamos aqui para
        # falhar cedo se o checkpointer estiver indisponível.
        get_compiled_graph()
        logger.info("Grafo compilado com sucesso.")
    except Exception as exc:  # noqa: BLE001
        # Não matamos o app: o /health vai reportar 'degraded' e o
        # /chat vai devolver erro estruturado. Assim o operador
        # consegue diagnosticar via healthcheck.
        logger.error("Falha ao inicializar o grafo: %s", exc)

    yield

    logger.info("Naninne backend finalizando.")


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Naninne — Orquestrador",
    version="0.1.0",
    description=(
        "Backend do Naninne (Sprint 0 — esqueleto). "
        "Documentação canônica em /workspace/docs/arquitetura-orquestrador.md."
    ),
    lifespan=lifespan,
)

# CORS — liberado para o frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Rotas
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health() -> HealthResponse:
    """Readiness/liveness check."""
    return health_endpoint()


@app.post("/chat", response_model=ChatResponse, tags=["chat"])
async def chat(req: ChatRequest) -> ChatResponse:
    """Entry point de uma nova mensagem do Robert.

    No Sprint 0 o orquestrador é um skeleton; ver ``routers/chat.py``.
    """
    return await chat_endpoint(req)


# ─────────────────────────────────────────────────────────────────────────────
# CLI entrypoint (``naninne-api`` script)
# ─────────────────────────────────────────────────────────────────────────────

def run() -> None:
    """Entry point para ``naninne-api`` (definido em pyproject.toml)."""
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.environment == "dev",
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    run()

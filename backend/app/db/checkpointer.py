"""Checkpointer LangGraph para o Naninne.

Decisão de arquitetura (ver ``docs/arquitetura-orquestrador.md`` §6):
    - Produção: ``AsyncPostgresSaver`` conectado ao Supabase.
    - Sandbox/CI: ``SqliteSaver`` (memória persistente em arquivo local).

O grafo precisa de um *checkpointer base* (síncrono) para ``graph.compile``,
mas pode ser executado de forma assíncrona em produção. Este módulo expõe
uma factory única ``get_checkpointer()`` que retorna o tipo certo conforme
a configuração.
"""

from __future__ import annotations

import logging
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager, suppress
from datetime import UTC
from pathlib import Path
from typing import Any

from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from psycopg import Connection
from psycopg_pool import ConnectionPool

from app.config import settings

logger = logging.getLogger(__name__)

# Tipo união aceito pelo ``graph.compile(checkpointer=...)``.
CheckpointerType = (
    MemorySaver | SqliteSaver | PostgresSaver
)


# ─────────────────────────────────────────────────────────────────────────────
# Postgres setup
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_postgres_can_connect() -> None:
    """Tenta uma conexão rápida ao Postgres; levanta ``RuntimeError`` se falhar.

    Útil para cair para SQLite cedo em ambientes onde o Supabase ainda
    não está acessível.
    """
    try:
        # Conexão efêmera só para validar DSN
        with (
            Connection.connect(settings.database_url, connect_timeout=3) as conn,
            conn.cursor() as cur,
        ):
            cur.execute("SELECT 1")
            cur.fetchone()
        logger.info("Conexão Postgres OK: %s", _redact_dsn(settings.database_url))
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Postgres indisponível: {exc}") from exc


def _redact_dsn(dsn: str) -> str:
    """Remove a senha do DSN para logging seguro."""
    try:
        from urllib.parse import urlparse, urlunparse

        parsed = urlparse(dsn)
        if parsed.password:
            netloc = f"{parsed.username}:***@{parsed.hostname}"
            if parsed.port:
                netloc += f":{parsed.port}"
            return urlunparse(parsed._replace(netloc=netloc))
    except Exception:  # noqa: BLE001
        return "<dsn inválido>"
    return dsn


def _build_sync_postgres_saver() -> PostgresSaver:
    """Constrói um ``PostgresSaver`` síncrono.

    O grafo do Sprint 0 é compilado de forma síncrona (a invocação
    assíncrona vem no Sprint 2 com paralelismo de agentes).
    """
    _ensure_postgres_can_connect()
    pool = ConnectionPool(
        conninfo=settings.database_url,
        min_size=settings.db_pool_min_size,
        max_size=settings.db_pool_max_size,
        kwargs={"autocommit": True},
        open=False,
    )
    pool.open(wait=False, timeout=10)
    saver = PostgresSaver(pool)
    # Idempotente: cria as tabelas do checkpointer se não existirem.
    saver.setup()
    logger.info("PostgresSaver inicializado (pool %d-%d).", settings.db_pool_min_size, settings.db_pool_max_size)
    return saver


async def _build_async_postgres_saver() -> AsyncPostgresSaver:
    """Constrói um ``AsyncPostgresSaver`` (para uso futuro em production)."""
    from psycopg_pool import AsyncConnectionPool

    _ensure_postgres_can_connect()
    pool = AsyncConnectionPool(
        conninfo=settings.database_url,
        min_size=settings.db_pool_min_size,
        max_size=settings.db_pool_max_size,
        kwargs={"autocommit": True},
        open=False,
    )
    await pool.open(wait=False, timeout=10)
    saver = AsyncPostgresSaver(pool)
    await saver.setup()
    return saver


# ─────────────────────────────────────────────────────────────────────────────
# SQLite setup (fallback)
# ─────────────────────────────────────────────────────────────────────────────

def _build_sqlite_saver() -> SqliteSaver:
    """Constrói um ``SqliteSaver`` síncrono a partir de um arquivo local.

    Assegura que o diretório pai exista. SQLite não precisa de ``setup()``
    (a lib cria as tabelas na primeira escrita).
    """
    path = Path(settings.sqlite_checkpointer_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    # Conexão check_same_thread=False para o LangGraph usar de threads
    # internas (assíncrono). checkpointer usa serialização por linha.
    conn = sqlite3.connect(str(path), check_same_thread=False)
    saver = SqliteSaver(conn)
    logger.info("SqliteSaver inicializado em %s.", path)
    return saver


# ─────────────────────────────────────────────────────────────────────────────
# Factory pública
# ─────────────────────────────────────────────────────────────────────────────

def get_checkpointer() -> CheckpointerType:
    """Retorna o checkpointer apropriado segundo ``settings.checkpointer_backend``.

    - ``"postgres"`` (default) → ``PostgresSaver`` ligado ao Supabase.
    - ``"sqlite"`` → ``SqliteSaver`` local (fallback para sandbox/CI).

    Em caso de falha de conexão com Postgres e ``checkpointer_backend=postgres``,
    loga warning e cai automaticamente para SQLite para não impedir o boot
    (comportamento de "graceful degradation" do esqueleto).
    """
    if settings.checkpointer_backend == "sqlite":
        return _build_sqlite_saver()

    # Backend postgres com fallback automático
    try:
        return _build_sync_postgres_saver()
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Falha ao inicializar PostgresSaver (%s). Caindo para SqliteSaver.",
            exc,
        )
        return _build_sqlite_saver()


async def aget_checkpointer() -> Any:
    """Versão assíncrona (usada no lifespan do FastAPI em produção)."""
    if settings.checkpointer_backend == "sqlite":
        return AsyncSqliteSaver.from_conn_string(settings.sqlite_checkpointer_path)

    try:
        return await _build_async_postgres_saver()
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Falha ao inicializar AsyncPostgresSaver (%s). Caindo para AsyncSqliteSaver.",
            exc,
        )
        return AsyncSqliteSaver.from_conn_string(settings.sqlite_checkpointer_path)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers utilitários
# ─────────────────────────────────────────────────────────────────────────────

@contextmanager
def temporary_sqlite_saver() -> Iterator[SqliteSaver]:
    """Context manager que cria um SqliteSaver temporário em /tmp.

    Útil em testes que não querem tocar no arquivo principal.
    """
    import tempfile

    tmp = Path(tempfile.mkdtemp()) / "test.db"
    conn = sqlite3.connect(str(tmp), check_same_thread=False)
    try:
        yield SqliteSaver(conn)
    finally:
        conn.close()
        with suppress(OSError):
            tmp.unlink()


def checkpointer_healthcheck() -> bool:
    """Verifica se o checkpointer está funcional (lê + escreve)."""
    try:
        cp = get_checkpointer()
        import uuid as _uuid
        from datetime import datetime

        config = {
            "configurable": {
                "thread_id": "__healthcheck__",
                "checkpoint_ns": "",
                "checkpoint_id": str(_uuid.uuid4()),
            }
        }
        checkpoint = {
            "v": 1,
            "id": config["configurable"]["checkpoint_id"],
            "ts": datetime.now(UTC).isoformat(),
            "channel_values": {"ping": True},
            "channel_versions": {},
            "versions_seen": {},
            "updated_channels": ["ping"],
        }
        metadata = {"source": "health", "step": 0, "writes": {}}
        new_versions: dict = {}
        cp.put(config, checkpoint, metadata, new_versions)
        cp.get(config)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Healthcheck do checkpointer falhou: %s", exc)
        return False

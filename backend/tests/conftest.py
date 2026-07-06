"""Conftest compartilhado entre os testes do Naninne.

Forçamos o checkpointer a usar SQLite (em /tmp) durante a suíte para:
    1. Não depender de Postgres externo.
    2. Cada teste começar do zero (banco fresco).
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

# IMPORTANTE: essas variáveis precisam estar configuradas ANTES do import
# de ``app.config``, porque ``Settings`` lê o ambiente na instanciação.
_TMP_DIR = Path(tempfile.mkdtemp(prefix="naninne-tests-"))
os.environ["CHECKPOINTER_BACKEND"] = "sqlite"
os.environ["SQLITE_CHECKPOINTER_PATH"] = str(_TMP_DIR / "test.db")
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-used")
os.environ.setdefault("LOG_LEVEL", "WARNING")

# Importações abaixo podem usar ``app.config`` / ``app.graph`` com segurança
from app.config import get_settings  # noqa: E402
from app.graph.graph import reset_graph  # noqa: E402


def pytest_collection_modifyitems(config, items):  # noqa: D401
    """Hook: loga quais testes foram coletados (apenas em -v)."""
    pass


def pytest_sessionstart(session):  # noqa: D401
    """Hook: reseta o grafo compilado antes da suíte."""
    get_settings.cache_clear()
    reset_graph()

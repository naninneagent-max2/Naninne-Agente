"""Configuração central do Naninne backend (Pydantic Settings).

Todas as variáveis de ambiente são carregadas uma única vez a partir de
``.env`` e expostas como ``settings``. Qualquer módulo que precise de
configuração deve importar ``settings`` deste pacote.

A referência canônica para o que cada chave significa está em
``docs/arquitetura-orquestrador.md`` (seção 6) e em
``docs/naninne-master-doc.md`` (seção 6 — Stack).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Snapshot tipado de ``.env``.

    Os defaults são pensados para que o esqueleto (Sprint 0) dê boot sem
    todas as chaves reais: o que for opcional usa sentinelas vazios e os
    wrappers de modelo decidem se querem falhar.
    """

    # ── Banco de dados (Supabase Postgres) ──
    # connection string estilo libpq, ex:
    #   postgresql://postgres:senha@db.<project>.supabase.co:5432/postgres
    database_url: str = Field(
        default="postgresql://naninne:naninne_dev@localhost:5432/naninne",
        description="DSN do Postgres usado pelo checkpointer LangGraph e pelo Supabase.",
    )
    # Connection pool
    db_pool_min_size: int = Field(default=2, ge=1, le=50)
    db_pool_max_size: int = Field(default=10, ge=2, le=100)

    # ── Supabase (REST + service role) ──
    supabase_url: str = Field(default="", description="URL do projeto Supabase.")
    supabase_service_role_key: str = Field(
        default="",
        description="Service-role key do Supabase (NUNCA expor no frontend).",
    )

    # ── Provedores de LLM ──
    anthropic_api_key: str = Field(default="", description="Chave da Anthropic (Claude).")
    google_api_key: str = Field(default="", description="Chave do Google AI Studio (Gemini).")
    openai_api_key: str = Field(default="", description="Chave da OpenAI (embeddings + Whisper).")

    # ── Modelos (nomes override-áveis) ──
    claude_sonnet_model: str = Field(default="claude-sonnet-4-5")
    gemini_pro_model: str = Field(default="gemini-2.5-pro")
    qwen_router_model: str = Field(default="qwen3-8b")
    hermes_model: str = Field(default="hermes-4.3-36b")

    # ── Qwen3 / Hermes endpoints (self-hosted) ──
    # O esqueleto aceita stubs; quando o stack self-hosted estiver
    # disponível, basta apontar para o endpoint real.
    qwen_router_base_url: str = Field(
        default="",
        description="Endpoint OpenAI-compatible do Qwen3 router. Vazio = stub.",
    )
    hermes_base_url: str = Field(
        default="",
        description="Endpoint OpenAI-compatible do Hermes 4.3. Vazio = stub.",
    )

    # ── Observabilidade (LangSmith) ──
    langsmith_api_key: str = Field(default="", description="Chave do LangSmith (opcional).")
    langsmith_project: str = Field(default="naninne-dev")
    langsmith_endpoint: str = Field(default="https://api.smith.langchain.com")
    langchain_tracing_v2: bool = Field(default=False)

    # ── API ──
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000, ge=1, le=65535)
    api_cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"],
        description="Origens permitidas no CORS (frontend Next.js).",
    )
    environment: Literal["dev", "staging", "prod"] = Field(default="dev")

    # ── Checkpointer ──
    # Permite forçar SQLite (útil em sandbox/CI sem Postgres remoto).
    checkpointer_backend: Literal["postgres", "sqlite"] = Field(
        default="postgres",
        description="Backend do checkpointer. Use 'sqlite' para desenvolvimento offline.",
    )
    sqlite_checkpointer_path: str = Field(
        default=".checkpoints/naninne.db",
        description="Caminho do arquivo SQLite quando checkpointer_backend=sqlite.",
    )

    # ── Logging ──
    log_level: str = Field(default="INFO")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Retorna a instância singleton de ``Settings``.

    O ``lru_cache`` garante que o ``.env`` é lido uma única vez por processo.
    Em testes, faça ``get_settings.cache_clear()`` para forçar releitura.
    """
    return Settings()


# Singleton para uso direto: ``from app.config import settings``
settings: Settings = get_settings()

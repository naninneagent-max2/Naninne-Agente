"""Wrappers dos 4 modelos principais do Naninne (Sprint 0).

Referência canônica: ``docs/arquitetura-orquestrador.md`` §7 e
``docs/naninne-master-doc.md`` §6.

| Modelo              | Função                                     | Wrapper                       |
|---------------------|--------------------------------------------|-------------------------------|
| Claude Sonnet 4     | Raciocínio, redação, revisão                | ``ChatAnthropic``             |
| Gemini 2.5 Pro      | Janela 2M tokens (livros inteiros)         | ``ChatGoogleGenerativeAI``    |
| Qwen3 8B            | Cascade router (classificação barata)       | OpenAI-compat (stub se vazio) |
| Hermes 4.3 36B      | Tarefas mecânicas, self-hosted              | OpenAI-compat (stub se vazio) |

Os wrappers Qwen3/Hermes são ``stubs`` enquanto os endpoints self-hosted
não estão disponíveis — basta preencher ``QWEN_ROUTER_BASE_URL`` /
``HERMES_BASE_URL`` no ``.env`` para ligar de verdade. O LangChain aceita
qualquer servidor compatível com a API da OpenAI via
``ChatOpenAI(base_url=...)``.
"""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Configuração comum
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_TIMEOUT_S: float = 30.0
DEFAULT_MAX_RETRIES: int = 2


class LLMCallResult(BaseModel):
    """Envelope retornado pelos wrappers (placeholder para o Sprint 2)."""

    model: str
    content: str
    tokens_input: int = 0
    tokens_output: int = 0
    cost_usd: float = 0.0
    latency_ms: int = 0
    raw: Any | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Claude Sonnet 4
# ─────────────────────────────────────────────────────────────────────────────

def get_claude_sonnet(
    *,
    temperature: float = 0.0,
    max_tokens: int = 4096,
    timeout: float = DEFAULT_TIMEOUT_S,
    max_retries: int = DEFAULT_MAX_RETRIES,
):
    """Retorna um ``ChatAnthropic`` configurado para Claude Sonnet 4.

    Importação lazy para não quebrar import-time se a chave não estiver
    configurada.
    """
    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY não configurada. Defina a chave no .env "
            "antes de usar get_claude_sonnet()."
        )

    from langchain_anthropic import ChatAnthropic

    logger.debug("Inicializando ChatAnthropic model=%s", settings.claude_sonnet_model)
    return ChatAnthropic(
        model=settings.claude_sonnet_model,
        api_key=settings.anthropic_api_key,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=timeout,
        max_retries=max_retries,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Gemini 2.5 Pro
# ─────────────────────────────────────────────────────────────────────────────

def get_gemini_pro(
    *,
    temperature: float = 0.0,
    max_tokens: int = 8192,
    timeout: float = DEFAULT_TIMEOUT_S,
    max_retries: int = DEFAULT_MAX_RETRIES,
):
    """Retorna um ``ChatGoogleGenerativeAI`` configurado para Gemini 2.5 Pro."""
    if not settings.google_api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY não configurada. Defina a chave no .env "
            "antes de usar get_gemini_pro()."
        )

    from langchain_google_genai import ChatGoogleGenerativeAI

    logger.debug("Inicializando ChatGoogleGenerativeAI model=%s", settings.gemini_pro_model)
    return ChatGoogleGenerativeAI(
        model=settings.gemini_pro_model,
        google_api_key=settings.google_api_key,
        temperature=temperature,
        max_output_tokens=max_tokens,
        timeout=timeout,
        max_retries=max_retries,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Qwen3 8B (router) — OpenAI-compatible
# ─────────────────────────────────────────────────────────────────────────────

class _StubChatModel:
    """Stub usado quando o endpoint self-hosted do Qwen3/Hermes não está configurado.

    Implementa o mínimo da interface do LangChain (``.invoke``) para que o
    esqueleto rode sem dependência externa. Lança ``NotImplementedError``
    se alguém tentar invocar de verdade.
    """

    def __init__(self, model_name: str, *, note: str) -> None:
        self.model_name = model_name
        self._note = note

    def invoke(self, *args: Any, **kwargs: Any):  # noqa: D401
        raise NotImplementedError(
            f"{self.model_name} está em modo stub ({self._note}). "
            "Configure o endpoint self-hosted correspondente no .env."
        )

    async def ainvoke(self, *args: Any, **kwargs: Any):
        raise NotImplementedError(
            f"{self.model_name} está em modo stub ({self._note})."
        )


def get_qwen_router(
    *,
    temperature: float = 0.0,
    max_tokens: int = 5,
    timeout: float = DEFAULT_TIMEOUT_S,
    max_retries: int = DEFAULT_MAX_RETRIES,
):
    """Retorna o Qwen3 8B (classificador) ou um stub se não houver endpoint.

    O Qwen3 é exposto como servidor OpenAI-compatible. Quando o
    ``QWEN_ROUTER_BASE_URL`` está vazio, retornamos um stub que falha
    com mensagem clara.
    """
    if not settings.qwen_router_base_url:
        logger.warning(
            "QWEN_ROUTER_BASE_URL vazio — get_qwen_router() retornando stub. "
            "O Sprint 2 vai falhar ao tentar classificar; configure o endpoint."
        )
        return _StubChatModel(
            settings.qwen_router_model,
            note="QWEN_ROUTER_BASE_URL não configurado",
        )

    from langchain_openai import ChatOpenAI

    logger.debug("Inicializando ChatOpenAI(Qwen3) base_url=%s", settings.qwen_router_base_url)
    return ChatOpenAI(
        model=settings.qwen_router_model,
        base_url=settings.qwen_router_base_url,
        api_key="EMPTY",  # servidores self-hosted frequentemente não exigem auth
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=timeout,
        max_retries=max_retries,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Hermes 4.3 36B — OpenAI-compatible
# ─────────────────────────────────────────────────────────────────────────────

def get_hermes(
    *,
    temperature: float = 0.2,
    max_tokens: int = 1024,
    timeout: float = DEFAULT_TIMEOUT_S,
    max_retries: int = DEFAULT_MAX_RETRIES,
):
    """Retorna o Hermes 4.3 36B (tarefas mecânicas) ou um stub."""
    if not settings.hermes_base_url:
        logger.warning(
            "HERMES_BASE_URL vazio — get_hermes() retornando stub. "
            "O Sprint 2 vai falhar ao tentar usar; configure o endpoint."
        )
        return _StubChatModel(
            settings.hermes_model,
            note="HERMES_BASE_URL não configurado",
        )

    from langchain_openai import ChatOpenAI

    logger.debug("Inicializando ChatOpenAI(Hermes) base_url=%s", settings.hermes_base_url)
    return ChatOpenAI(
        model=settings.hermes_model,
        base_url=settings.hermes_base_url,
        api_key="EMPTY",
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=timeout,
        max_retries=max_retries,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Utilitários
# ─────────────────────────────────────────────────────────────────────────────

def list_available_models() -> dict[str, str]:
    """Retorna o status de cada modelo (configured | stub | unavailable)."""
    def _status(name: str, key_or_url: str) -> str:
        return "configured" if key_or_url else "stub"

    return {
        "claude_sonnet": _status("claude", settings.anthropic_api_key),
        "gemini_pro":    _status("gemini", settings.google_api_key),
        "qwen3_router":  _status("qwen3",   settings.qwen_router_base_url),
        "hermes_4_3":    _status("hermes",  settings.hermes_base_url),
    }


__all__ = [
    "DEFAULT_MAX_RETRIES",
    "DEFAULT_TIMEOUT_S",
    "LLMCallResult",
    "get_claude_sonnet",
    "get_gemini_pro",
    "get_hermes",
    "get_qwen_router",
    "list_available_models",
]

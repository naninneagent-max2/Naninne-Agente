# Naninne — Backend (Orquestrador LangGraph)

> Esqueleto do Sprint 0: API FastAPI que carrega o grafo LangGraph, persiste
> checkpoints no Postgres (Supabase) e expõe ``/chat`` + ``/health`` para o
> frontend Next.js.

**Fontes canônicas:**

- [`docs/arquitetura-orquestrador.md`](../docs/arquitetura-orquestrador.md) — decisões técnicas do orquestrador.
- [`docs/naninne-master-doc.md`](../docs/naninne-master-doc.md) §2 (Arquitetura de Agentes) e §6 (Stack).
- [`docs/schema-supabase-doc.md`](../docs/schema-supabase-doc.md) — schema do banco.

---

## 📑 Sumário

1. [Stack](#stack)
2. [Estrutura de pastas](#estrutura-de-pastas)
3. [Como instalar](#como-instalar)
4. [Como rodar localmente](#como-rodar-localmente)
5. [Como rodar os testes](#como-rodar-os-testes)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Endpoints](#endpoints)
8. [Como o frontend consome esta API](#como-o-frontend-consome-esta-api)
9. [Limitações conhecidas (Sprint 0)](#limitações-conhecidas-sprint-0)
10. [Próximo passo (Sprint 2)](#próximo-passo-sprint-2)

---

## Stack

| Camada            | Ferramenta                                              |
|-------------------|---------------------------------------------------------|
| Orquestrador      | **LangGraph 1.x** (StateGraph + PostgresSaver)          |
| LLM SDK           | **LangChain 1.x** + wrappers Anthropic / Google / OpenAI|
| API HTTP          | **FastAPI 0.139** + **uvicorn**                         |
| Banco / checkpointer | **Postgres 15** (Supabase em prod, local em dev)     |
| Config            | **pydantic-settings** + **python-dotenv**               |
| Logging           | stdlib (`logging` com formato estruturado)               |
| Observabilidade   | **LangSmith** (opcional, gated por env var)             |
| HTTP client       | **httpx** (para Tavily, Brave, Supabase REST)            |
| Testes            | **pytest** + **pytest-asyncio** + FastAPI TestClient    |

---

## Estrutura de pastas

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI app + lifespan + CORS
│   ├── config.py              # Pydantic Settings (.env)
│   ├── graph/
│   │   ├── __init__.py
│   │   ├── state.py           # AgentState TypedDict
│   │   ├── nodes.py           # Orquestrador + End (skeleton)
│   │   ├── edges.py           # Conditional edges (skeleton)
│   │   └── graph.py           # Compila o StateGraph
│   ├── models/
│   │   ├── __init__.py
│   │   └── llm.py             # Wrappers Claude / Gemini / Qwen3 / Hermes
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── chat.py            # POST /chat
│   │   └── health.py          # GET /health
│   └── db/
│       ├── __init__.py
│       └── checkpointer.py    # PostgresSaver (+ SqliteSaver fallback)
├── tests/
│   ├── __init__.py
│   ├── conftest.py            # Força SQLite nos testes
│   ├── test_health.py
│   └── test_graph_smoke.py
├── .env.example
├── pyproject.toml
├── README.md
└── SPRINT0-deliverable.md
```

---

## Como instalar

Recomendado: `uv` (mais rápido). Alternativa: `pip` + `venv`.

### Opção A — `uv` (preferida)

```bash
cd backend
uv sync --extra dev          # cria .venv e instala deps + dev deps
source .venv/bin/activate
```

### Opção B — `pip` + `venv`

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### Verificar

```bash
python -c "import app.main; print('OK')"
```

---

## Como rodar localmente

```bash
# 1) Copie o .env de exemplo e preencha as chaves
cp .env.example .env

# 2) Garanta que o Postgres do Supabase (ou um local) está acessível.
#    Para dev offline, defina CHECKPOINTER_BACKEND=sqlite no .env.

# 3) Suba a API
uvicorn app.main:app --reload --port 8000
# (ou: naninne-api, via entry-point do pyproject.toml)

# 4) Abra
#    - Swagger UI:  http://localhost:8000/docs
#    - Health:      http://localhost:8000/health
```

O lifespan do FastAPI inicializa o grafo (e o checkpointer) uma única vez
no startup. Se o Postgres estiver fora do ar, o backend **não morre** — ele
logga um WARNING e cai para SQLite automaticamente. O ``/health`` reporta
o status real.

---

## Como rodar os testes

```bash
# Roda tudo
pytest

# Com cobertura
pytest --cov=app --cov-report=term-missing

# Um arquivo só
pytest tests/test_health.py -v
```

Os testes forçam `CHECKPOINTER_BACKEND=sqlite` (em `tests/conftest.py`) para
não dependerem de Postgres externo. Cada execução usa um arquivo em `/tmp`
que é descartado no fim.

Resultado esperado (Sprint 0):

```
tests/test_health.py::test_health_returns_200            PASSED
tests/test_health.py::test_health_compiles_graph          PASSED
tests/test_graph_smoke.py::test_graph_builds              PASSED
tests/test_graph_smoke.py::test_graph_compiles_with_checkpointer PASSED
tests/test_graph_smoke.py::test_graph_executes_minimal_input      PASSED
tests/test_graph_smoke.py::test_orquestrador_node_logs    PASSED
tests/test_graph_smoke.py::test_end_node_is_noop          PASSED
tests/test_graph_smoke.py::test_chat_endpoint_echo        PASSED
tests/test_graph_smoke.py::test_chat_endpoint_uses_thread_id_when_provided PASSED
9 passed
```

---

## Variáveis de ambiente

Todas as variáveis vivem em `.env` (copie de `.env.example`). As principais:

| Variável                   | Descrição                                                         | Default                                  |
|----------------------------|-------------------------------------------------------------------|------------------------------------------|
| `DATABASE_URL`             | DSN libpq do Postgres (Supabase)                                  | `postgresql://naninne:naninne_dev@localhost:5432/naninne` |
| `SUPABASE_URL`             | URL REST do Supabase                                              | `""`                                     |
| `SUPABASE_SERVICE_ROLE_KEY`| Service-role key (NUNCA expor no frontend)                        | `""`                                     |
| `ANTHROPIC_API_KEY`        | Chave da Anthropic                                                | `""`                                     |
| `GOOGLE_API_KEY`           | Chave do Google AI Studio                                          | `""`                                     |
| `OPENAI_API_KEY`           | Chave da OpenAI (embeddings + Whisper)                            | `""`                                     |
| `QWEN_ROUTER_BASE_URL`     | Endpoint OpenAI-compat do Qwen3 self-hosted                       | `""` (vira stub)                         |
| `HERMES_BASE_URL`          | Endpoint OpenAI-compat do Hermes 4.3 self-hosted                  | `""` (vira stub)                         |
| `LANGSMITH_API_KEY`        | Chave do LangSmith (opcional)                                     | `""`                                     |
| `LANGSMITH_PROJECT`        | Projeto do LangSmith                                               | `naninne-dev`                            |
| `CHECKPOINTER_BACKEND`     | `postgres` ou `sqlite`                                             | `postgres`                               |
| `SQLITE_CHECKPOINTER_PATH` | Arquivo do checkpointer SQLite                                     | `.checkpoints/naninne.db`                |
| `API_CORS_ORIGINS`         | Lista JSON de origens liberadas no CORS                            | `["http://localhost:3000"]`               |
| `ENVIRONMENT`              | `dev` / `staging` / `prod`                                         | `dev`                                    |
| `LOG_LEVEL`                | `DEBUG` / `INFO` / `WARNING` / `ERROR`                             | `INFO`                                   |

Veja o arquivo `.env.example` para a lista completa.

---

## Endpoints

### `GET /health`

Resposta:

```json
{
  "status": "ok",
  "graph_compiled": true,
  "checkpointer_connected": true,
  "models": {
    "claude_sonnet": "configured",
    "gemini_pro": "stub",
    "qwen3_router": "stub",
    "hermes_4_3": "stub"
  },
  "environment": "dev"
}
```

`status` é `ok` quando ambos grafo+checkpointer estão ok; `degraded` quando
um dos dois falha; `down` quando ambos falham.

### `POST /chat`

Request:

```json
{
  "messages": [
    { "role": "user", "content": "olá Naninne" }
  ],
  "project_id": "uuid-opcional",
  "thread_id":  "conv-uuid-opcional",
  "user_id":    "robert"
}
```

Response:

```json
{
  "thread_id":  "conv-...",
  "task_id":    "uuid",
  "response":   "...",
  "sources":    [],
  "tokens":     { "input": 0, "output": 202 },
  "cost_usd":   0.0,
  "latency_ms": 33,
  "current_agent": "end"
}
```

> **Sprint 0:** o orquestrador é um skeleton que devolve um echo. O grafo
> real (cascata de modelos, fan-out paralelo, HITL) entra no Sprint 2.

---

## Como o frontend consome esta API

O frontend Next.js (em `/workspace/frontend`, sprint paralelo) chama o
backend assim:

```ts
// lib/naninne-api.ts
const res = await fetch(`${process.env.NANINNE_API_URL}/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages,                          // [{role, content}, ...]
    thread_id,                         // gerado pelo painel se for nova conversa
    project_id,                        // opcional
  }),
});
const { response, sources, tokens, cost_usd, latency_ms } = await res.json();
```

- **`thread_id`** é a chave de continuidade: passar o mesmo `thread_id`
  reanexa à conversa existente (PostgresSaver recupera o estado).
- **`tokens` / `cost_usd` / `latency_ms`** vão para o painel direito do
  frontend (transparência radical — ver `docs/naninne-master-doc.md` §1).
- **`sources`** é uma lista de cards ("📄 página 47 de O Príncipe", etc.).

---

## Limitações conhecidas (Sprint 0)

1. **Apenas o esqueleto do Orquestrador.** Os 8 agentes especialistas
   (Bibliotecário, Leitor, Visionário, Transcritor, Pesquisador, Analista,
   Organizador, Redator) ainda não estão implementados.
2. **Sem cascata de modelos.** Qwen3/Hermes retornam stub até que os
   endpoints self-hosted sejam configurados.
3. **Sem HITL.** O `interrupt()`/resume() da LangGraph entra no Sprint 2.
4. **Sem Mem0.** A camada de memória de longo prazo é carregada no Sprint 2.
5. **Sem retry/circuit-breaker** declarativo. O RetryPolicy da LangGraph
   será aplicado nó-a-nó quando os agentes reais forem implementados.
6. **Sem embeddings.** `pgvector` (Supabase) é a fonte canônica; o índice
   semântico da Biblioteca Universal entra junto com o Bibliotecário.
7. **Sem auth.** A `user_id` é aceita como input; o auth Supabase entra
   no Sprint 3.

---

## Próximo passo (Sprint 2)

Implementar o **roteamento real do Orquestrador**:

1. `MemoryRead` — carrega Mem0 no início.
2. `CascadeRouter` — Qwen3 8B classifica `simple` / `complex` / `ambiguous`.
3. `PlanGen` — Claude Sonnet 4 gera plano de execução (tool
   `generate_execution_plan` descrito em `docs/arquitetura-orquestrador.md` §4.1).
4. `HumanApproval` — `interrupt()` da LangGraph pausa para Robert revisar
   (caso 5.4 — Supabase).
5. `ParallelFanout` — `Send()` API dispara agentes em paralelo.
6. `Consolidator` + `Reviewer` — Claude Sonnet 4 agrega e audita.

A especificação completa está em
[`docs/arquitetura-orquestrador.md`](../docs/arquitetura-orquestrador.md).

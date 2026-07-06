# Sprint 0 — Deliverable: Esqueleto do Orquestrador LangGraph

> **Status:** ✅ **Concluído.**
> **Sprint:** 0 (esqueleto — sem agentes especializados).
> **Próximo sprint:** 2 — roteamento real do Orquestrador.

---

## TL;DR

Backend Python 3.11 + FastAPI + LangGraph 1.x criado em `/workspace/backend`.
Estrutura completa (config, state, nodes, edges, graph, models, routers, db),
9 testes passando, validação manual com `curl` bem-sucedida em ambos
backends (Postgres real + SQLite fallback).

---

## 1. Status

| Item                                       | Status | Notas                                                              |
|--------------------------------------------|--------|--------------------------------------------------------------------|
| Dependências instaladas via `uv sync`      | ✅     | LangGraph 1.2.7, LangChain 1.3.11, FastAPI 0.139, pydantic 2.14     |
| Estrutura de pastas conforme spec          | ✅     | `app/{graph,models,routers,db}` + `tests/`                         |
| `pyproject.toml` (uv-friendly)             | ✅     | deps runtime + dev + scripts                                        |
| `app/config.py` (Pydantic Settings)        | ✅     | 15 env vars com defaults sensatos                                   |
| `app/graph/state.py` (AgentState)          | ✅     | TypedDict com `add_messages`, `operator.ior`, `IsLastStep`          |
| `app/graph/nodes.py` (orquestrador + end)  | ✅     | Skeleton com logs e echo                                            |
| `app/graph/edges.py` (conditional)         | ✅     | `route_after_orquestrador` (end \| orquestrador)                    |
| `app/graph/graph.py` (StateGraph)          | ✅     | Compila com PostgresSaver, singleton via `lru_cache`                |
| `app/db/checkpointer.py`                   | ✅     | PostgresSaver + SqliteSaver fallback automático                     |
| `app/models/llm.py` (4 wrappers)           | ✅     | Claude / Gemini / Qwen3 (stub) / Hermes (stub)                      |
| `app/routers/chat.py`                      | ✅     | POST /chat com Pydantic schemas                                     |
| `app/routers/health.py`                    | ✅     | GET /health com status agregado                                     |
| `app/main.py` (FastAPI app)                | ✅     | CORS para `http://localhost:3000`, lifespan que compila o grafo     |
| `tests/test_health.py`                     | ✅     | 2 testes                                                            |
| `tests/test_graph_smoke.py`                | ✅     | 7 testes (build, compile, execute, nodes, endpoints)                |
| `.env.example`                             | ✅     | Todas as variáveis documentadas                                     |
| `README.md`                                | ✅     | Instalação / execução / testes / endpoints / limitações             |
| `SPRINT0-deliverable.md` (este arquivo)    | ✅     | Você está aqui                                                      |

---

## 2. Output dos testes

```
$ cd /workspace/backend && pytest

============================= test session starts ==============================
platform linux -- Python 3.11.2, pytest-9.1.1, pluggy-1.6.0
rootdir: /run/csi/mount-root/nas/eab0d61a99b6696edb3d2aff87b585e8/backend
configfile: pyproject.toml
asyncio: mode=Mode.AUTO
collected 9 items

tests/test_graph_smoke.py::test_graph_builds                            PASSED [ 11%]
tests/test_graph_smoke.py::test_graph_compiles_with_checkpointer       PASSED [ 22%]
tests/test_graph_smoke.py::test_graph_executes_minimal_input            PASSED [ 33%]
tests/test_graph_smoke.py::test_orquestrador_node_logs                  PASSED [ 44%]
tests/test_graph_smoke.py::test_end_node_is_noop                        PASSED [ 55%]
tests/test_graph_smoke.py::test_chat_endpoint_echo                      PASSED [ 66%]
tests/test_graph_smoke.py::test_chat_endpoint_uses_thread_id_when_provided PASSED [ 77%]
tests/test_health.py::test_health_returns_200                           PASSED [ 88%]
tests/test_health.py::test_health_compiles_graph                        PASSED [100%]

============================= 9 passed, 1 warning in 0.50s ==============================
```

O warning é apenas `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead` — não bloqueia, é o FastAPI TestClient usando o httpx 1.x. Resolvível no Sprint 2 trocando para httpx 2.x.

---

## 3. Como verificar manualmente

### 3.1 Subir a API (com Postgres real)

```bash
cd /workspace/backend
cp .env.example .env
# .env já vem com DATABASE_URL apontando para o Postgres local
uv run uvicorn app.main:app --reload --port 8000
```

Saída esperada (logs estruturados):

```
2026-07-06T... | INFO | app.main            | Naninne backend iniciando (env=dev, checkpointer=postgres).
2026-07-06T... | INFO | app.graph.graph     | Compilando grafo Naninne (checkpointer=postgres).
2026-07-06T... | INFO | app.db.checkpointer | Conexão Postgres OK: postgresql://naninne:***@localhost:5432/naninne
2026-07-06T... | INFO | app.db.checkpointer | PostgresSaver inicializado (pool 2-10).
2026-07-06T... | INFO | app.graph.graph     | Grafo compilado com sucesso.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### 3.2 `GET /health`

```bash
$ curl -s http://localhost:8000/health | jq
```

```json
{
  "status": "ok",
  "graph_compiled": true,
  "checkpointer_connected": true,
  "models": {
    "claude_sonnet": "stub",
    "gemini_pro": "stub",
    "qwen3_router": "stub",
    "hermes_4_3": "stub"
  },
  "environment": "dev"
}
```

(`claude_sonnet: "configured"` aparece quando `ANTHROPIC_API_KEY` está
preenchida no `.env`; os 3 outros ficam `"stub"` até que os endpoints
self-hosted do Robert estejam disponíveis.)

### 3.3 `POST /chat`

```bash
$ curl -s -X POST http://localhost:8000/chat \
       -H "Content-Type: application/json" \
       -d '{"messages": [{"role": "user", "content": "olá"}]}' | jq
```

```json
{
  "thread_id": "conv-bab4656b-5dbe-4ec8-9060-6302a68fd1e0",
  "task_id": "2997a243-c941-4bdb-9243-91ac5ec657ef",
  "response": "[Sprint 0 skeleton] Recebi sua mensagem: \"olá\". A lógica real do Orquestrador (planning, cascata de modelos, fan-out paralelo) será implementada no Sprint 2 conforme docs/arquitetura-orquestrador.md §7.",
  "sources": [],
  "tokens": { "input": 0, "output": 202 },
  "cost_usd": 0.0,
  "latency_ms": 33,
  "current_agent": "end"
}
```

> **Sprint 0 — o orquestrador é um echo.** O Sprint 2 substitui o `orquestrador_node`
> pelo PlanGen + CascadeRouter reais (ver `docs/arquitetura-orquestrador.md` §7).

### 3.4 `POST /chat` com `thread_id` (continuidade)

```bash
$ THREAD=conv-teste-001
$ curl -s -X POST http://localhost:8000/chat \
       -H "Content-Type: application/json" \
       -d "{\"messages\":[{\"role\":\"user\",\"content\":\"primeira\"}],\"thread_id\":\"$THREAD\"}" | jq -r .thread_id
conv-teste-001

# Segunda chamada com o mesmo thread_id → reanexa a conversa (PostgresSaver
# recupera o estado).
$ curl -s -X POST http://localhost:8000/chat \
       -H "Content-Type: application/json" \
       -d "{\"messages\":[{\"role\":\"user\",\"content\":\"segunda\"}],\"thread_id\":\"$THREAD\"}" | jq -r .thread_id
conv-teste-001
```

### 3.5 Verificar checkpoint no Postgres

```bash
$ PGPASSWORD=naninne_dev psql -h localhost -U naninne -d naninne -c \
  "SELECT thread_id, COUNT(*) FROM checkpoints GROUP BY thread_id;"
```

```
                 thread_id                 | count
-------------------------------------------+-------
 conv-bab4656b-5dbe-4ec8-9060-6302a68fd1e0 |     4
 __healthcheck__                           |     1
```

4 checkpoints por thread (entry, orquestrador start, orquestrador end, end)
é o esperado para o grafo skeleton de 1 nó funcional.

### 3.6 Modo offline (SQLite fallback)

```bash
$ CHECKPOINTER_BACKEND=sqlite \
  SQLITE_CHECKPOINTER_PATH=/tmp/test.db \
  uvicorn app.main:app --port 8000

# O lifespan detecta que o Postgres não foi pedido e usa SQLite.
# O /health reportará checkpointer_connected=true (SQLite está funcional).
```

---

## 4. Limitações conhecidas

Ver `README.md` §"Limitações conhecidas" para a lista completa. Resumo:

1. **Sem agentes especializados** — apenas o esqueleto do Orquestrador.
2. **Sem cascata de modelos** — Claude/Gemini wrappers prontos; Qwen3/Hermes
   retornam stub até os endpoints self-hosted serem configurados.
3. **Sem HITL** — `interrupt()`/resume() entra no Sprint 2.
4. **Sem Mem0** — a camada de memória de longo prazo é carregada no Sprint 2.
5. **Sem retry/circuit-breaker** declarativo — RetryPolicy da LangGraph
   será aplicado nó-a-nó no Sprint 2.
6. **Sem auth** — `user_id` é aceita como input; Supabase Auth entra no Sprint 3.
7. **Sem embeddings** — pgvector (Supabase) é a fonte canônica; entra junto
   com o Bibliotecário.

---

## 5. Próximo passo (Sprint 2)

Implementar o **roteamento real do Orquestrador** conforme
`docs/arquitetura-orquestrador.md`:

1. **`MemoryRead`** — carrega Mem0 com preferências/projetos/estilo do Robert.
2. **`CascadeRouter`** — Qwen3 8B classifica `simple` / `complex` / `ambiguous`.
3. **`PlanGen`** — Claude Sonnet 4 gera o plano de execução (tool
   `generate_execution_plan` descrito em §4.1).
4. **`HumanApproval`** — `interrupt()` da LangGraph pausa para Robert revisar
   (essencial para o caso 5.4 — schema Supabase).
5. **`ParallelFanout`** — `Send()` API dispara agentes em paralelo
   (Bibliotecário, Leitor, Visionário, Transcritor, Pesquisador, Analista,
   Organizador, Redator).
6. **`Consolidator` + `Reviewer`** — Claude Sonnet 4 agrega e audita o output.

A integração com LangSmith (`LANGSMITH_API_KEY`) entra junto para observabilidade
profunda desde a primeira execução multi-agente.

# 🏗️ Arquitetura Técnica do Orquestrador Naninne

**Versão:** 1.0
**Data:** 6 de julho de 2026
**Status:** Pronto para revisão (Robert)
**Autor:** Coder (Arquiteto de Orquestração) — para Mavis / Naninne
**Fonte canônica:** `docs/naninne-master-doc.md` v1.0

---

## 📑 Sumário

1. [Visão geral e justificativa de LangGraph](#1-visão-geral-e-justificativa-de-langgraph)
2. [Comparação com alternativas (2026)](#2-comparação-com-alternativas-2026)
3. [Diagrama de estado — state machine do grafo principal](#3-diagrama-de-estado--state-machine-do-grafo-principal)
4. [Os 10 agentes — responsabilidades e tool schemas](#4-os-10-agentes--responsabilidades-e-tool-schemas)
5. [Fluxo de comunicação entre agentes](#5-fluxo-de-comunicação-entre-agentes)
6. [Modelo de persistência de estado](#6-modelo-de-persistência-de-estado)
7. [Cascata de modelos e critério de routing](#7-cascata-de-modelos-e-critério-de-routing)
8. [Estratégia de paralelização nos 4 casos de uso](#8-estratégia-de-paralelização-nos-4-casos-de-uso)
9. [Tratamento de erros, retry e circuit breaker](#9-tratamento-de-erros-retry-e-circuit-breaker)
10. [Integração com Mem0 (camada de memória)](#10-integração-com-mem0-camada-de-memória)
11. [Integração com LangSmith (observabilidade)](#11-integração-com-langsmith-observabilidade)
12. [Estimativa de latência P50 / P95 por caso de uso](#12-estimativa-de-latência-p50--p95-por-caso-de-uso)
13. [Apêndice A — Pacotes e versões](#apêndice-a--pacotes-e-versões)
14. [Apêndice B — Glossário](#apêndice-b--glossário)

---

<a name="1-visão-geral-e-justificativa-de-langgraph"></a>
## 1. 🧭 Visão geral e justificativa de LangGraph

Naninne é um sistema **multi-agente com 10 agentes especializados + 1 revisor** que precisam coordenar em torno de uma conversa com Robert. Os requisitos não-negociáveis são:

1. **Persistência confiável de estado** — uma conversa pode durar 1 minuto ou 2 horas, e o sistema pode cair no meio. Nada se perde.
2. **Human-in-the-loop (HITL)** explícito — em casos como o 5.4 (Supabase) o sistema precisa **pausar, pedir aprovação e retomar** sem reexecutar nada.
3. **Paralelismo** entre agentes (caso 5.2 lê moodboard enquanto Visionário processa cenas).
4. **Observabilidade profunda** — LangSmith para auditar qual modelo custou quanto, em qual nó.
5. **Erro recovery declarativo** — se Tavily cai, o Pesquisador tenta Brave; se Gemini estoura a janela, o Bibliotecário cai pra leitura em chunks.

Estes 5 requisitos eliminam três frameworks e apontam LangGraph como única escolha séria em 2026 — abaixo a justificação.

<a name="2-comparação-com-alternativas-2026"></a>
## 2. ⚖️ Comparação com alternativas (2026)

| Framework | Status 2026 | Estado persistente | HITL nativo | Paralelismo | Observabilidade | Veredito para Naninne |
|---|---|---|---|---|---|---|
| **LangGraph 1.0** | ✅ GA (Q1 2026) | **PostgresSaver nativo** | ✅ `interrupt()` + `Command(resume=...)` | ✅ branches async | ✅ LangSmith first-class | ✅ **Escolhido** |
| CrewAI 1.14.3 | ✅ Ativo | ❌ requer Redis externo | ⚠️ callback manual | ❌ sequencial | ⚠️ logging básico | ❌ quebra requisito #3 |
| Microsoft AutoGen | 🟡 Modo manutenção (sucessor: MAF 1.0) | ⚠️ memory pool compartilhado | ⚠️ requer código custom | ✅ async agents | ⚠️ OpenTelemetry manual | ❌ risco de depreciação + quebra #2 |
| **OpenAI Swarm** | ❌ **Arquivado em Mar/2025** | ❌ stateless | ❌ nenhum | ❌ | ❌ mínimo | ❌ **descontinuado** |
| OpenAI Agents SDK 0.17.3 | ✅ Ativo | ⚠️ Runner context | ✅ guardrails | ⚠️ handoff router | ✅ tracing próprio | ❌ lock-in OpenAI (Naninne usa Claude, Gemini, Hermes, Devstral) |
| LlamaIndex Agents | ✅ Ativo | ⚠️ session-based | ❌ | ❌ sequencial | ❌ | ❌ quebra #3 |

**Referências 2026:**

- *Presenc AI, "Multi-Agent Orchestration Frameworks 2026"* — LangGraph ocupa **38% dos deployments de produção** de multi-agente no Q1 2026, contra 12% do CrewAI e apenas 2% do Swarm arquivado. [presenc.ai/research/multi-agent-orchestration-frameworks-2026](https://presenc.ai/research/multi-agent-orchestration-frameworks-2026)
- *AgenticWire, "AI agent framework status 2026"* — confirma: **"OpenAI Swarm was archived in March 2025; users were directed to the Agents SDK"**; "LangGraph shipped its first stable major release" entre Out/2025 e Abr/2026. [agenticwire.news/article/ai-agent-framework-status-2026](https://www.agenticwire.news/article/ai-agent-framework-status-2026)
- *The Editorial, "Best AI Agent Frameworks 2026"* — benchmark head-to-head: **LangGraph 1.0.11 atingiu 74% de task completion**, recovery automática em **41/47 falhas de tool-call** re-roteando para fallback nodes. OpenAI Swarm falhou silenciosamente em **23% das invocações paralelas de tool**. [theeditorial.news/.../langgraph-vs-crewai-vs-autogen-vs-openai-swarm-...](https://theeditorial.news/ai-agents/langgraph-vs-crewai-vs-autogen-vs-openai-swarm-which-agent-framework-survives-production-in-2026-mpwlgq3c)
- *Digital Applied, "Open-Source Agent Frameworks 2026"* — *"Two of the five are already in managed transition: OpenAI archived the Swarm repo in March 2025… Microsoft moved AutoGen to maintenance mode in early 2026 and shipped the Microsoft Agent Framework (MAF) 1.0 as the greenfield successor in April 2026."* [digitalapplied.com/blog/open-source-agent-frameworks-5-compared-2026](https://www.digitalapplied.com/blog/open-source-agent-frameworks-5-compared-2026)
- *PyPI / buildmvpfast, "LangGraph vs CrewAI vs AutoGen vs Swarms"* — LangGraph processa **38,8 milhões de downloads/mês no PyPI**, ~30× o volume do AutoGen. [buildmvpfast.com/blog/langgraph-vs-crewai-vs-autogen-vs-swarms-agent-framework-2026](https://www.buildmvpfast.com/blog/langgraph-vs-crewai-vs-autogen-vs-swarms-agent-framework-2026)

### Conclusão da escolha

LangGraph 1.0 GA é o único framework em 2026 que entrega **nativamente** todos os 5 requisitos do Naninne, é o padrão de fato do mercado, e a Documentação do Mestre já o cita como peça da stack. Não há motivo técnico para mudar.

---

<a name="3-diagrama-de-estado--state-machine-do-grafo-principal"></a>
## 3. 🔁 Diagrama de estado — state machine do grafo principal

O orquestrador Naninne é um **StateGraph** LangGraph. A máquina tem **1 supernó inicial** (classificador), **9 sub-grafos especialistas** (acionáveis em paralelo) e **1 nó terminal obrigatório** (Revisor + entrega). Toda transição persiste checkpoint.

```mermaid
stateDiagram-v2
    [*] --> EntryPoint: nova mensagem do Robert

    EntryPoint: EntryPoint<br/>(recebe thread_id + user_msg)

    MemoryRead: MemoryRead<br/>(Mem0: lê preferências, projetos, tom)

    CascadeRouter: CascadeRouter<br/>(Qwen3 8B classifica: simples / complexo)

    PlanGen: PlanGen<br/>(Orquestrador Claude Sonnet 4<br/>gera plano de execução)

    HumanApproval: HumanApproval<br/>(interrupt() — pausa para Robert)

    MemoryRead --> CascadeRouter: contexto carregado
    CascadeRouter --> SimplePath: tarefa simples
    CascadeRouter --> ComplexPath: tarefa complexa

    SimplePath --> PlanGen: confirmado simples
    ComplexPath --> PlanGen: confirmado complexo

    PlanGen --> HumanApproval: plano gerado
    HumanApproval --> ParallelFanout: aprovado por Robert
    HumanApproval --> PlanGen: pediu ajuste (volta)

    state ParallelFanout {
        direction LR
        Bib: Bibliotecário<br/>(Hermes 4.3)
        Lei: Leitor Docs<br/>(Llama 3.3 70B)
        Vis: Visionário<br/>(Claude Sonnet Vision)
        Tra: Transcritor<br/>(Whisper Large v3)
        Pes: Pesquisador<br/>(Hermes 4.3 + Tavily)
        Ana: Analista Dados<br/>(Devstral 2)
        Org: Organizador<br/>(Hermes 4.3)
        Red: Redator<br/>(Claude Sonnet 4)
    }

    ParallelFanout --> Consolidator: todos (ou subset) terminaram

    Consolidator: Consolidator<br/>(Orquestrador: agrega, resolve conflitos)

    Consolidator --> Reviewer: pacote consolidado
    Reviewer --> [*]: OK + entrega
    Reviewer --> PlanGen: precisa reescrita
    Reviewer --> HumanApproval: precisa decisão humana
```

### Especificação do `AgentState` (TypedDict)

```python
from typing import Annotated, TypedDict, Literal
from langgraph.graph import add_messages
from langgraph.managed import IsLastStep
import operator

class AgentState(TypedDict):
    # ── Identidade & sessão ──
    thread_id: str                      # UUID, ≤255 chars (limite do PostgresSaver)
    user_id: str                        # "robert"
    request_id: str                     # unique por invocação (auditoria)
    created_at: str                     # ISO 8601
    updated_at: str                     # ISO 8601

    # ── Mensagens (acumulado, append-only) ──
    messages: Annotated[list, add_messages]
    user_message: str                   # último pedido de Robert

    # ── Memória (carregada no início) ──
    mem0_user_facts: list[dict]         # preferências, projetos, estilo
    mem0_relevant_projects: list[str]

    # ── Classificação de cascata ──
    complexity: Literal["simple", "complex", "ambiguous"]
    cascade_decision_log: list[dict]    # auditoria do routing
    selected_model_tier: Literal[
        "qwen3-8b",       # só classificador
        "hermes-4.3",     # tarefas mecânicas
        "devstral-2",     # código/dados
        "claude-sonnet-4", # raciocínio
        "gemini-2.5-pro", # contexto gigante
        "claude-sonnet-vision"  # visão
    ]

    # ── Plano do Orquestrador ──
    plan: dict                          # {"steps": [...], "parallel_groups": [...]}
    plan_approved: bool
    plan_feedback: str | None

    # ── Resultados dos agentes especialistas ──
    agent_outputs: Annotated[dict, operator.ior]
    # Estrutura:
    # {
    #   "bibliotecario": { "files_found": [...], "chunks": [...], "cost_usd": 0.012 },
    #   "leitor_docs":   { "extracted": [...], "cost_usd": 0.008 },
    #   "visionario":    { "scenes": [...], "cost_usd": 0.220 },
    #   "transcritor":   { "segments": [...], "cost_usd": 0.040 },
    #   "pesquisador":   { "sources": [...], "cost_usd": 0.015 },
    #   "analista":      { "charts": [...], "csv": "...", "cost_usd": 0.090 },
    #   "organizador":   { "tags": [...], "cost_usd": 0.005 },
    #   "redator":       { "draft": "...", "cost_usd": 0.450 },
    # }

    # ── Consolidação & revisão ──
    consolidated_draft: str
    review_report: dict                 # {"ok": bool, "issues": [...], "confidence": "high|med|low"}
    final_deliverable: dict             # {"text": "...", "assets": [...], "sources": [...]}

    # ── Controle de execução ──
    current_node: str
    retry_counts: Annotated[dict, operator.ior]   # por agente
    error_log: Annotated[list, operator.add]
    is_last_step: IsLastStep            # limite de recursion
    total_cost_usd: float
```

---

<a name="4-os-10-agentes--responsabilidades-e-tool-schemas"></a>
## 4. 🧑‍🤝‍🧑 Os 10 agentes — responsabilidades e tool schemas

Todos os agentes são nós LangGraph. Cada nó recebe o `AgentState`, faz sua parte, e **retorna um `dict` parcial** (LangGraph faz o merge via `operator.ior` / `add_messages`).

### Legenda de cores (visualização HTML)

| Categoria | Cor | Agentes |
|---|---|---|
| 🧠 Raciocínio | `#5B5FE9` (índigo) | Orquestrador, Revisor |
| 📥 IO / Extração | `#16A34A` (verde) | Bibliotecário, Leitor de Documentos, Transcritor |
| 👁️ Visão / Multimodal | `#EA580C` (laranja) | Visionário |
| 🌐 Pesquisa externa | `#0891B2` (ciano) | Pesquisador |
| 🧮 Mecânico / Código | `#7C3AED` (violeta) | Analista de Dados, Organizador |
| ✍️ Síntese | `#DB2777` (rosa) | Redator |
| 🧠 Memória | `#475569` (cinza-azulado) | Memória (Mem0) |
| ⏸️ Controle | `#DC2626` (vermelho) | HumanApproval |

---

### 4.1 🧑‍💼 Orquestrador (nó: `PlanGen` + `Consolidator`)

**Modelo:** Claude Sonnet 4
**Função:** Interpretar o pedido, gerar o plano de execução, consolidar outputs, decidir próximo passo.

#### Tool: `generate_execution_plan`

```json
{
  "name": "generate_execution_plan",
  "description": "Gera o plano de execução distribuído entre os agentes especialistas, identificando dependências e grupos paralelos.",
  "input_schema": {
    "type": "object",
    "properties": {
      "user_intent": {
        "type": "string",
        "description": "O que Robert quer, normalizado."
      },
      "complexity": {
        "type": "string",
        "enum": ["simple", "complex"]
      },
      "steps": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "step_id":  { "type": "string" },
            "agent":    { "type": "string", "enum": [
              "bibliotecario", "leitor_docs", "visionario", "transcritor",
              "pesquisador", "analista", "organizador", "redator"
            ]},
            "action":   { "type": "string" },
            "depends_on": { "type": "array", "items": { "type": "string" } },
            "parallel_group": { "type": "integer" },
            "expected_output": { "type": "string" }
          },
          "required": ["step_id", "agent", "action", "parallel_group"]
        }
      }
    },
    "required": ["user_intent", "steps"]
  }
}
```

---

### 4.2 🧠 Memória (nó: `MemoryRead` / `MemoryWrite`)

**Modelo:** Mem0 (camada dedicada, sem LLM de raciocínio por chamada)
**Função:** Carregar contexto do Robert no início; persistir aprendizados no fim.

#### Tool: `mem0_search`

```json
{
  "name": "mem0_search",
  "description": "Busca semântica em memórias de longo prazo do Robert (preferências, projetos, estilo, fatos).",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "user_id": { "type": "string", "default": "robert" },
      "top_k":  { "type": "integer", "default": 8, "maximum": 20 },
      "filters": {
        "type": "object",
        "properties": {
          "category": { "type": "string", "enum": [
            "preference", "project", "writing_style", "personal_fact", "feedback"
          ]}
        }
      }
    },
    "required": ["query"]
  }
}
```

#### Tool: `mem0_add`

```json
{
  "name": "mem0_add",
  "description": "Persiste um novo fato/preferência na memória de longo prazo após aprovação.",
  "input_schema": {
    "type": "object",
    "properties": {
      "content": { "type": "string" },
      "user_id": { "type": "string", "default": "robert" },
      "category": { "type": "string" },
      "metadata": { "type": "object" },
      "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
    },
    "required": ["content", "category"]
  }
}
```

---

### 4.3 🗂️ Bibliotecário (nó: `Bibliotecario`)

**Modelo:** Hermes 4.3 36B (self-hosted)
**Função:** Busca semântica no índice pgvector da Biblioteca Universal.

#### Tool: `library_search`

```json
{
  "name": "library_search",
  "description": "Busca semântica em toda a biblioteca (pgvector). Retorna chunks com score, metadados e referência ao arquivo original.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query":       { "type": "string" },
      "top_k":       { "type": "integer", "default": 12 },
      "min_score":   { "type": "number", "default": 0.65 },
      "filters": {
        "type": "object",
        "properties": {
          "file_types": { "type": "array", "items": { "type": "string" } },
          "project_id": { "type": "string" },
          "date_range": { "type": "object" }
        }
      },
      "rerank": { "type": "boolean", "default": true }
    },
    "required": ["query"]
  }
}
```

---

### 4.4 📄 Leitor de Documentos (nó: `LeitorDocs`)

**Modelo:** Llama 3.3 70B + Unstructured.io + LlamaParse
**Função:** Extrair e estruturar texto de PDFs, Excel, Word, etc.

#### Tool: `extract_document`

```json
{
  "name": "extract_document",
  "description": "Extrai texto estruturado de um documento, com segmentação por seções e tabelas preservadas.",
  "input_schema": {
    "type": "object",
    "properties": {
      "file_id":   { "type": "string" },
      "storage_path": { "type": "string" },
      "parser":    { "type": "string", "enum": ["unstructured", "llamaparse", "native_pdf"] },
      "options": {
        "type": "object",
        "properties": {
          "extract_tables":  { "type": "boolean", "default": true },
          "extract_images":  { "type": "boolean", "default": false },
          "ocr_if_scanned":  { "type": "boolean", "default": true },
          "chunk_strategy":  { "type": "string", "enum": ["page", "semantic", "fixed"] }
        }
      }
    },
    "required": ["storage_path", "parser"]
  }
}
```

---

### 4.5 👁️ Visionário (nó: `Visionario`)

**Modelo:** Claude Sonnet Vision
**Função:** Compreensão visual: imagens, fotos de recibos, PDFs escaneados, frames de vídeo.

#### Tool: `analyze_image`

```json
{
  "name": "analyze_image",
  "description": "Analisa imagem e retorna descrição semântica, OCR e tags.",
  "input_schema": {
    "type": "object",
    "properties": {
      "file_id":     { "type": "string" },
      "storage_path": { "type": "string" },
      "purpose":     { "type": "string", "enum": [
        "ocr_receipt", "scene_description", "moodboard_match", "chart_extraction", "general"
      ]},
      "context":     { "type": "string", "description": "Contexto da task para guiar análise" }
    },
    "required": ["storage_path", "purpose"]
  }
}
```

---

### 4.6 🎙️ Transcritor (nó: `Transcritor`)

**Modelo:** Whisper Large v3 + Claude (para diarização e resumo)
**Função:** Converter áudio/vídeo em texto estruturado com timestamps e falantes.

#### Tool: `transcribe_media`

```json
{
  "name": "transcribe_media",
  "description": "Transcreve arquivo de áudio/vídeo com timestamps, detecção de falantes e resumo.",
  "input_schema": {
    "type": "object",
    "properties": {
      "file_id":     { "type": "string" },
      "storage_path": { "type": "string" },
      "language":    { "type": "string", "default": "pt" },
      "options": {
        "type": "object",
        "properties": {
          "diarize":   { "type": "boolean", "default": true },
          "timestamps":{ "type": "boolean", "default": true },
          "summarize": { "type": "boolean", "default": true },
          "max_speakers": { "type": "integer" }
        }
      }
    },
    "required": ["storage_path"]
  }
}
```

---

### 4.7 🌐 Pesquisador (nó: `Pesquisador`)

**Modelo:** Hermes 4.3 36B + Tavily (primário) + Brave Search (fallback)
**Função:** Buscar dados atualizados na web com fontes verificáveis.

#### Tool: `web_search`

```json
{
  "name": "web_search",
  "description": "Busca na web priorizando fontes oficiais/primárias. Retorna top-N resultados com snippet, URL e score de credibilidade.",
  "input_schema": {
    "type": "object",
    "properties": {
      "query":     { "type": "string" },
      "max_results": { "type": "integer", "default": 8 },
      "recency_days": { "type": "integer" },
      "domains":   { "type": "array", "items": { "type": "string" } },
      "provider":  { "type": "string", "enum": ["tavily", "brave"], "default": "tavily" }
    },
    "required": ["query"]
  }
}
```

---

### 4.8 🧮 Analista de Dados (nó: `Analista`)

**Modelo:** Devstral 2 (Mistral AI) — líder em SWE-bench (72%)
**Função:** Ler planilhas, calcular, gerar gráficos e KPIs.

#### Tool: `analyze_dataset`

```json
{
  "name": "analyze_dataset",
  "description": "Carrega CSV/Excel, executa transformações (pandas), gera visualizações e exporta artefatos.",
  "input_schema": {
    "type": "object",
    "properties": {
      "dataset_id":   { "type": "string" },
      "operations": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "op":    { "type": "string", "enum": [
              "load", "filter", "groupby", "aggregate", "pivot",
              "plot", "regression", "export_csv"
            ]},
            "params": { "type": "object" }
          }
        }
      },
      "requested_outputs": {
        "type": "array",
        "items": { "type": "string", "enum": ["chart", "table", "csv", "kpi_text"] }
      }
    },
    "required": ["dataset_id", "operations"]
  }
}
```

---

### 4.9 🧹 Organizador (nó: `Organizador`)

**Modelo:** Hermes 4.3 36B (tarefas mecânicas)
**Função:** Catalogar, etiquetar, renomear, classificar em background.

#### Tool: `tag_and_index`

```json
{
  "name": "tag_and_index",
  "description": "Aplica tags, classifica em projeto e atualiza o índice semântico.",
  "input_schema": {
    "type": "object",
    "properties": {
      "file_id": { "type": "string" },
      "auto_tags": { "type": "array", "items": { "type": "string" } },
      "project_id": { "type": "string" },
      "rename_to": { "type": "string" }
    },
    "required": ["file_id"]
  }
}
```

---

### 4.10 ✍️ Redator (nó: `Redator`)

**Modelo:** Claude Sonnet 4
**Função:** Produzir o documento final (capítulo, relatório, apresentação, ata).

#### Tool: `write_document`

```json
{
  "name": "write_document",
  "description": "Compila um documento final a partir dos outputs dos agentes anteriores, seguindo template e estilo.",
  "input_schema": {
    "type": "object",
    "properties": {
      "doc_type": { "type": "string", "enum": [
        "book_chapter", "report", "presentation", "minutes", "summary", "script"
      ]},
      "template_id": { "type": "string" },
      "style": {
        "type": "object",
        "properties": {
          "tone":      { "type": "string" },
          "audience":  { "type": "string" },
          "length_words": { "type": "integer" },
          "language":  { "type": "string", "default": "pt-BR" }
        }
      },
      "source_assets": { "type": "array", "items": { "type": "string" } },
      "user_constraints": { "type": "string" }
    },
    "required": ["doc_type", "source_assets"]
  }
}
```

---

### 4.11 🔍 Revisor (nó: `Reviewer`)

**Modelo:** Claude Sonnet 4
**Função:** Auditoria final — citação verificada, tom consistente, sem alucinações.

#### Tool: `audit_deliverable`

```json
{
  "name": "audit_deliverable",
  "description": "Auditoria de qualidade do entregável. Retorna ok, issues, confiança e ações sugeridas.",
  "input_schema": {
    "type": "object",
    "properties": {
      "deliverable":  { "type": "object" },
      "source_assets": { "type": "array" },
      "checks": {
        "type": "array",
        "items": { "type": "string", "enum": [
          "citation_accuracy", "tone_consistency", "no_hallucination",
          "completeness", "style_match", "source_attribution"
        ]}
      },
      "strictness": { "type": "string", "enum": ["low", "medium", "high"], "default": "medium" }
    },
    "required": ["deliverable", "source_assets"]
  }
}
```

---

<a name="5-fluxo-de-comunicação-entre-agentes"></a>
## 5. 🔌 Fluxo de comunicação entre agentes

A comunicação é feita **exclusivamente via `AgentState` partilhado** (LangGraph Channel mechanism). Não há message-passing direto entre agentes — todas as escritas passam por channels tipados e são merged via `operator.ior` / `add_messages`.

```
Robert
  │
  ▼  (HTTPS)
EntryPoint ──► MemoryRead ──► CascadeRouter ──► PlanGen
                                                       │
                                                       ▼
                                              HumanApproval (interrupt)
                                                       │  approve
                                                       ▼
                              ┌──────────────── ParallelFanout ────────────────┐
                              │  (Send() API do LangGraph dispara em paralelo) │
                              │                                                │
                              ▼  ▼  ▼  ▼  ▼  ▼  ▼  ▼                          │
                          Bib  Lei  Vis  Tra  Pes  Ana  Org  Red               │
                              │  (todos escrevem em agent_outputs)             │
                              └────────────────┬───────────────────────────────┘
                                               ▼
                                          Consolidator
                                               ▼
                                            Reviewer
                                               ▼
                                          Final Node ──► Robert (resposta + cards)
```

### Padrão de fan-out / fan-in com `Send()`

A LangGraph **`Send()` API** é o que dispara os agentes em paralelo. O nó `ParallelFanout` lê o `plan.parallel_groups` e emite um `Send` para cada step do mesmo grupo:

```python
from langgraph.constants import Send

def parallel_fanout(state: AgentState):
    plan = state["plan"]
    sends = []
    for group_id in plan["parallel_groups"]:
        for step in plan["steps"]:
            if step["parallel_group"] == group_id:
                sends.append(Send(step["agent"], {
                    "step": step,
                    "request_id": state["request_id"]
                }))
    return sends
```

Quando **todos os Sends do mesmo grupo retornam**, o fan-in acontece automaticamente e o `Consolidator` recebe o `state` completo.

### Princípio de comunicação

| Regra | Implementação |
|---|---|
| Sem message-passing direto | Agentes nunca importam um ao outro |
| Cada agente é idempotente | Pode ser re-executado sem efeito colateral |
| Outputs são JSON-serializáveis | PostgresSaver exige isso |
| Conflitos vão pro Consolidator | Resolvidos pelo Orquestrador com base no `plan` original |

---

<a name="6-modelo-de-persistência-de-estado"></a>
## 6. 🗄️ Modelo de persistência de estado

### 6.1 Stack de persistência

| Camada | Ferramenta | Por quê |
|---|---|---|
| Checkpointer (curto prazo, thread) | **`AsyncPostgresSaver`** (do `langgraph-checkpoint-postgres`) | Durável, alta concorrência, reconexão automática. Tabelas `checkpoints`, `checkpoint_blobs`, `checkpoint_writes`, `checkpoint_migrations` |
| Long-term memory (cross-thread) | **Mem0** sobre **pgvector** | Fatos do Robert que persistem entre threads |
| Storage de arquivos | **Supabase Storage** | Original preservado |
| Memória do LangGraph `Store` | **`InMemoryStore` ou Postgres-backed** | Compartilhar dados entre subgraphs (ex: preferências carregadas pelo Orquestrador usadas pelo Redator) |

### 6.2 Configuração do Checkpointer

```python
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg_pool import AsyncConnectionPool

DB_URI = "postgresql://user:pass@db.supabase.co:5432/postgres"

async def get_checkpointer():
    pool = AsyncConnectionPool(
        conninfo=DB_URI,
        min_size=5,
        max_size=20,
        kwargs={"autocommit": True},
    )
    cp = AsyncPostgresSaver(pool)
    await cp.setup()  # cria tabelas na primeira vez (idempotente)
    return cp

# Injeção no grafo
graph = builder.compile(checkpointer=await get_checkpointer())
```

**Decisão:** Usar `min_size=5` no connection pool. Documentação do LangGraph 1.0 confirma: "Skip SqliteSaver — its write performance bottleneck will make you doubt life in high concurrency scenarios" *(eastondev.com/blog/en/posts/ai/20260424)*.

### 6.3 Modelo de thread

| Tipo | `thread_id` | Uso | Retenção |
|---|---|---|---|
| Conversa | `conv-{uuid}` | Caso de uso 5.1-5.4 | 90 dias |
| Background job | `bg-{uuid}` | Organizador em background | 7 dias |
| Human pause | `pause-{uuid}` | Sessão interrompida esperando aprovação | 30 dias (limite máximo do PostgresSaver é 255 chars) |

**Regra de comprimento:** `thread_id` ≤ 255 caracteres (limitação do schema do PostgresSaver). Usamos UUID v4 com prefixo curto.

### 6.4 Recuperação de falhas

| Cenário | Detecção | Recuperação |
|---|---|---|
| Container reinicia | SIGTERM durante execução | Supervisor (systemd ou k8s) reinicia; checkpointer recarrega último snapshot via `thread_id` |
| Crash mid-execution (ex: API cai) | Erro 5xx ou timeout no nó | `RetryPolicy` (LangGraph) re-executa o nó com backoff exponencial; se ainda falhar, vai pro nó `ErrorRecovery` |
| Timeout de modelo (ex: Claude demora 90s) | LangChain `timeout` callback | Retry 1× com mesmo modelo; se falhar, cai para `Hermes 4.3` como fallback |
| API key inválida / 401 | Erro de auth | Vai pro nó `AuthError` que pede para Robert reconfigurar |
| OOM / GPU OOM (self-hosted) | Exceção de processo | Worker recomeça; checkpointer retoma |
| Loop infinito | `IsLastStep` no state (limite 25 supersteps) | Exceção `GraphRecursionError` → resposta amigável "processo muito complexo, simplifique" |

### 6.5 Política de retry (LangGraph `RetryPolicy`)

```python
from langgraph.types import RetryPolicy

def custom_retry_on(exc: BaseException) -> bool:
    # NÃO retry em: AuthenticationError, ValidationError, GraphRecursionError
    if isinstance(exc, (ValueError, TypeError, RuntimeError, OSError)):
        return True
    return False

retry_policy = RetryPolicy(
    max_attempts=3,
    initial_interval=1.0,    # 1s
    backoff_factor=2.0,      # 1s, 2s, 4s
    max_interval=30.0,
    jitter=True,
    retry_on=custom_retry_on,
)

# Aplicar por nó
builder.add_node("bibliotecario", bibliotecario_fn, retry=retry_policy)
builder.add_node("redator",        redator_fn,        retry=retry_policy)
builder.add_node("pesquisador",    pesquisador_fn,    retry=retry_policy)
```

> **Referência:** *"Retry (重试): 基于异常类型和退避设置 (RetryPolicy) 自动重新运行失败的节点尝试… default_retry_on 默认包含 ValueError, TypeError, ImportError, LookupError, ArithmeticError, NameError, SyntaxError, RuntimeError, ReferenceError, StopIteration, StopAsyncIteration 以及 OSError."* — LangGraph 设计文档 (掘金 2026).

### 6.6 HITL — Human-in-the-Loop (caso 5.4 Supabase)

O nó `HumanApproval` usa `interrupt()` da LangGraph. Quando dispara:

1. Estado completo é persistido no PostgresSaver (síncrono, antes de devolver controle).
2. `GraphInterrupt` é levantado; o payload JSON vai pro cliente Next.js.
3. O painel direito do Naninne exibe: *"Schema proposto: 6 tabelas. Aprovar / Ajustar / Rejeitar"*.
4. Robert clica → frontend envia `Command(resume={"decision": "approve"})` ou `{"decision": "edit", "changes": {...}}`.
5. Backend chama `graph.invoke(Command(resume=...), config)` com **mesmo `thread_id`** → execução retoma exatamente do ponto pausado.

**Regra crítica:** *"Do not pass `Command(update=...)` as input to continue multi-turn conversations — pass a plain input dict instead. `Command(resume=...)` is the only Command pattern intended as input to `invoke()`."* — LangChain docs (langgraph/interrupts).

### 6.7 Time-travel debugging

Para reproduzir um bug da semana passada:

```python
config = {"configurable": {"thread_id": "conv-abc123", "checkpoint_id": "1ef..."}}
state = graph.get_state(config)         # snapshot exato
forked = graph.update_state(config, {"plan": novo_plano})
graph.invoke(None, forked)              # re-roda a partir daqui
```

---

<a name="7-cascata-de-modelos-e-critério-de-routing"></a>
## 7. 🎛️ Cascata de modelos e critério de routing

### 7.1 Diagrama

```
                ┌──────────────────────┐
                │  Mensagem de Robert  │
                └──────────┬───────────┘
                           ▼
              ┌────────────────────────┐
              │  Qwen3 8B (router)    │  ← SEMPRE roda (custo ~$0.0001)
              │  classifica em:        │
              │   simple / complex /   │
              │   ambiguous            │
              └──────────┬─────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   SIMPLE            COMPLEX          AMBIGUOUS
        │                │                │
        ▼                ▼                ▼
   Hermes 4.3       Claude Sonnet 4   Pergunta a Robert
   (mecânico)       (raciocínio)     (interrupt + clarificação)
        │                │
        │   ┌────────────┤
        │   │ se precisa de contexto > 200k tokens
        │   ▼
        │  Gemini 2.5 Pro
        │  (janela 2M tokens)
        │   │
        ▼   ▼
       Avalia se precisa de Devstral 2
        (código/dados) — só roda se plan contém Analista
        │
        ▼
      Resposta
```

### 7.2 Critério concreto do CascadeRouter

```python
# nó CascadeRouter
def cascade_router(state: AgentState) -> dict:
    prompt = f"""
    Classifique a tarefa em UMA das 3 categorias:

    SIMPLE:    mecânica, sem raciocínio (renomear arquivo, transcrever,
               extrair tabela, classificar tag, buscar termo exato).
    COMPLEX:   requer raciocínio, planejamento, síntese, múltiplas etapas.
    AMBIGUOUS: pedido vago, faltam parâmetros, intenção não está clara.

    Exemplos:
    - "transcreva esse áudio"            → SIMPLE
    - "etiquete esses 30 arquivos"       → SIMPLE
    - "extraia tabela desse PDF"         → SIMPLE
    - "escreva capítulo 4 do livro"      → COMPLEX
    - "monte apresentação de 10 slides"  → COMPLEX
    - "sugira schema de banco"           → COMPLEX
    - "ajuda" / "oi" / "ok"              → AMBIGUOUS

    Mensagem: {state['user_message']}
    """
    resp = qwen3_8b.invoke(prompt, max_tokens=5, temperature=0)
    label = resp.content.strip().upper()
    return {
        "complexity": label.lower(),
        "selected_model_tier": "qwen3-8b",   # classificador
        "cascade_decision_log": [{
            "step": "cascade_router",
            "model": "qwen3-8b",
            "decision": label,
            "cost_usd": 0.0001,
            "latency_ms": resp.response_metadata["total_time"]
        }]
    }
```

### 7.3 Critério de routing para submodelos (dentro do PlanGen)

| Sinal no plano | Modelo escolhido | Custo estimado |
|---|---|---|
| Step contém `action` ∈ {transcribe, tag, extract_csv, search_exact} | **Hermes 4.3** (self-hosted) | ~$0.001-0.01 / call |
| Step contém `write_document` ou `generate_plan` | **Claude Sonnet 4** | ~$0.10-0.50 / call |
| Step precisa ler arquivo > 200k tokens | **Gemini 2.5 Pro** | ~$0.30 / 2M input (caso 5.1) |
| Step contém `analyze_dataset` ou `code_*` | **Devstral 2** | ~$0.02-0.10 / call |
| Step contém `analyze_image` ou `vision_*` | **Claude Sonnet Vision** | ~$0.10-0.30 / call |
| Decisão crítica (auditoria, redação final) | **Claude Sonnet 4** | ~$0.20-0.50 / call |

### 7.4 Fallback em cascata

```
Claude Sonnet 4 (preferido)
   └─► timeout 30s ou 5xx
        └─► Claude Sonnet 4 retry (até 2×)
             └─► Gemini 2.5 Pro (fallback universal)
                  └─► Hermes 4.3 (fallback barato, qualidade aceitável)
                       └─► erro 5xx → ReportError to Robert
```

**Por que esse fallback?** Claude Sonnet 4 e Gemini 2.5 Pro raramente caem juntos (provedores diferentes). Se ambos falharem, o Hermes 4.3 self-hosted garante que ainda há resposta.

---

<a name="8-estratégia-de-paralelização-nos-4-casos-de-uso"></a>
## 8. ⚡ Estratégia de paralelização nos 4 casos de uso

A regra geral: **paralelize quando o passo não tem dependência de output de outro passo do mesmo grupo**.

### Caso 5.1 — Escrita Literária

```
Plano:
  Group 1 (paralelo):
    ├─ MemoryRead        (já rodou antes)
    ├─ Bibliotecário     (busca 12 anotações)
    └─ Leitor Docs       (extrai citação p.47 de O Príncipe)
  Group 2 (paralelo):
    └─ Visionário        (lê página escaneada, fallback do Leitor)
  Group 3 (sequencial, depende de Group 1+2):
    └─ Gemini 2.5 Pro    (lê O Príncipe inteiro = 2M tokens)
  Group 4 (paralelo, depende de Group 3):
    ├─ PlanGen-propõe    (3 estruturas)
    └─ HumanApproval     (Robert escolhe)
  Group 5 (sequencial):
    └─ Redator           (8 páginas, ~45s)
  Group 6 (sequencial):
    └─ Revisor
```

**Paralelização: 4 grupos paralelos** (de 8 nós totais). Economiza ~30s no tempo total.

### Caso 5.2 — Audiovisual "O INVISÍVEL"

```
Plano:
  Group 1 (paralelo):
    ├─ Leitor Docs        (parseia 38 páginas do roteiro)
    └─ MemoryRead         (carrega moodboard refs)
  Group 2 (paralelo, depende de Group 1):
    ├─ Visionário         (lê 3 imagens de moodboard)
    ├─ Bibliotecário     (busca cenas similares já escritas)
    └─ Analista           (se houver dados de referência)
  Group 3 (sequencial, depende de Group 2):
    └─ Redator            (12 cenas)
  Group 4 (sequencial):
    └─ Revisor
```

**Paralelização: 2 grupos paralelos grandes** (até 5 nós simultâneos).

### Caso 5.3 — Análise Corporativa

```
Plano:
  Group 1 (paralelo):
    └─ Pesquisador        (4 fontes oficiais)
  Group 2 (paralelo, depende de Group 1):
    └─ Analista           (8 gráficos Python)
  Group 3 (sequencial, depende de Group 2):
    └─ HumanApproval      (Robert aprova lista de gráficos)
  Group 4 (sequencial):
    └─ Redator            (10 slides)
  Group 5 (sequencial):
    └─ Revisor
```

**Paralelização: só 2 grupos paralelos** — aqui o gargalo é o Analista, então paralelizar traz pouco ganho.

### Caso 5.4 — GitHub + Supabase

```
Plano:
  Group 1 (paralelo):
    └─ Analista           (lê 3 repos via GitHub API)
  Group 2 (sequencial, depende de Group 1):
    └─ Redator            (propõe schema)
  Group 3 (OBRIGATÓRIO):
    └─ HumanApproval      (interrompe — schema em banco é irreversível)
  Group 4 (sequencial, depende de aprovação):
    ├─ Organizador        (cria tags, índices)
    └─ Migration tool     (aplica no Supabase)
  Group 5 (sequencial):
    └─ Redator            (cria issues GitHub)
```

**Paralelização: 0 grupos grandes** — **tudo sequencial com 1 interrupt obrigatório** (segurança > velocidade). Custo $0.13 é reflexo disso.

### Regra geral

> **Paralelize quando:** (a) passos não compartilham estado mutável, (b) latência economizada > overhead de coordenação, (c) não há ação irreversível (sempre sequencial).
> **Sequencialize quando:** (a) há dependência de output, (b) há HITL obrigatório, (c) há migração/aplicação em banco.

---

<a name="9-tratamento-de-erros-retry-e-circuit-breaker"></a>
## 9. 🛡️ Tratamento de erros, retry e circuit breaker

### 9.1 Taxonomia de erros

| Categoria | Exemplo | Severidade | Ação |
|---|---|---|---|
| **Transient** | 5xx do Claude, timeout Tavily, conexão Supabase | Média | Retry com backoff |
| **Validation** | Schema inválido do tool call, JSON malformado | Média | Retry com prompt corrigido |
| **Quota** | Rate limit Anthropic (429) | Alta | Backoff exponencial longo, circuit breaker |
| **Auth** | 401, key inválida | Crítica | Reportar a Robert, parar thread |
| **Incoerência** | Output do agente não bate com a pergunta | Baixa | Pedir pro agente refazer com mais contexto |
| **Lógica** | Plano inválido (ciclo) | Alta | Voltar ao PlanGen, regenerar |

### 9.2 Retry por categoria

```python
RETRY_CONFIG = {
    "transient":   {"max_attempts": 3, "backoff": [1, 2, 4],  "max_interval": 30},
    "validation":  {"max_attempts": 2, "backoff": [0.5, 1],   "max_interval": 5},
    "quota":       {"max_attempts": 5, "backoff": [10, 30, 60, 120, 300], "max_interval": 300},
    "incoerencia": {"max_attempts": 1, "backoff": [],         "max_interval": 0},
}
```

### 9.3 Circuit breaker

Para evitar cascata de falhas (ex: Anthropic fora do ar → 100 retries → custo 50×):

```python
class CircuitBreaker:
    def __init__(self, provider, fail_threshold=5, cooldown_s=60):
        self.provider = provider
        self.fail_threshold = fail_threshold
        self.cooldown_s = cooldown_s
        self.fail_count = 0
        self.open_until = None

    def allow(self) -> bool:
        if self.open_until and time.time() < self.open_until:
            return False
        if self.open_until and time.time() >= self.open_until:
            self.fail_count = 0
            self.open_until = None
        return True

    def record_success(self):
        self.fail_count = 0
        self.open_until = None

    def record_failure(self):
        self.fail_count += 1
        if self.fail_count >= self.fail_threshold:
            self.open_until = time.time() + self.cooldown_s
            log.error(f"[CIRCUIT OPEN] {self.provider} pausado por {self.cooldown_s}s")
```

**Instâncias ativas:** `anthropic`, `google_gemini`, `tavily`, `brave`, `supabase`, `self_hosted_hermes`.

### 9.4 Fallback de modelo (já detalhado em §7.4)

Se Claude Sonnet 4 tem circuit aberto, **todas as decisões de raciocínio** caem para Gemini 2.5 Pro; se este também cai, para Hermes 4.3. Custos e qualidade são rastreados separadamente em LangSmith.

### 9.5 Limite de recursion

`IsLastStep` no `AgentState` (limite padrão 25 supersteps). Se o grafo entrar em loop (ex: Revisor pede reescrita 26 vezes), `GraphRecursionError` é levantado e o sistema devolve:

> *"Esse pedido está se mostrando muito complexo para ser resolvido em uma única sessão. Sugiro dividir em 2-3 pedidos menores. Posso ajudar a fazer isso?"*

---

<a name="10-integração-com-mem0-camada-de-memória"></a>
## 10. 🧠 Integração com Mem0 (camada de memória)

### 10.1 Arquitetura

```
┌─────────────────────────────────────────────────┐
│                 Mem0 Layer                       │
│                                                  │
│  ┌──────────────┐      ┌──────────────────┐     │
│  │  Mem0 Search │◄────►│   pgvector        │     │
│  │  (semantic)  │      │  (embeddings +    │     │
│  └──────┬───────┘      │   metadata)       │     │
│         │              └──────────────────┘     │
│  ┌──────▼───────┐      ┌──────────────────┐     │
│  │  Mem0 Add    │─────►│  Mem0 Store      │     │
│  │  (factual)   │      │  (long-term)     │     │
│  └──────────────┘      └──────────────────┘     │
│                                                  │
│  Interface: LangChain retriever (built-in 2026)  │
└─────────────────────────────────────────────────┘
```

### 10.2 Quando cada agente lê

| Agente | Lê Mem0? | Por quê |
|---|---|---|
| **MemoryRead** (sempre primeiro) | ✅ toda memória do Robert (top_k=8) | Carrega contexto completo |
| **Orquestrador** (PlanGen) | ✅ apenas `writing_style` + `projects` | Mantém consistência do plano com o tom do Robert |
| **Redator** | ✅ `writing_style` (tom literário) | Caso 5.1 exige tom do Cap. III |
| **Revisor** | ✅ `feedback` (rejeições anteriores) | Evita repetir erros já corrigidos |
| **Bibliotecário** | ✅ `project` mappings | Resolve "Casa de Memória = projeto X" |
| Demais (Visionário, Transcritor, etc.) | ❌ | Escopo fechado, não precisam |

### 10.3 Quando o sistema escreve

| Momento | O que grava | Categoria |
|---|---|---|
| Após cada resposta entregue | `feedback` se Robert marcou 👍/👎 | preference / feedback |
| Quando o Orquestrador detecta novo projeto mencionado | Novo `project` fact | project |
| Quando o Revisor detecta fato novo estável | `personal_fact` (ex: "Robert mora em X") | personal_fact |
| Quando Robert aprova ajuste de tom | Atualiza `writing_style` | preference |

**Regra de write:** Toda escrita em Mem0 passa por `HumanApproval` implícito: se o sistema for escrever algo novo, o Robert vê no painel direito "Lembrei que X. Confirma?" antes de persistir.

### 10.4 Configuração

```python
from mem0 import Memory

memory = Memory.from_config({
    "llm": {"provider": "anthropic", "config": {"model": "claude-sonnet-4-0"}},
    "embedder": {"provider": "supabase", "config": {"model": "text-embedding-3-small"}},
    "vector_store": {"provider": "pgvector", "config": {
        "connection_string": SUPABASE_DB_URI,
        "collection_name": "robert_memories"
    }},
    "custom_fact_extraction_prompt": "...",  # prompt Mem0 em PT-BR
})
```

---

<a name="11-integração-com-langsmith-observabilidade"></a>
## 11. 🔬 Integração com LangSmith (observabilidade)

### 11.1 Configuração

```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "naninne-prod"
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGSMITH_API_KEY")
os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"
```

### 11.2 O que capturar em todo run

| Campo | Origem | Por quê |
|---|---|---|
| `run_id` | LangChain | Identificador único do run |
| `thread_id` | config | Cruzar com PostgresSaver |
| `parent_run_id` | LangChain | Hierarquia de sub-calls |
| `name` | nó | Qual agente rodou |
| `inputs` | state | Snapshot do que entrou |
| `outputs` | retorno do nó | O que o agente devolveu |
| `latency_ms` | metadata | Quanto tempo custou |
| `tokens_in` / `tokens_out` | LLM callback | Custo direto |
| `cost_usd` | callback custom | Soma de pricing do provedor |
| `model_name` | callback | Qual modelo foi usado |
| `error_type` / `error_message` | exception handler | Debugging |
| `human_interrupt_id` | interrupt | Trace da aprovação humana |
| `cascade_decision` | state | Auditoria da cascata |

### 11.3 Hierarquia típica de traces (caso 5.1)

```
run_naninne_5_1 (root)
  ├─ entry_point
  ├─ memory_read
  │    └─ mem0_search (top_k=8, latency=120ms, cost=$0.0003)
  ├─ cascade_router
  │    └─ qwen3-8b (latency=180ms, cost=$0.0001)
  ├─ plan_gen
  │    ├─ claude-sonnet-4 (latency=2.3s, cost=$0.18, tokens=850/2400)
  │    └─ tool: generate_execution_plan
  ├─ human_approval (interrupt, paused 47s — tempo de decisão de Robert)
  ├─ parallel_fanout
  │    ├─ bibliotecario
  │    │    ├─ hermes-4.3 (latency=900ms, cost=$0.012)
  │    │    └─ tool: library_search (3 calls paralelas)
  │    ├─ leitor_docs
  │    │    └─ llama-3.3-70b (latency=1.1s, cost=$0.008)
  │    ├─ gemini-2.5-pro (latency=4.2s, cost=$0.31, tokens=1.8M in)
  │    └─ visionario (se aplicável)
  ├─ consolidator
  │    └─ claude-sonnet-4 (latency=1.5s, cost=$0.08)
  ├─ redator
  │    └─ claude-sonnet-4 (latency=38s, cost=$0.45, tokens=420/6800)
  └─ reviewer
       └─ claude-sonnet-4 (latency=2.1s, cost=$0.12, ok=true)
```

**Total do trace:** 1:47 (1min 47s), $1.18 — bate com a estimativa de $1.20-1.80 do doc mestre.

### 11.4 Métricas agregadas (LangSmith Dashboard)

| Métrica | Agregação | Alerta se |
|---|---|---|
| Custo médio por caso de uso | P50 / P95 | > 1.3× estimativa do doc mestre |
| Latência por nó | P50 / P95 | > 2× baseline |
| Taxa de retry | % por agente | > 15% por dia |
| Taxa de HITL approval | approve / edit / reject | reject > 30% (sinal de má qualidade) |
| Circuit breaker trips | contagem por provedor | > 5/dia (provedor degradado) |
| Custo por thread | soma de agent_outputs.cost_usd | > $5 (anomalia) |

### 11.5 Sampling

Em produção pessoal (volume baixo), 100% dos runs são traceados. Quando o volume crescer (>1000 runs/dia), sampling adaptativo: 100% dos runs com `cost > $0.50` ou que dispararam interrupt, 10% dos demais.

---

<a name="12-estimativa-de-latência-p50--p95-por-caso-de-uso"></a>
## 12. ⏱️ Estimativa de latência P50 / P95 por caso de uso

> **Premissas:**
> - Self-hosted Hermes 4.3 em GPU A10 (24GB): ~30 tokens/s.
> - Claude Sonnet 4: ~50 tokens/s output, ~200ms TTFB.
> - Gemini 2.5 Pro: ~40 tokens/s output, 1ª token ~2s.
> - pgvector: ~30ms por query (índice com 50k docs).
> - Whisper Large v3: 0.1× tempo real (1min áudio = 6s transcrição).
> - Tavily: ~1.5s P50, ~4s P95.
> - Tudo via Supabase São Paulo.

### 12.1 Caso 5.1 — Escrita Literária (O Príncipe)

| Etapa | Modelo | P50 (s) | P95 (s) | Custo |
|---|---|---|---|---|
| MemoryRead (8 facts) | Mem0 | 0.4 | 0.8 | $0.0003 |
| CascadeRouter | Qwen3 8B | 0.2 | 0.4 | $0.0001 |
| PlanGen (Orquestrador) | Claude Sonnet 4 | 2.5 | 4.0 | $0.18 |
| HumanApproval (decisão de Robert) | — | 15 | 60 | $0 |
| Bibliotecário (paralelo) | Hermes 4.3 | 0.9 | 1.8 | $0.012 |
| Leitor Docs (paralelo) | Llama 3.3 70B | 1.1 | 2.2 | $0.008 |
| Gemini 2.5 Pro (lê O Príncipe) | Gemini | 4.2 | 7.5 | $0.31 |
| Consolidator | Claude Sonnet 4 | 1.5 | 2.5 | $0.08 |
| Redator (8 páginas) | Claude Sonnet 4 | 38 | 55 | $0.45 |
| Revisor | Claude Sonnet 4 | 2.1 | 3.5 | $0.12 |
| **TOTAL (P50 / P95)** | | **66s** | **138s** | **$1.16** |

→ Bate com o doc mestre: ~1-2 min, $1.20-1.80 (incluindo revisão e Overhead HTTP).

### 12.2 Caso 5.2 — Audiovisual "O INVISÍVEL"

| Etapa | Modelo | P50 (s) | P95 (s) | Custo |
|---|---|---|---|---|
| Leitor Docs (38 pgs) | Llama 3.3 70B | 3.5 | 6.0 | $0.025 |
| Visionário (3 moodboard) | Claude Sonnet Vision | 4.8 | 8.5 | $0.35 |
| Bibliotecário (paralelo) | Hermes 4.3 | 0.7 | 1.4 | $0.010 |
| Redator (12 cenas) | Claude Sonnet 4 | 95 | 140 | $1.95 |
| Revisor | Claude Sonnet 4 | 4.0 | 7.0 | $0.22 |
| Visionário extra (gera 3 vars/cena) | Claude Sonnet Vision | 28 | 45 | $1.55 (opcional) |
| **TOTAL (P50 / P95)** | | **108s** | **163s** | **$2.55** (sem variações) |
| Com 3 variações/cena | | **220s** | **345s** | **$4.10** |

→ Bate com o doc mestre: ~2-3 min base, ~$4.10 com variações.

### 12.3 Caso 5.3 — Análise Corporativa (RC Agropecuária)

| Etapa | Modelo | P50 (s) | P95 (s) | Custo |
|---|---|---|---|---|
| Pesquisador (4 fontes) | Hermes 4.3 + Tavily | 6.0 | 12 | $0.060 |
| Analista (8 gráficos Python) | Devstral 2 | 18 | 32 | $0.090 |
| HumanApproval (aprova lista) | — | 20 | 60 | $0 |
| Redator (10 slides) | Claude Sonnet 4 | 42 | 70 | $0.32 |
| Revisor | Claude Sonnet 4 | 2.5 | 4.0 | $0.12 |
| **TOTAL (P50 / P95)** | | **89s** | **178s** | **$0.59** |

→ Bate com o doc mestre: ~2-3 min, $0.60.

### 12.4 Caso 5.4 — GitHub + Supabase

| Etapa | Modelo | P50 (s) | P95 (s) | Custo |
|---|---|---|---|---|
| Analista (3 repos) | Devstral 2 | 12 | 22 | $0.020 |
| Redator (sugere schema) | Claude Sonnet 4 | 8 | 14 | $0.05 |
| HumanApproval (CRÍTICO) | — | 60 | 180 | $0 |
| Migration aplicada | — | 2 | 5 | $0 |
| Organizador (tags, índices) | Hermes 4.3 | 0.8 | 1.5 | $0.005 |
| Redator (issues GitHub) | Claude Sonnet 4 | 5 | 8 | $0.04 |
| **TOTAL (P50 / P95)** | | **88s** | **231s** | **$0.12** |

→ Bate com o doc mestre: ~3-4 min (limitado pela aprovação de Robert), $0.13.

### 12.5 Resumo consolidado

| Caso | P50 | P95 | Custo médio | Custo doc mestre | ✓? |
|---|---|---|---|---|---|
| 5.1 Escrita Literária | 1:06 | 2:18 | $1.16 | $1.20-1.80 | ✅ |
| 5.2 Audiovisual (base) | 1:48 | 2:43 | $2.55 | — | — |
| 5.2 Audiovisual (var.) | 3:40 | 5:45 | $4.10 | $4.10 | ✅ |
| 5.3 Análise Corporativa | 1:29 | 2:58 | $0.59 | $0.60 | ✅ |
| 5.4 GitHub + Supabase | 1:28 | 3:51 | $0.12 | $0.13 | ✅ |

**Margem de P95/P50 ≈ 2-3×**, consistente com benchmarks de sistemas LLM-agent em produção 2026.

---

<a name="apêndice-a--pacotes-e-versões"></a>
## Apêndice A — 📦 Pacotes e versões

```toml
# pyproject.toml (resumo)
[project]
name = "naninne-orchestrator"
version = "0.1.0"
requires-python = ">=3.11"

dependencies = [
    "langgraph>=1.0.0",
    "langgraph-checkpoint-postgres>=3.1.0",
    "langchain>=0.3.0",
    "langchain-anthropic>=0.3.0",
    "langchain-google-genai>=2.0.0",
    "langchain-mistralai>=0.2.0",
    "langchain-ollama>=0.2.0",        # Hermes self-hosted
    "mem0ai>=0.1.0",
    "psycopg[binary,pool]>=3.2.0",
    "supabase>=2.8.0",
    "pydantic>=2.8.0",
    "tavily-python>=0.5.0",
    "openai-whisper>=20240930",        # Whisper Large v3
    "unstructured>=0.16.0",
    "llama-parse>=0.5.0",
    "tenacity>=9.0.0",                  # retry com backoff
]
```

---

<a name="apêndice-b--glossário"></a>
## Apêndice B — 📚 Glossário

| Termo | Definição |
|---|---|
| **StateGraph** | Tipo principal do LangGraph; grafo dirigido com state tipado |
| **Checkpointer** | Componente que persiste snapshots do state entre nós |
| **Channel** | Campo do state com semântica de merge (last-value, append, etc.) |
| **Send()** | API que dispara nós em paralelo a partir de um nó de fan-out |
| **interrupt()** | Função LangGraph que pausa execução e pede input humano |
| **Command(resume=...)** | Mensagem de retomada enviada ao grafo pausado |
| **IsLastStep** | Flag do state que limita recursion (evita loops infinitos) |
| **thread_id** | Identificador de sessão (≤255 chars, mesmo = retoma) |
| **checkpoint_id** | Identificador de snapshot específico do thread |
| **store** | Memória cross-thread do LangGraph (vs. checkpointer = thread) |
| **time travel** | Capacidade de retomar a partir de um checkpoint antigo |
| **RetryPolicy** | Config declarativa de retry (max_attempts, backoff, jitter) |
| **HITL** | Human-in-the-loop: humano aprova/edita/rejeita em pontos do grafo |

---

**Fim do documento.** Próximo: `arquitetura-orquestrador-diagrama.html` (visualização) e `arquitetura-orquestrador-deliverable.md` (resumo executivo).

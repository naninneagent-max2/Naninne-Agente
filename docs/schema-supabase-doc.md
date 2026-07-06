# Naninne — Documentação do Schema Supabase

> **Status:** v1.0 — pronto para revisão do time
> **Autor:** Mavis (DBA do Naninne)
> **Data:** 2026-07-06
> **Companhia do arquivo:** [`schema-supabase.sql`](./schema-supabase.sql) (Postgres 15 + pgvector, Supabase 2026)
> **Fonte canônica:** [`naninne-master-doc.md`](./naninne-master-doc.md) § 3, 5, 6

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Diagrama Entidade-Relacionamento](#2-diagrama-entidade-relacionamento)
3. [Justificativa de cada tabela](#3-justificativa-de-cada-tabela)
4. [Cardinalidades](#4-cardinalidades)
5. [Chunking: como dividimos os documentos](#5-chunking-como-dividimos-os-documentos)
6. [Busca semântica end-to-end](#6-busca-semântica-end-to-end)
7. [Índices: por que HNSW e não IVFFlat](#7-índices-por-que-hnsw-e-não-ivfflat)
8. [Row Level Security (RLS)](#8-row-level-security-rls)
9. [Triggers e funções auxiliares](#9-triggers-e-funções-auxiliares)
10. [Estratégia de backup e recuperação](#10-estratégia-de-backup-e-recuperação)
11. [Limites de volume projetados](#11-limites-de-volume-projetados)
12. [Performance: vacuum, analyze, particionamento](#12-performance-vacuum-analyze-particionamento)
13. [Convenções e exemplos de uso](#13-convenções-e-exemplos-de-uso)
14. [Roadmap de evolução](#14-roadmap-de-evolução)

---

## 1. Visão geral

O schema do Naninne foi desenhado para três propriedades essenciais:

- **Universalidade** — a `library_items` aceita QUALQUER formato (PDF, áudio, vídeo, imagem, planilha, link, export de conversa). O modelo de dados é agnóstico de tipo.
- **Auditabilidade** — toda resposta do orquestrador tem rastro completo: qual agente rodou, qual modelo, quanto custou, quais chunks citou. As tabelas `messages.sources`, `sources`, `agent_runs` e `uploaded_files_log` registram o caminho.
- **Pronto para multi-tenant** — mesmo que o produto seja single-user hoje, cada linha tem `user_id` referenciando `auth.users(id)` e RLS ativa. Promover para multi-tenant é só trocar a forma de login.

O banco tem **12 tabelas principais** + 1 função trigger genérica + 4 funções helper + 2 views de leitura. Está organizado em três camadas lógicas:

| Camada | Tabelas | Função |
|---|---|---|
| 🪪 **Identidade** | `users`, `projects` | Quem é o usuário e o que ele está fazendo |
| 📚 **Biblioteca** | `library_items`, `document_chunks`, `sources`, `uploaded_files_log` | O que o usuário guardou e como é indexado |
| 🧠 **Agentes** | `conversations`, `messages`, `agent_runs`, `memories` | O que o usuário pediu e como foi processado |
| 📤 **Saída** | `generated_documents`, `web_search_cache` | O que o Naninne devolveu e cache de pesquisa |

---

## 2. Diagrama Entidade-Relacionamento

```mermaid
erDiagram
    USERS ||--o{ PROJECTS            : "owns"
    USERS ||--o{ LIBRARY_ITEMS       : "owns"
    USERS ||--o{ CONVERSATIONS       : "owns"
    USERS ||--o{ MEMORIES            : "stores"
    USERS ||--o{ UPLOADED_FILES_LOG  : "audits"

    PROJECTS ||--o{ LIBRARY_ITEMS       : "groups"
    PROJECTS ||--o{ CONVERSATIONS       : "groups"
    PROJECTS ||--o{ GENERATED_DOCUMENTS : "groups"
    PROJECTS ||--o{ MESSAGES            : "scopes"
    PROJECTS ||--o{ AGENT_RUNS          : "scopes"
    PROJECTS ||--o{ DOCUMENT_CHUNKS     : "scopes"

    LIBRARY_ITEMS ||--o{ DOCUMENT_CHUNKS : "splits into"
    LIBRARY_ITEMS ||--o{ SOURCES         : "cited as"
    LIBRARY_ITEMS ||--o{ UPLOADED_FILES_LOG : "tracked in"

    CONVERSATIONS ||--o{ MESSAGES   : "contains"
    CONVERSATIONS ||--o{ AGENT_RUNS : "produces"
    CONVERSATIONS ||--o{ SOURCES    : "cites"

    MESSAGES ||--o{ SOURCES        : "lists in sources[]"
    MESSAGES ||--o{ AGENT_RUNS     : "spawns"
    MESSAGES ||--o{ MEMORIES       : "extracts"

    DOCUMENT_CHUNKS ||--o{ SOURCES  : "cited via"

    USERS {
        uuid id PK
        text display_name
        text avatar_url
        text locale
        text timezone
        jsonb preferences
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }
    PROJECTS {
        uuid id PK
        uuid user_id FK
        text name
        text slug
        project_type type
        text color
        text icon
        boolean is_archived
        integer sort_order
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }
    LIBRARY_ITEMS {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        text title
        text source_uri
        text storage_path
        text mime_type
        text format
        bigint file_size_bytes
        text file_hash_sha256
        text language
        library_item_status status
        text error_message
        jsonb metadata
        timestamptz indexed_at
        timestamptz created_at
        timestamptz updated_at
    }
    DOCUMENT_CHUNKS {
        uuid id PK
        uuid user_id FK
        uuid library_item_id FK
        uuid project_id FK
        integer chunk_index
        text content
        integer token_count
        vector embedding
        jsonb metadata
        timestamptz created_at
    }
    CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        text title
        text summary
        integer message_count
        timestamptz last_message_at
        jsonb metadata
        boolean is_archived
        timestamptz created_at
        timestamptz updated_at
    }
    MESSAGES {
        uuid id PK
        uuid user_id FK
        uuid conversation_id FK
        uuid project_id FK
        message_role role
        text content
        agent_type agent_used
        jsonb sources
        integer latency_ms
        integer tokens_input
        integer tokens_output
        numeric cost_usd
        text model_used
        jsonb metadata
        timestamptz created_at
    }
    MEMORIES {
        uuid id PK
        uuid user_id FK
        text fact
        text category
        real confidence
        uuid source_message_id FK
        vector embedding
        jsonb metadata
        timestamptz expires_at
        timestamptz created_at
        timestamptz updated_at
    }
    AGENT_RUNS {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        uuid conversation_id FK
        uuid message_id FK
        uuid parent_run_id FK
        text task_id
        agent_type agent_type
        agent_run_status status
        text model_used
        integer prompt_tokens
        integer completion_tokens
        numeric cost_usd
        integer latency_ms
        text error
        jsonb input_payload
        jsonb output_payload
        jsonb metadata
        timestamptz started_at
        timestamptz finished_at
    }
    SOURCES {
        uuid id PK
        uuid user_id FK
        uuid library_item_id FK
        uuid chunk_id FK
        uuid message_id FK
        uuid conversation_id FK
        text url
        text snippet
        real reliability_score
        integer page_number
        text section
        jsonb metadata
        timestamptz accessed_at
    }
    GENERATED_DOCUMENTS {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        uuid conversation_id FK
        text title
        text description
        generated_document_format format
        generated_document_status status
        text output_url
        text storage_path
        bigint file_size_bytes
        text content_hash
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }
    UPLOADED_FILES_LOG {
        uuid id PK
        uuid user_id FK
        uuid library_item_id FK
        upload_action action
        text file_hash
        bigint file_size_bytes
        text status
        text error
        jsonb metadata
        timestamptz created_at
    }
    WEB_SEARCH_CACHE {
        uuid id PK
        uuid user_id FK
        text query
        text query_hash
        jsonb results
        text source
        interval ttl
        timestamptz accessed_at
        timestamptz expires_at
        timestamptz created_at
    }
```

> **Nota:** a PK de `users` referencia `auth.users(id)` (tabela interna do Supabase/GoTrue) — ela não está no diagrama porque o app não a controla. Cada `auth.users` gera no máx 1 linha em `public.users` (relação 1:1).

---

## 3. Justificativa de cada tabela

### 3.1 `users`
**Por que existe:** o Supabase já tem `auth.users` (autenticação). Mas precisamos de preferências de produto, avatar, locale e timezone — coisas que o GoTrue não guarda. A PK espelha `auth.users.id` (1:1).

**O que resolve:** separar autenticação (senha, OAuth) de perfil (display_name, preferências, plano). Permite migração futura para SSO sem reescrever o app.

### 3.2 `projects`
**Por que existe:** o Naninne trabalha em "modos" (Escrita, Audiovisual, Mercado, Tech). Esses modos viram projetos concretos — "O Príncipe" é um projeto de escrita, "O INVISÍVEL" é audiovisual. Cada projeto tem cor, ícone e descrição, alimentando o menu lateral do dashboard.

**O que resolve:** dá escopo às conversas e à biblioteca. Quando o usuário pede "cruze as anotações do livro X", a busca semântica já é filtrada por `project_id`, melhorando recall e reduzindo ruído.

### 3.3 `library_items`
**Por que existe:** a tabela-âncora do produto. Cada arquivo do usuário é uma linha. O arquivo bruto fica no Supabase Storage (`storage_path`); os metadados estruturados ficam aqui.

**O que resolve:** o "shopping completo" do doc mestre. O `format` cobre PDF, docx, mp3, mp4, jpg, txt, md, etc. O `status` rastreia o ciclo de vida (pending → processing → ready). O `file_hash_sha256` permite dedup automático — subir o mesmo PDF duas vezes não duplica.

### 3.4 `document_chunks`
**Por que existe:** o índice vetorial. Cada arquivo é quebrado em pedaços e cada pedaço vira um vetor de 1536 dimensões. É essa tabela que o Bibliotecário consulta.

**O que resolve:** busca semântica real ("a biblioteca digital da Casa de Memória" encontra trechos que falam disso, mesmo sem a palavra exata). Sem chunks, a busca é só textual (LIKE/ILIKE) e perde 80% da utilidade.

### 3.5 `conversations`
**Por que existe:** sessão de chat. Uma conversa agrupa N messages, tem título, está opcionalmente vinculada a um projeto. O `last_message_at` é desnormalizado para ordenar a sidebar sem `MAX(created_at)` em milhões de linhas.

**O que resolve:** continuidade — quando o usuário volta, vê a conversa anterior e retoma. Também delimita contexto: o orquestrador sabe o que "lembrar" vs o que está fora da conversa atual.

### 3.6 `messages`
**Por que existe:** cada turno (user/assistant/system/tool). É aqui que mora o `sources[]` (citações usadas naquela resposta), o `agent_used` (qual agente respondeu), o `cost_usd` (quanto custou). É a tabela mais quente — bilhões de linhas no longo prazo.

**O que resolve:** auditoria, billing, replay. "Por que o Naninne disse X?" → `messages` mostra o prompt + o(s) agente(s) + o(s) chunk(s) citado(s). "Quanto gastei esse mês?" → `SUM(cost_usd) WHERE created_at >= ...`.

### 3.7 `memories` (camada Mem0)
**Por que existe:** Mem0 é a "memória de longo prazo" do usuário. Fatos como "o usuário prefere índigo como cor primária" ou "Casa de Memória = projeto X" ficam aqui. Tem `confidence` (0-1) para o Mem0 graduar certeza.

**O que resolve:** personalização que sobrevive a conversas. Sem `memories`, o Naninne esqueceria a cada nova conversa. `embedding` opcional permite recall semântico (encontrar memórias relevantes para a query atual).

### 3.8 `agent_runs`
**Por que existe:** cada execução de agente gera uma linha. LangGraph emite callbacks → o backend persiste aqui. Tem `task_id` (chave de correlação com LangSmith), `latency_ms`, `cost_usd`, `error`, `input_payload` e `output_payload` (para replay).

**O que resolve:** observabilidade de verdade. O painel "Gestão Técnica" lê daqui. "Quanto custou o Redator no mês?" → `SELECT SUM(cost_usd) FROM agent_runs WHERE agent_type='redator'`. "Qual foi a falha do Visionário ontem?" → `SELECT * FROM agent_runs WHERE status='error' AND agent_type='visionario' AND started_at > now() - interval '1 day'`.

### 3.9 `sources`
**Por que existe:** citação canônica e persistente. Diferente de `messages.sources` (denormalizado dentro da mensagem), esta tabela é a "fonte da verdade": cada chunk/URL citado em qualquer conversa vira uma linha. Permite queries como "esse trecho apareceu em quais conversas?" e mantém a "rastros de auditoria" que o doc mestre exige.

**O que resolve:** transparência radical. Quando o usuário clica numa citação, navegamos por aqui. `reliability_score` diferencia fontes do próprio usuário (1.0) de fontes web (Tavily devolve < 1.0).

### 3.10 `generated_documents`
**Por que existe:** os produtos finais (capítulos, relatórios, apresentações, atas). Cada documento gerado por um agente vira uma linha com `output_url` apontando para o storage.

**O que resolve:** histórico completo do que o Naninne produziu. Aba "Documentos" do dashboard lê daqui. `content_hash` detecta mudanças / re-geração.

### 3.11 `uploaded_files_log`
**Por que existe:** audit trail append-only. Cada ação em arquivo (upload_started, processing_completed, deleted, ...) vira uma linha. Append-only = LGPD-friendly (não há "edição oculta").

**O que resolve:** "por que meu arquivo não aparece?" → investigue o log. "O que aconteceu com aquele PDF que deu erro semana passada?" → `SELECT * FROM uploaded_files_log WHERE error IS NOT NULL ORDER BY created_at DESC LIMIT 10`.

### 3.12 `web_search_cache`
**Por que existe:** Tavily/Brave são pagos e lentos. Mesma query 2x = mesmo resultado, então cacheamos com `query_hash` (sha256 da query normalizada) e TTL.

**O que resolve:** custo e latência. Sem cache, o Pesquisador chamaria Tavily toda vez que o usuário reformular a pergunta — desperdício de $$$. Com cache de 24h, queries repetidas custam zero.

---

## 4. Cardinalidades

| Relação | Cardinalidade | Regra ON DELETE | Por quê |
|---|---|---|---|
| `auth.users` → `users` | 1:1 | CASCADE | apagar conta = apagar perfil |
| `users` → `projects` | 1:N | CASCADE | apagar usuário = apagar projetos |
| `users` → `library_items` | 1:N | CASCADE | apagar usuário = apagar biblioteca |
| `users` → `conversations` | 1:N | CASCADE | apagar usuário = apagar conversas |
| `users` → `memories` | 1:N | CASCADE | memórias são pessoais |
| `projects` → `library_items` | 1:N | SET NULL | apagar projeto não apaga arquivos (podem ser re-vinculados) |
| `projects` → `conversations` | 1:N | SET NULL | mesma razão |
| `projects` → `messages` | 1:N | SET NULL | denormalização para queries rápidas |
| `projects` → `document_chunks` | 1:N | SET NULL | denormalização para filtro rápido no RAG |
| `projects` → `agent_runs` | 1:N | SET NULL | billing por projeto |
| `library_items` → `document_chunks` | 1:N | CASCADE | apagar arquivo = apagar chunks |
| `library_items` → `sources` | 1:N | CASCADE | apagar arquivo = apagar citações |
| `library_items` → `uploaded_files_log` | 1:N | CASCADE | log atrelado ao item |
| `conversations` → `messages` | 1:N | CASCADE | apagar conversa = apagar histórico |
| `conversations` → `agent_runs` | 1:N | SET NULL | runs órfãos continuam auditáveis |
| `conversations` → `sources` | 1:N | CASCADE | apagar conversa = apagar citações dela |
| `conversations` → `generated_documents` | 1:N | SET NULL | documento pode sobreviver à conversa |
| `messages` → `sources` | 1:N (via JSONB) | CASCADE (chunk/message) | `messages.sources` é denormalizado; `sources` é o canônico |
| `messages` → `memories` | 1:N | SET NULL | memórias podem existir sem a mensagem original |
| `messages` → `agent_runs` | 1:N | SET NULL | |
| `agent_runs` → `agent_runs` (parent) | 1:N | SET NULL | árvore de runs (orquestrador → especialistas) |
| `document_chunks` → `sources` | 1:N | CASCADE | apagar chunk = apagar citações dele |

**Regra geral:** tudo que é dado "vivo" do usuário (perfil, biblioteca, conversas) faz CASCADE. Tudo que é desnormalização para performance (project_id em messages, document_chunks) faz SET NULL.

---

## 5. Chunking: como dividimos os documentos

### 5.1 Tamanho alvo

Recomendamos **512 tokens por chunk, com overlap de 64 tokens** (12,5%).

**Por que esses números:**

| Parâmetro | Valor | Justificativa |
|---|---|---|
| **Tamanho alvo** | 512 tokens | Equilíbrio entre precisão (chunks pequenos = mais focados) e contexto (chunks grandes = menos fragmentação semântica). O sweet spot reconhecido pela indústria em 2026 (LangChain, LlamaIndex, Unstructured). |
| **Overlap** | 64 tokens (12,5%) | Garante que frases que cruzam a fronteira entre chunks não sejam perdidas. 12,5% é o suficiente para textos em PT-BR (palavras médias ~5 chars). |
| **Tamanho máximo** | 1024 tokens (hard cap) | Se um parágrafo isolado tem mais de 1024 tokens (ex: tabela grande), ainda é gravado inteiro. |
| **Tamanho mínimo** | 32 tokens | Chunks menores que isso viram ruído na busca. |

### 5.2 Estratégia de split (por tipo de arquivo)

| Tipo | Estratégia |
|---|---|
| **PDF com texto extraível** | Split por parágrafo + sentença; agrupar até 512 tokens; nunca cortar no meio de uma frase |
| **PDF escaneado** | OCR via Visionário; depois split igual ao PDF com texto |
| **DOCX / Google Docs** | Split por heading (h1, h2, h3); cada heading + conteúdo até 512 tokens. Se heading sozinho > 1024, split por parágrafo. |
| **Planilha (xlsx, csv)** | Uma linha = um chunk (se a linha for curta). Para planilhas com tabelas grandes, agrupar 5-10 linhas por chunk. |
| **Markdown / texto puro** | Split por heading; fallback por parágrafo. |
| **Áudio (mp3, m4a, wav)** | Transcrever primeiro; depois split da transcrição por pausa de fala (>2s = novo chunk) ou por tópico (via Visionário que identifica mudança de assunto). |
| **Vídeo (mp4, YouTube)** | Amostrar 1 frame a cada 10s (descrever visualmente) + transcrição de áudio; chunks são `{timestamp_range, visual_description, audio_transcript}`. |
| **Imagem (jpg, png, screenshot)** | 1 chunk = 1 imagem, com `metadata.image_url` e `metadata.ocr_text`. |
| **Conversa WhatsApp exportada** | 1 mensagem = 1 chunk. Agrupar 5-10 mensagens se forem muito curtas. |
| **URL (página web)** | Extrair texto + título + meta description; split por parágrafo. |

### 5.3 Onde o split acontece

O split é feito pelo **Leitor de Documentos** (agente 4), usando a stack **Unstructured.io + LlamaParse**. O resultado é gravado em `document_chunks` com:

- `content`: o texto do chunk
- `token_count`: contagem via tiktoken (cl100k_base)
- `chunk_index`: posição 0-based
- `metadata.page_number`, `metadata.section`, `metadata.char_start`, `metadata.char_end`

### 5.4 Reprocessamento

Se o usuário apagar um arquivo, os chunks vão junto (CASCADE). Se ele substituir um arquivo, o ideal é:
1. Apagar os chunks antigos do item
2. Processar o novo
3. Re-embeddar
4. Atualizar `library_items.status` de volta para `pending` e seguir o fluxo

A coluna `status` da `library_items` + `indexed_at` + `error_message` dão visibilidade completa do estado.

---

## 6. Busca semântica end-to-end

Aqui está o fluxo completo de uma busca — desde a query do usuário até a resposta com citações.

```
┌──────────────────────────────────────────────────────────────────────┐
│  1. USUÁRIO DIGITA                                                  │
│     "Quais documentos falam sobre a biblioteca digital da           │
│      Casa de Memória?"                                              │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  2. MEMÓRIA RESOLVE CONTEXTO                                        │
│     Mem0 lookup: "Casa de Memória" = projeto X, definido em 2026-03  │
│     → filtra busca por project_id = X automaticamente              │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  3. ORQUESTRADOR DECIDE: busca na biblioteca + Memória              │
│     Plano: "Buscar 20 chunks similares + rankear + 5 memórias"     │
└──────────────────────────────────────────────────────────────────────┐
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  4. BIBLIOTECÁRIO EXECUTA A BUSCA                                   │
│     a) Embedding da query:                                          │
│        query_embedding = openai.embed(query, model="text-embed-3-small")│
│        → vetor de 1536 dims                                          │
│     b) SQL:                                                          │
│        SELECT id, content, library_item_id,                          │
│               embedding <=> $1 AS distance                          │
│          FROM document_chunks                                        │
│         WHERE user_id = $auth_user                                  │
│           AND project_id = $X                                        │
│           AND library_item_id IN (                                   │
│               SELECT id FROM library_items WHERE status='ready'     │
│           )                                                          │
│         ORDER BY embedding <=> $1                                    │
│         LIMIT 20                                                    │
│        (<=> é operador de distância cosseno do pgvector)              │
│     c) Conversão distance → similarity: similarity = 1 - distance   │
│     d) Filtro: similarity >= 0.7 (threshold)                        │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  5. RE-RANKING (opcional, agentes especializados)                    │
│     - Cross-encoder (Cohere Rerank ou local) para precisão final    │
│     - Top-20 → top-5                                                │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  6. CONTEXTO PARA O LLM                                             │
│     System prompt:                                                  │
│       "Baseando-se nos trechos abaixo, responda..."                  │
│     User: query original                                            │
│     Trechos:                                                        │
│       [1] (library_item: X, page 12, sim 0.92)                      │
│            "...o projeto Casa de Memória visa criar uma             │
│             biblioteca digital..."                                  │
│       [2] (library_item: Y, page 4, sim 0.88)                       │
│            "...o acervo será digitalizado e..."                     │
│       ...                                                           │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  7. LLM GERA RESPOSTA + CITAÇÕES                                    │
│     Resposta: "Encontrei 3 documentos relevantes. O principal..."  │
│     sources[]: [{chunk_id, library_item_id, title, snippet, score}] │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  8. PERSISTÊNCIA                                                    │
│     - INSERT messages (role=assistant, content, sources, cost)     │
│     - INSERT sources (1 por chunk citado, com reliability=1.0)     │
│     - INSERT agent_runs (vários, encadeados via parent_run_id)     │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│  9. UI RECEBE RESPOSTA + CARDS DE PROGRESSO                        │
│     - "✓ Pedido entendido"                                          │
│     - "✓ Biblioteca consultada (3 docs, 7 trechos)"                │
│     - "✓ Documento gerado"                                          │
│     - Lista de citações clicáveis                                   │
└──────────────────────────────────────────────────────────────────────┘
```

**Operador chave:** o `<=>` é o operador de **distância cosseno** do pgvector. Retorna `1 - cos(θ)`, ou seja, 0 = idêntico, 2 = oposto. Convertemos para similarity (`1 - distance`) por convenção. O índice HNSW é construído com `vector_cosine_ops` (operador cosseno) — mesma família.

**Threshold recomendado:** `similarity >= 0.70` (distance <= 0.30). Abaixo disso, o sistema devolve "não encontrei nada relevante" em vez de alucinar.

**Top-k:** começamos com 20, rerank para 5. Para uso pessoal (volume baixo), 50→10 é aceitável.

---

## 7. Índices: por que HNSW e não IVFFlat

Esta é uma das decisões mais importantes do schema. Detalhamos aqui.

### 7.1 Comparação direta

| Critério | HNSW | IVFFlat |
|---|---|---|
| **Recall** | 95–99% | 90–95% |
| **Velocidade de query** | Rápido (log N) | Médio (k * probes) |
| **Velocidade de build** | Lento (precisa grafo) | Rápido (k-means) |
| **Memória RAM** | Maior (4× o dataset) | Menor |
| **Treinamento prévio** | Não precisa | Sim — precisa rodar k-means nos dados |
| **Suporte a updates** | Bom (insert incremental) | Ruim (re-treina clusters) |
| **Default em Supabase 2026** | Sim | Sim, mas secundário |

### 7.2 Decisão: **HNSW**

**Por quê:**

1. **Volume esperado é pequeno** (~500k chunks no pior cenário, ~1 usuário). HNSW trabalha bem até ~10M vetores em instância Supabase padrão. IVFFlat vence só em volumes muito maiores (>10M).

2. **Sem treino prévio.** HNSW indexa incremental — não precisamos esperar o k-means terminar antes de fazer a primeira busca. Para o MVP isso é crítico.

3. **Melhor recall.** Para uso pessoal, qualidade > velocidade de build. Cada query é 1-2 chamadas de LLM ($0.01-0.05); gastar 50ms a mais pra acertar a referência vale a pena.

4. **Updates naturais.** Quando o usuário apaga e re-upa um arquivo, o HNSW absorve sem re-treino.

### 7.3 Parâmetros escolhidos

```sql
create index document_chunks_embedding_hnsw_idx
    on public.document_chunks
    using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);
```

- **`m = 16`** — número de conexões por nó. Default do Supabase 2026. Aumentar para 32 melhora recall ~1% mas dobra memória.
- **`ef_construction = 64`** — qualidade do build. 64 é seguro; subir para 128 dobra build time, melhora recall ~1%.
- **`vector_cosine_ops`** — operator class para distância cosseno. Alternativas: `vector_l2_ops` (euclidiana) e `vector_ip_ops` (produto interno). Cosseno é o padrão para embeddings normalizados.

### 7.4 Tuning futuro

Em runtime, dois parâmetros GUC controlam a busca:

```sql
SET hnsw.ef_search = 100;  -- padrão 40, mais alto = melhor recall, mais lento
```

Para o MVP, manter o default. Tuning é trabalho de produção.

### 7.5 Quando migrar para IVFFlat

Se a `document_chunks` passar de **5 milhões de linhas**, considere:
1. Particionar a tabela por `created_at` (range) ou `user_id` (hash)
2. Trocar HNSW por IVFFlat com `lists = sqrt(N)` (onde N = linhas)
3. Rodar `ANALYZE` regularmente

Para o horizonte visível (uso pessoal até 2027), **HNSW permanece**.

---

## 8. Row Level Security (RLS)

### 8.1 Filosofia

RLS está habilitada em **todas as 12 tabelas com dados de usuário**. Cada policy segue o mesmo padrão:

```sql
create policy "tabela_acao_own" on public.tabela
    for {select|insert|update|delete} to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());
```

O helper `public.current_user_id()` retorna `auth.uid()` (do JWT). Service role bypassa RLS — o backend usa `service_role` para inserir `agent_runs`, `sources`, `web_search_cache` em nome do usuário.

### 8.2 Por que preparar para multi-tenant

O doc mestre diz "uso pessoal" mas a frase "preparado para multi-tenant" aparece implicitamente em todas as decisões de stack. Se o Naninne virar SaaS, basta:
1. Trocar o signup de magic link por convite pago
2. As policies **não mudam** — `auth.uid()` continua sendo o isolamento
3. Adicionar colunas `plan`, `subscription_status` em `users`
4. Particionar tabelas grandes por `user_id` (HASH)

### 8.3 Casos especiais

**`web_search_cache`:** linhas podem ser globais (`user_id IS NULL`) para queries "públicas" (ex: tendências de mercado que todos querem). A policy permite insert com `user_id IS NULL OR user_id = auth.uid()`. Select é sempre escopado por user.

**`uploaded_files_log`:** é append-only para `authenticated`. Sem policy de UPDATE/DELETE, ninguém pode editar (apenas service_role pode, via backend, para correções de bug).

**`agent_runs`:** mesmo sendo técnico, o usuário deve poder ver seus próprios runs (painel "Gestão Técnica"). Read+insert+update+delete próprios.

### 8.4 Teste de policy

Para verificar se a RLS está funcionando, rode como `authenticated`:

```sql
SET request.jwt.claims = '{"sub": "user-A-uuid"}';
SELECT count(*) FROM public.library_items;  -- só vê itens do user-A
```

---

## 9. Triggers e funções auxiliares

### 9.1 `set_updated_at()`

Trigger genérico. Roda em todo `BEFORE UPDATE` das tabelas com `updated_at`. Setei em 8 tabelas: `users`, `projects`, `library_items`, `conversations`, `memories`, `generated_documents`. As outras 4 (`document_chunks`, `messages`, `agent_runs`, `sources`) são **append-only na prática** — `updated_at` não faria sentido.

### 9.2 `set_indexed_at()`

Trigger específico de `library_items`. Seta `indexed_at = now()` na primeira vez que `status` vira `'ready'`. Permite "quanto tempo meu arquivo levou para ser indexado?" via `indexed_at - created_at`.

### 9.3 `touch_conversation()`

Trigger em `messages` (AFTER INSERT). Atualiza `conversations.message_count` e `last_message_at` automaticamente. Evita o `MAX(created_at)` + `COUNT(*)` na sidebar.

### 9.4 `current_user_id()`

Helper de policy. `SELECT auth.uid()` repetido em 40 policies seria entediante. Centralizamos aqui. SECURITY DEFINER para rodar com privilégios do dono da função (não do chamador).

### 9.5 `is_owner(uuid)`

Helper de comparação. Hoje é trivial (`p_user_id = auth.uid()`), mas amanhã pode virar "o user é dono do recurso OU admin OU compartilhado comigo". Centralizar evita refactor em 50 policies.

### 9.6 `sha256_hex(bytea)`

Helper utilitário. Computa SHA-256 em hex de um `bytea`. Imutável, seguro para paralelização. Usado no upload pipeline se quisermos calcular hash no banco (alternativa: calcular no cliente/Edge Function).

---

## 10. Estratégia de backup e recuperação

### 10.1 Camadas de backup

| Camada | Ferramenta | RPO (tempo até perder dados) | RTO (tempo para recuperar) |
|---|---|---|---|
| **PITR nativo do Supabase** | Wal-g / pg_basebackup contínuo | 5 min | 30 min |
| **Backup diário em bucket S3/GCS** | `pg_dump` agendado | 24 h | 1-2 h |
| **Backup semanal off-site** | `pg_dump` + storage externo | 7 dias | 4 h |
| **Storage (arquivos brutos)** | Replicação nativa Supabase | 0 (3 zonas) | 0 |

### 10.2 PITR (Point-in-Time Recovery) do Supabase

**Disponibilidade:** plano Pro/Team (a partir de 2026). Cobertura de 7 dias default, até 30 dias sob configuração.

**Como usar:**
1. Painel Supabase → Database → Backups
2. Escolher timestamp desejado
3. Restaurar para projeto novo (não sobrescreve o original por segurança)
4. Validar; promover; redirecionar DNS

**Quando usar:** corrupção lógica acidental (DELETE sem WHERE), bug na app que estraga dados. NÃO usar para scaling — é para disaster recovery.

### 10.3 Export periódico (pg_dump)

```bash
# Job diário (cron 03:00 UTC)
pg_dump \
  --dbname=postgresql://postgres:PASS@db.PROJECT.supabase.co:5432/postgres \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  > /backups/naninne-$(date +%Y%m%d-%H%M%S).dump

# Upload para bucket S3 com lifecycle:
#   - 7 dias: Standard
#   - 30 dias: Standard-IA
#   - 365 dias: Glacier
```

**Frequência recomendada:** diário para `messages`, `agent_runs`; semanal para o resto (a loss é tolerável).

### 10.4 Backup do Storage

Os arquivos brutos (`library_items.storage_path`) ficam no Supabase Storage, que tem **replicação multi-AZ nativa**. Não precisa backup adicional para 99.9% dos casos.

**Exceção:** se o usuário apagar um arquivo intencionalmente e a lixeira esvaziar em 30 dias, ele se foi. Para garantia extra, mover arquivos deletados para um bucket `archive/` antes de remover.

### 10.5 Teste de restore

**Frequência:** trimestral. Rodar em projeto Supabase de staging:
1. Apagar o banco
2. Restaurar do PITR (timestamp de 2 horas atrás)
3. Validar contagens, chaves de embedding, sources
4. Documentar tempo gasto e gaps

---

## 11. Limites de volume projetados

Vamos projetar três cenários e identificar o que quebra primeiro.

### 11.1 Cenário 1 — Leve (1k documentos, ~50k chunks)

| Item | Valor |
|---|---|
| library_items | 1.000 |
| document_chunks | 50.000 |
| Tamanho do embedding | 50k × 1536 × 4 bytes = **300 MB** (vetores brutos) |
| Memória do índice HNSW | ~1.2 GB (4× raw) |
| Tempo de query (top-20) | 5-15 ms |
| Build do índice | 2-5 min |
| Tamanho total de tabelas | ~2 GB |

**Tudo funciona.** Sem tuning. Supabase Free tier aguenta. ⚠️ **Primeiro gargalo:** Free tier tem 500 MB de DB; Pro (8 GB) é suficiente.

### 11.2 Cenário 2 — Médio (10k documentos, ~500k chunks)

| Item | Valor |
|---|---|
| library_items | 10.000 |
| document_chunks | 500.000 |
| Tamanho do embedding | **3 GB** (raw) |
| Memória do índice HNSW | ~12 GB |
| Tempo de query (top-20) | 10-30 ms |
| Build do índice | 30-60 min |
| Tamanho total de tabelas | ~15 GB |

**Funciona, mas exige Pro+ plan do Supabase (32 GB RAM).** ⚠️ **Primeiro gargalo:** RAM da instância. HNSW em RAM é obrigatório; swap mata performance.

### 11.3 Cenário 3 — Pesado (100k documentos, ~5M chunks)

| Item | Valor |
|---|---|
| library_items | 100.000 |
| document_chunks | 5.000.000 |
| Tamanho do embedding | **30 GB** (raw) |
| Memória do índice HNSW | ~120 GB (4× raw) |
| Tempo de query (top-20) | 30-80 ms |
| Build do índice | 4-8 horas |
| Tamanho total de tabelas | ~150 GB |

**Aqui quebra.** ⚠️ **Primeiro gargalo:** memória do índice HNSW. Soluções:
1. Particionar `document_chunks` por `user_id` (HASH) — cada partição tem seu índice
2. Migrar HNSW → IVFFlat (menos memória, recall ~95%)
3. Usar **DiskANN** (extensão do pgvector) — HNSW em disco
4. Reduzir dimensão do embedding (1536 → 768 com Matryoshka) cortando 50%

**Decisão:** se chegarmos aqui, o produto está validado e o investimento em scale se justifica. Para uso pessoal (1 usuário) em 2026-2027, **Cenário 2 é o teto confortável**.

### 11.4 Outras métricas que podem quebrar antes

| Métrica | Cenário 1 | Cenário 2 | Cenário 3 |
|---|---|---|---|
| `messages` (100/dia) | 36k/ano | 360k/ano | 3.6M/ano |
| `agent_runs` (~5 por msg) | 180k/ano | 1.8M/ano | 18M/ano |
| `sources` (~3 por msg c/ RAG) | 100k/ano | 1M/ano | 10M/ano |

Em Cenário 3, `messages` e `agent_runs` precisam de **particionamento por `created_at` (RANGE mensal)** e **política de retenção** (manter 12 meses, arquivar resto).

---

## 12. Performance: vacuum, analyze, particionamento

### 12.1 Autovacuum (default do Supabase)

O Supabase já roda autovacuum em todas as tabelas. Para uso pessoal, **não precisa ajustar**. Para Cenário 3:

```sql
-- Tabelas com alto churn (messages, agent_runs) — vacuum mais agressivo
ALTER TABLE public.messages SET (
    autovacuum_vacuum_scale_factor = 0.05,    -- default 0.2
    autovacuum_analyze_scale_factor = 0.02,   -- default 0.1
    autovacuum_vacuum_cost_limit = 2000       -- default 200
);
ALTER TABLE public.agent_runs SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);
```

### 12.2 ANALYZE manual

Rodar `ANALYZE public.document_chunks;` após **bulk inserts** (>10k chunks de uma vez). O planner do Postgres usa as estatísticas para escolher o índice HNSW corretamente.

### 12.3 Particionamento (futuro)

**Quando:** `document_chunks` > 2M linhas OU `messages` > 5M linhas.

**Estratégia para `document_chunks`:** HASH por `user_id` (16 partições). Cada partição tem seu próprio índice HNSW. Queries filtradas por `user_id` batem em 1 partição só.

**Estratégia para `messages`:** RANGE por `created_at` (mensal). Partições antigas viram `NO INHERIT` e são exportadas para arquivo frio.

```sql
-- Exemplo para messages (esboço, não executar agora):
CREATE TABLE public.messages_partitioned (
    LIKE public.messages INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE public.messages_2026_07 PARTITION OF public.messages_partitioned
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
-- ... e assim por diante
```

### 12.4 Monitoramento

Métricas para vigiar em produção (via LangSmith + Supabase Metrics):

| Métrica | Limite saudável | Sintoma de problema |
|---|---|---|
| Latência p95 de query vetorial | < 50 ms | > 200 ms |
| `pg_stat_user_indexes.idx_scan` no HNSW | > 1000/dia | índice não está sendo usado |
| Tamanho do índice HNSW | < 50% da RAM | swap |
| `messages` rows/s (insert) | < 100 | gargalo no app, não no banco |
| Cache hit ratio do planner | > 99% | rodar `ANALYZE` |

---

## 13. Convenções e exemplos de uso

### 13.1 Criando um usuário (onboarding)

```sql
-- Após signup no Supabase Auth, criar o perfil:
insert into public.users (id, display_name)
values (auth.uid(), 'Robert');
```

### 13.2 Criando um projeto

```sql
insert into public.projects (user_id, name, slug, type, color, icon)
values (
    auth.uid(),
    'O Príncipe — Anotações',
    'principe-anotacoes',
    'escrita',
    '#5B5FE9',
    'book-open'
);
```

### 13.3 Subindo um arquivo

```sql
-- 1. Upload no Supabase Storage (via JS SDK)
--    bucket: "library"
--    path: "{user_id}/{uuid}.pdf"
--    retorna: storage_path

-- 2. Criar o library_item:
insert into public.library_items (
    user_id, project_id, title, storage_path, mime_type, format,
    file_size_bytes, file_hash_sha256, status
) values (
    $user_id, $project_id, 'O Príncipe — Maquiavel',
    'storage://library/user-id/uuid.pdf',
    'application/pdf', 'pdf',
    524288, 'a1b2c3...', 'pending'
);

-- 3. Trigger de log:
insert into public.uploaded_files_log (user_id, library_item_id, action, file_hash)
values ($user_id, $library_item_id, 'upload_completed', $hash);
```

### 13.4 Indexando chunks

```sql
-- Quando o Leitor de Documentos termina:
insert into public.document_chunks (
    user_id, library_item_id, project_id, chunk_index,
    content, token_count, embedding, metadata
) values (
    $user_id, $library_item_id, $project_id, 0,
    'No princípio era o poder invisível...', 487,
    $embedding_vector, '{"page_number": 1}'::jsonb
);
-- (repetir para cada chunk)

update public.library_items
   set status = 'ready'
 where id = $library_item_id;
-- (a trigger set_indexed_at popula indexed_at automaticamente)
```

### 13.5 Busca semântica

```sql
-- Top-20 chunks mais similares à query, filtrados por projeto
with query_embedding as (
    select $1::vector(1536) as qe
)
select
    dc.id,
    dc.content,
    dc.library_item_id,
    li.title,
    dc.metadata->>'page_number' as page,
    1 - (dc.embedding <=> qe.qe) as similarity
from public.document_chunks dc
join public.library_items li on li.id = dc.library_item_id
cross join query_embedding qe
where dc.user_id = auth.uid()
  and dc.project_id = $project_id
  and li.status = 'ready'
  and dc.embedding <=> qe.qe < 0.30   -- threshold (similarity > 0.70)
order by dc.embedding <=> qe.qe
limit 20;
```

### 13.6 Persistindo uma resposta

```sql
-- Mensagem do assistente
insert into public.messages (
    user_id, conversation_id, project_id, role, content,
    agent_used, sources, latency_ms, tokens_input, tokens_output,
    cost_usd, model_used
) values (
    $user_id, $conversation_id, $project_id, 'assistant', $content,
    'redator', $sources_json, 1234, 8500, 620,
    0.084, 'claude-sonnet-4-20260514'
);

-- Cada source citada vira uma linha na tabela sources
insert into public.sources (
    user_id, library_item_id, chunk_id, message_id, conversation_id,
    url, snippet, reliability_score, page_number
) values (
    $user_id, $library_item_id, $chunk_id,
    currval('public.messages_id_seq'),
    $conversation_id,
    $url, $snippet, 1.0, $page
);
-- (repetir para cada chunk citado)

-- Run do agente
insert into public.agent_runs (
    user_id, project_id, conversation_id, message_id,
    task_id, agent_type, status, model_used,
    prompt_tokens, completion_tokens, cost_usd, latency_ms
) values (
    $user_id, $project_id, $conversation_id, $message_id,
    $task_id, 'redator', 'success', 'claude-sonnet-4-20260514',
    8500, 620, 0.084, 1234
);
```

### 13.7 Dashboard: stats por projeto

```sql
select * from public.project_stats
where user_id = auth.uid()
order by last_message_at desc nulls last;
```

### 13.8 Billing: gasto do mês

```sql
select
    agent_type,
    run_count,
    total_cost_usd,
    avg_latency_ms
from public.monthly_usage
where user_id = auth.uid()
  and month = date_trunc('month', now());
```

---

## 14. Roadmap de evolução

### 14.1 Próximas migrations (já identificadas)

| Migration | Conteúdo | Quando |
|---|---|---|
| `002_storage_policies.sql` | Policies RLS do Supabase Storage (bucket "library") | Semana 1 do MVP |
| `003_fts_index.sql` | Índice Full-Text Search (tsvector) em `document_chunks.content` — fallback semântico | Pós-MVP |
| `004_pg_cron_jobs.sql` | Limpeza automática de `web_search_cache` expirado + `agent_runs` > 6 meses | Pós-MVP |
| `005_analytics_views.sql` | Views materializadas para dashboard (refresh noturno) | Quando dados > 100k |
| `006_audit_user_actions.sql` | Trigger genérica de audit em UPDATE/DELETE de tabelas críticas | Quando entrar em produção real |

### 14.2 Decisões adiadas (precisam de dados)

1. **Particionamento de `document_chunks`** — só quando > 2M linhas. Hoje, premature optimization.
2. **Dimensão 1536 vs 3072** — text-embedding-3-large (3072) tem melhor recall mas custa 2× mais. Decidir quando tivermos dados de qualidade do RAG.
3. **Cache semântico** (vetores de queries frequentes) — só se o uso justificar. Hoje, `web_search_cache` cobre o gargalo real (Tavily é caro).
4. **Multi-tenancy explícito** (coluna `organization_id`) — só se virar SaaS B2B. Hoje, RLS por `user_id` basta.

---

## Apêndice A — Checklist de revisão (para Robert)

Antes de aprovar, confirme:

- [ ] As 12 tabelas cobrem o fluxo descrito no doc mestre (Biblioteca Universal + Agentes + Memória)
- [ ] Os enums (project_type, message_role, agent_type, ...) estão completos
- [ ] HNSW é a escolha certa para o horizonte visível
- [ ] RLS está habilitada em todas as 12 tabelas
- [ ] As 3 políticas de retenção (12 meses messages, 6 meses agent_runs, 24h web_cache) fazem sentido
- [ ] A separação `messages.sources` (denormalizado) vs `sources` (canônico) está clara

## Apêndice B — Perguntas para o time de backend

1. **Onde calcular o `file_hash_sha256`?** Cliente (browser) ou Edge Function? Cliente é mais rápido mas exige JS; Edge é server-side e confiável.
2. **Como enfileirar a indexação assíncrona?** Supabase Realtime + Edge Function, ou fila externa (Inngest, Trigger.dev)?
3. **Embeddings próprios ou OpenAI?** OpenAI é bom mas tem custo. Llama 3 embeddings self-hosted é mais barato mas mais lento. Recomendação do doc mestre é open-source + fechado combinados — para embeddings, qual lado pesa mais?
4. **Atualizar embedding em reprocess?** Se o usuário trocar o chunk_size de 512→1024, refazemos todos os chunks. Como detectar e agendar isso?

---

*Fim do documento. Próxima revisão: após feedback do arquiteto de orquestração e do estimador de custos.*

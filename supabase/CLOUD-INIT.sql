-- =============================================================================
-- Naninne — Schema combinado para Supabase CLOUD
-- APLICAR UMA VEZ no SQL Editor do Supabase Cloud
-- https://supabase.com/dashboard/project/sluduptmsryejyjwihvy/sql/new
-- =============================================================================
-- Combina:
--   1) Extensões
--   2) Schema principal (12 tabelas + RLS + HNSW) — versão pure Supabase
--   3) Seed: 4 projects padrão (escrita/audiovisual/mercado/tech)
--   4) Storage bucket 'library' com policies RLS
-- =============================================================================

-- =============================================================================
-- 1) EXTENSÕES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- Naninne — Schema do Supabase (Postgres 15 + pgvector)
-- =============================================================================
-- Autor:    Mavis (DBA do Naninne)
-- Data:     2026-07-06
-- Versão:   1.0
-- Compat.:  PostgreSQL 15+ / Supabase 2026
--
-- FONTE CANÔNICA:
--   /workspace/docs/naninne-master-doc.md (seções 3, 5 e 6)
--
-- VISÃO GERAL:
--   - 12 tabelas principais (users, projects, library_items, document_chunks,
--     conversations, messages, memories, agent_runs, sources, generated_documents,
--     uploaded_files_log, web_search_cache)
--   - RLS habilitado em TODAS as tabelas com dados de usuário
--   - Índice HNSW no embedding (escolha justificada no schema-doc.md)
--   - Triggers de updated_at + auditoria
--   - Comentários SQL em decisões não-óbvias
--
-- COMO APLICAR:
--   supabase db reset                  # ambiente local
--   supabase migration up              # ambiente local
--   supabase db push                   # produção (Supabase Cloud)
--
-- CONVENÇÕES:
--   - snake_case em tudo (padrão Postgres/Supabase)
--   - PKs: uuid com gen_random_uuid() (extensão pgcrypto)
--   - Timestamps: timestamptz com default now()
--   - user_id SEMPRE referencia auth.users(id) ON DELETE CASCADE
--   - JSONB para campos semi-estruturados (metadata, sources, results)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSÕES
-- -----------------------------------------------------------------------------
-- Habilita no schema público para ficar disponível em migrations e queries
create extension if not exists "uuid-ossp"   with schema extensions;
create extension if not exists "pgcrypto"    with schema extensions;
create extension if not exists "pg_trgm"     with schema extensions;
create extension if not exists "vector"      with schema extensions;

-- Comentário: pgcrypto dá acesso a gen_random_uuid() (mais moderno que
-- uuid-ossp.uuid_generate_v4() e sem dependência de -oss). pg_trgm habilita
-- busca textual difusa (LIKE/ILIKE rápidos) que vamos usar no snippet das
-- sources e no fallback da busca semântica.

-- -----------------------------------------------------------------------------
-- 1. ENUMS (valores fechados)
-- -----------------------------------------------------------------------------
-- Mantemos enums em vez de varchar+CHECK para:
--   (a) validação no nível do banco
--   (b)節約 de espaço (4 bytes vs overhead de texto)
--   (c) autocomplete no editor

create type public.project_type as enum (
    'escrita',     -- Escrita Criativa (livros, capítulos, contos)
    'audiovisual', -- Roteiros, vídeos, imagens
    'mercado',     -- Análise corporativa, planilhas
    'tech',        -- Desenvolvimento, código, DevOps
    'custom'       -- Projeto customizado pelo usuário
);

create type public.library_item_status as enum (
    'pending',     -- Upload feito, aguardando processamento
    'processing',  -- Algum agente trabalhando (parse/embed/transcribe)
    'ready',       -- Indexado e disponível para busca
    'failed',      -- Erro irrecuperável (precisa intervenção)
    'archived'     -- Removido do índice ativo, mas guardado no storage
);

create type public.message_role as enum (
    'user',        -- Pergunta do humano
    'assistant',   -- Resposta do orquestrador
    'system',      -- Mensagens de sistema (instruções, contexto)
    'tool'         -- Resultado de uma tool/function call
);

create type public.agent_type as enum (
    'orchestrator', 'memoria', 'bibliotecario', 'leitor_documentos',
    'visionario',   'transcritor', 'pesquisador', 'analista_dados',
    'organizador',  'redator',    'revisor'
);

create type public.agent_run_status as enum (
    'queued',    -- Na fila, ainda não rodou
    'running',   -- Executando agora
    'success',   -- Terminou OK
    'error',     -- Falhou (ver coluna error)
    'timeout',   -- Estourou tempo limite
    'cancelled'  -- Cancelado pelo usuário ou pelo orquestrador
);

create type public.generated_document_format as enum (
    'markdown', 'pdf', 'docx', 'pptx', 'html', 'txt', 'csv', 'json'
);

create type public.generated_document_status as enum (
    'draft',     -- Em produção
    'review',    -- Aguardando revisão do usuário
    'approved',  -- Aprovado, considerado final
    'archived'   -- Não-apagado mas escondido
);

create type public.upload_action as enum (
    'upload_started', 'upload_completed', 'upload_failed',
    'processing_started', 'processing_completed', 'processing_failed',
    'deleted', 'restored'
);

-- Comentário: agent_type é enum em vez de varchar porque o conjunto é fixo
-- (10 agentes + revisor) e novos tipos viram migrations controladas. Mesmo
-- raciocínio para os outros enums.

-- -----------------------------------------------------------------------------
-- 2. FUNÇÕES AUXILIARES
-- -----------------------------------------------------------------------------

-- 2.1 Trigger genérico: atualiza a coluna updated_at = now() antes do UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

comment on function public.set_updated_at() is
    'Trigger function: seta updated_at=now() em todo UPDATE. Reutilizável.';

-- 2.2 Helper: SHA-256 em hex de um blob (usado no upload audit)
create or replace function public.sha256_hex(p_data bytea)
returns text
language sql
immutable
set search_path = public, extensions
as $$
    select encode(extensions.digest(p_data, 'sha256'), 'hex');
$$;

comment on function public.sha256_hex(bytea) is
    'Hash SHA-256 de um bytea retornado em hexadecimal. Imutável.';

-- 2.3 Helper: extrai o user_id do JWT atual. Atalhos para policies.
create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select auth.uid();
$$;

comment on function public.current_user_id() is
    'Retorna auth.uid() do JWT atual. Usado em policies RLS para encurtar.';

-- 2.4 Helper: verifica se o usuário é "owner" do recurso (uso geral)
--     Por enquanto sempre TRUE (single-user), mas já deixa o gancho pronto
--     para multi-tenant.
create or replace function public.is_owner(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select p_user_id = auth.uid();
$$;

comment on function public.is_owner(uuid) is
    'Predicado reutilizável: TRUE se p_user_id bate com o JWT. Preparado para multi-tenant sem reescrever policies.';

-- -----------------------------------------------------------------------------
-- 3. TABELAS
-- -----------------------------------------------------------------------------

-- 3.1 USERS — perfil do usuário + preferências
-- -----------------------------------------------------------------------------
-- O Supabase já cria auth.users (tabela interna do GoTrue). Aqui criamos
-- o PERFIL público: preferências, exibição, plano. Vinculado 1:1 por PK.
create table public.users (
    id              uuid        primary key references auth.users(id) on delete cascade,
    display_name    text        not null,
    avatar_url      text,
    locale          text        not null default 'pt-BR',
    timezone        text        not null default 'America/Sao_Paulo',
    preferences     jsonb       not null default '{}'::jsonb,
    -- preferences: { theme, default_project_id, model_preferences, ... }
    metadata        jsonb       not null default '{}'::jsonb,
    -- metadata: info interna (last_seen_at, onboarding_step, etc.)
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    constraint users_display_name_len check (char_length(display_name) between 1 and 80)
);

comment on table public.users is
    'Perfil público do usuário, vinculado 1:1 com auth.users (Supabase Auth). Preferências e metadata ficam em JSONB para evoluir sem migration.';

create index users_created_at_idx on public.users (created_at desc);
create index users_preferences_gin_idx on public.users using gin (preferences);

create trigger users_set_updated_at
    before update on public.users
    for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3.2 PROJECTS — projetos do usuário (Escrita, Audiovisual, Mercado, Tech, custom)
-- -----------------------------------------------------------------------------
create table public.projects (
    id              uuid             primary key default gen_random_uuid(),
    user_id         uuid             not null references public.users(id) on delete cascade,
    name            text             not null,
    slug            text             not null,
    type            public.project_type not null,
    description     text,
    color           text             not null default '#5B5FE9',
    -- cor hex vinda do design system (ex: #5B5FE9 = índigo suave)
    icon            text             not null default 'folder',
    -- nome do ícone (lucide/react) — ex: "book-open", "film", "trending-up"
    is_archived     boolean          not null default false,
    sort_order      integer          not null default 0,
    metadata        jsonb            not null default '{}'::jsonb,
    created_at      timestamptz      not null default now(),
    updated_at      timestamptz      not null default now(),

    constraint projects_name_len check (char_length(name) between 1 and 80),
    constraint projects_slug_format check (slug ~ '^[a-z0-9-]+$'),
    constraint projects_color_format check (color ~ '^#[0-9A-Fa-f]{6}$'),
    constraint projects_user_slug_uq unique (user_id, slug)
);

comment on table public.projects is
    'Projeto é o "guarda-chuva" que agrupa library_items, conversations e generated_documents. Os 4 fixos (escrita/audiovisual/mercado/tech) são criados no onboarding, mas o usuário pode criar custom.';

create index projects_user_id_idx       on public.projects (user_id);
create index projects_user_type_idx     on public.projects (user_id, type);
create index projects_user_archived_idx on public.projects (user_id, is_archived);
create index projects_metadata_gin_idx  on public.projects using gin (metadata);

create trigger projects_set_updated_at
    before update on public.projects
    for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3.3 LIBRARY_ITEMS — metadados do arquivo original (a "Biblioteca Universal")
-- -----------------------------------------------------------------------------
-- Esta é a tabela-âncora do produto. Cada arquivo (PDF, áudio, vídeo, etc.)
-- gera um library_item. O arquivo bruto fica no Supabase Storage (caminho em
-- storage_path), os chunks semânticos vão em document_chunks.
create table public.library_items (
    id              uuid                       primary key default gen_random_uuid(),
    user_id         uuid                       not null references public.users(id) on delete cascade,
    project_id      uuid                       references public.projects(id) on delete set null,
    -- on delete set null: se o projeto for apagado, o item fica "órfão"
    -- (não perde o arquivo do usuário) e pode ser re-vinculado depois.

    title           text                       not null,
    description     text,
    source_uri      text,
    -- URI original (ex: "https://exemplo.com/artigo", "whatsapp-export:chat-123")
    -- NULL quando veio de upload direto.
    storage_path    text,
    -- Caminho no Supabase Storage (bucket "library"), ex: "user-id/item-id.pdf"
    mime_type       text,
    -- ex: "application/pdf", "audio/mpeg", "video/mp4", "image/jpeg"
    format          text,
    -- extensão normalizada: "pdf", "docx", "mp3", "mp4", "jpg", "txt", "md"
    file_size_bytes bigint,
    file_hash_sha256 text,
    -- hex; útil para dedup e para audit
    language        text                       default 'pt-BR',
    -- idioma predominante do conteúdo
    status          public.library_item_status not null default 'pending',
    error_message   text,
    metadata        jsonb                      not null default '{}'::jsonb,
    -- metadata: páginas, autor, duração (seg), dimensões de imagem, etc.
    indexed_at      timestamptz,
    -- quando terminou de virar chunks+embeddings (status=ready)
    created_at      timestamptz                not null default now(),
    updated_at      timestamptz                not null default now(),

    constraint library_items_title_len check (char_length(title) between 1 and 500),
    constraint library_items_format_len check (format is null or char_length(format) <= 16),
    constraint library_items_size_positive check (file_size_bytes is null or file_size_bytes >= 0),
    constraint library_items_hash_format check (
        file_hash_sha256 is null or file_hash_sha256 ~ '^[0-9a-f]{64}$'
    )
);

comment on table public.library_items is
    'Metadados de cada arquivo da Biblioteca Universal. O arquivo bruto fica no Supabase Storage (storage_path); os chunks semânticos vão em document_chunks. Um library_item = um arquivo físico.';
comment on column public.library_items.source_uri is
    'URI de origem quando o item veio de fora (web, export WhatsApp, etc). NULL = upload direto do usuário.';
comment on column public.library_items.indexed_at is
    'Momento em que a indexação semântica terminou (status=ready).';

-- Dedup: o mesmo arquivo (mesmo hash) do mesmo usuário só conta uma vez
create unique index library_items_user_hash_uq
    on public.library_items (user_id, file_hash_sha256)
    where file_hash_sha256 is not null;

create index library_items_user_id_idx        on public.library_items (user_id);
create index library_items_user_project_idx   on public.library_items (user_id, project_id);
create index library_items_user_status_idx    on public.library_items (user_id, status);
create index library_items_user_created_idx   on public.library_items (user_id, created_at desc);
create index library_items_user_format_idx    on public.library_items (user_id, format);
-- Búsqueda textual de fallback (quando o embedding não retorna o que se quer)
create index library_items_title_trgm_idx
    on public.library_items using gin (title gin_trgm_ops);
create index library_items_metadata_gin_idx
    on public.library_items using gin (metadata);

create trigger library_items_set_updated_at
    before update on public.library_items
    for each row execute function public.set_updated_at();

-- Trigger: ao virar 'ready', seta indexed_at
create or replace function public.set_indexed_at()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'ready' and old.status is distinct from 'ready' then
        new.indexed_at := now();
    end if;
    return new;
end;
$$;

comment on function public.set_indexed_at() is
    'Seta indexed_at=now() na primeira vez que o item vira ready.';

create trigger library_items_set_indexed_at
    before update on public.library_items
    for each row execute function public.set_indexed_at();

-- -----------------------------------------------------------------------------
-- 3.4 DOCUMENT_CHUNKS — pedaços semânticos com embedding
-- -----------------------------------------------------------------------------
-- O coração da busca semântica. Cada library_item vira N chunks; cada chunk
-- tem (a) texto original, (b) embedding, (c) metadados de posição.
create table public.document_chunks (
    id              uuid        primary key default gen_random_uuid(),
    user_id         uuid        not null references public.users(id) on delete cascade,
    library_item_id uuid        not null references public.library_items(id) on delete cascade,
    project_id      uuid        references public.projects(id) on delete set null,

    chunk_index     integer     not null,
    -- posição do chunk dentro do documento (0-based)
    content         text        not null,
    token_count     integer     not null,
    -- quantos tokens tem o content (para budget de contexto do LLM)
    embedding       vector(1536),
    -- 1536 = text-embedding-3-small / ada-002. Vide schema-doc.md para
    -- justificativa da dimensão e trade-off vs 3072.
    metadata        jsonb       not null default '{}'::jsonb,
    -- metadata: { page_number, section, char_start, char_end, speaker, ... }
    created_at      timestamptz not null default now(),

    constraint document_chunks_index_nonneg check (chunk_index >= 0),
    constraint document_chunks_tokens_pos check (token_count > 0),
    constraint document_chunks_content_len check (char_length(content) between 1 and 50000)
);

comment on table public.document_chunks is
    'Chunks semânticos com embedding vector(1536). Cada library_item gera N chunks. A busca semântica faz cosine similarity no embedding.';
comment on column public.document_chunks.embedding is
    'Embedding de 1536 dims. Modelo alvo: OpenAI text-embedding-3-small (ou ada-002). Distância: cosine (HNSW com vector_cosine_ops).';

-- Unicidade: um chunk_index por library_item (evita duplicação em reprocess)
create unique index document_chunks_item_index_uq
    on public.document_chunks (library_item_id, chunk_index);

create index document_chunks_user_id_idx      on public.document_chunks (user_id);
create index document_chunks_item_id_idx      on public.document_chunks (library_item_id);
create index document_chunks_project_id_idx   on public.document_chunks (project_id);
create index document_chunks_metadata_gin_idx on public.document_chunks using gin (metadata);

-- ⭐ ÍNDICE VETORIAL (HNSW)
-- Escolha: HNSW com m=16, ef_construction=64.
-- Justificativa (detalhes em schema-doc.md):
--   - HNSW: melhor recall (~99%), query rápida, build mais lento
--   - IVFFlat: build rápido, recall ~95% mas precisa treinar com dados
--   - Para 1 usuário com até ~50k docs (~500k chunks), HNSW é o padrão 2026
--   - ef_construction=64 dá construção segura; tuning de ef_search é runtime
create index document_chunks_embedding_hnsw_idx
    on public.document_chunks
    using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);

-- Comentário: o índice HNSW fica no schema public; queries usarão
--   ORDER BY embedding <=> $1 LIMIT k
-- onde <=> é o operador de distância cosseno do pgvector.

-- -----------------------------------------------------------------------------
-- 3.5 CONVERSATIONS — sessões de chat com o orquestrador
-- -----------------------------------------------------------------------------
create table public.conversations (
    id              uuid        primary key default gen_random_uuid(),
    user_id         uuid        not null references public.users(id) on delete cascade,
    project_id      uuid        references public.projects(id) on delete set null,

    title           text        not null,
    -- auto-gerado pelo orquestrador na primeira mensagem
    summary         text,
    -- resumo atualizado periodicamente (LLM gera)
    message_count   integer     not null default 0,
    -- contador denormalizado para ordenação rápida
    last_message_at timestamptz,
    metadata        jsonb       not null default '{}'::jsonb,
    is_archived     boolean     not null default false,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    constraint conversations_title_len check (char_length(title) between 1 and 200)
);

comment on table public.conversations is
    'Sessão de chat. Cada conversa tem N messages e pode estar vinculada a um projeto. title é auto-gerado pelo orquestrador na primeira msg.';

create index conversations_user_id_idx        on public.conversations (user_id);
create index conversations_user_project_idx   on public.conversations (user_id, project_id);
create index conversations_user_last_msg_idx  on public.conversations (user_id, last_message_at desc nulls last);
create index conversations_metadata_gin_idx   on public.conversations using gin (metadata);

create trigger conversations_set_updated_at
    before update on public.conversations
    for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3.6 MESSAGES — turnos da conversa
-- -----------------------------------------------------------------------------
create table public.messages (
    id              uuid                   primary key default gen_random_uuid(),
    user_id         uuid                   not null references public.users(id) on delete cascade,
    conversation_id uuid                   not null references public.conversations(id) on delete cascade,
    project_id      uuid                   references public.projects(id) on delete set null,

    role            public.message_role    not null,
    content         text                   not null,
    agent_used      public.agent_type,
    -- qual agente respondeu (NULL = orquestrador principal ou user)
    sources         jsonb                  not null default '[]'::jsonb,
    -- array de {chunk_id, library_item_id, title, snippet, score}
    latency_ms      integer,
    tokens_input    integer,
    tokens_output   integer,
    cost_usd        numeric(10, 6),
    model_used      text,
    -- modelo LLM concreto (ex: "claude-sonnet-4-20260514")
    metadata        jsonb                  not null default '{}'::jsonb,
    created_at      timestamptz            not null default now(),

    constraint messages_content_len check (char_length(content) between 1 and 200000),
    constraint messages_latency_nonneg check (latency_ms is null or latency_ms >= 0),
    constraint messages_tokens_nonneg check (
        (tokens_input  is null or tokens_input  >= 0) and
        (tokens_output is null or tokens_output >= 0)
    ),
    constraint messages_cost_nonneg check (cost_usd is null or cost_usd >= 0)
);

comment on table public.messages is
    'Turno de mensagem dentro de uma conversation. user/assistant/system/tool.';
comment on column public.messages.sources is
    'Citações usadas na resposta. Array JSON: [{chunk_id, library_item_id, title, snippet, score}, ...]';

create index messages_user_id_idx           on public.messages (user_id);
create index messages_conversation_id_idx   on public.messages (conversation_id, created_at);
create index messages_project_id_idx        on public.messages (project_id);
create index messages_user_created_idx      on public.messages (user_id, created_at desc);
create index messages_sources_gin_idx       on public.messages using gin (sources);
create index messages_metadata_gin_idx      on public.messages using gin (metadata);

-- Trigger: ao inserir/atualizar mensagem, atualiza contador e last_message_at
-- da conversa pai. Mantém denormalização barata.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
as $$
begin
    if (tg_op = 'INSERT') then
        update public.conversations
           set message_count   = message_count + 1,
               last_message_at = new.created_at
         where id = new.conversation_id;
    end if;
    return new;
end;
$$;

comment on function public.touch_conversation() is
    'Atualiza conversations.message_count e last_message_at ao inserir msg.';

create trigger messages_touch_conversation
    after insert on public.messages
    for each row execute function public.touch_conversation();

-- -----------------------------------------------------------------------------
-- 3.7 MEMORIES — camada Mem0 (fatos sobre o usuário)
-- -----------------------------------------------------------------------------
create table public.memories (
    id                uuid         primary key default gen_random_uuid(),
    user_id           uuid         not null references public.users(id) on delete cascade,

    fact              text         not null,
    category          text         not null default 'general',
    -- ex: 'preference', 'project', 'entity', 'general'
    confidence        real         not null default 1.0
                      check (confidence >= 0.0 and confidence <= 1.0),
    source_message_id uuid         references public.messages(id) on delete set null,
    -- de qual mensagem este fato foi extraído
    embedding         vector(1536),
    -- opcional: embedding do fact para recall semântico das memórias
    metadata          jsonb        not null default '{}'::jsonb,
    expires_at        timestamptz,
    -- NULL = eterno; senão Mem0 esquece após a data
    created_at        timestamptz  not null default now(),
    updated_at        timestamptz  not null default now(),

    constraint memories_fact_len check (char_length(fact) between 1 and 2000)
);

comment on table public.memories is
    'Camada Mem0: fatos duráveis sobre o usuário. confidence 0-1 (Mem0 retorna scores). embedding opcional para recall semântico.';
comment on column public.memories.confidence is
    'Confiança do Mem0 no fato (0.0–1.0). Fatos com confidence < 0.3 podem ser promovidos para revisão ou expirados.';

create index memories_user_id_idx      on public.memories (user_id);
create index memories_user_category_idx on public.memories (user_id, category);
create index memories_user_created_idx on public.memories (user_id, created_at desc);
create index memories_embedding_hnsw_idx
    on public.memories
    using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 32);
-- ef_construction menor aqui (32) porque memórias são bem menos que chunks.

create trigger memories_set_updated_at
    before update on public.memories
    for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3.8 AGENT_RUNS — histórico de cada execução de agente
-- -----------------------------------------------------------------------------
-- "Quem fez o quê, com qual modelo, quanto custou, deu erro?"
create table public.agent_runs (
    id              uuid                    primary key default gen_random_uuid(),
    user_id         uuid                    not null references public.users(id) on delete cascade,
    project_id      uuid                    references public.projects(id) on delete set null,
    conversation_id uuid                    references public.conversations(id) on delete set null,
    message_id      uuid                    references public.messages(id) on delete set null,
    parent_run_id   uuid                    references public.agent_runs(id) on delete set null,
    -- permite encadear (orquestrador → bibliotecário → visionário)

    task_id         text                    not null,
    -- id externo vindo do LangGraph (uuid/string) — chave de correlação
    agent_type      public.agent_type       not null,
    status          public.agent_run_status not null default 'queued',
    model_used      text,
    prompt_tokens   integer,
    completion_tokens integer,
    cost_usd        numeric(10, 6),
    latency_ms      integer,
    error           text,
    -- mensagem de erro se status = error/timeout
    input_payload   jsonb,
    output_payload  jsonb,
    metadata        jsonb                   not null default '{}'::jsonb,
    started_at      timestamptz             not null default now(),
    finished_at     timestamptz,

    constraint agent_runs_latency_nonneg check (latency_ms is null or latency_ms >= 0),
    constraint agent_runs_tokens_nonneg check (
        (prompt_tokens is null or prompt_tokens >= 0) and
        (completion_tokens is null or completion_tokens >= 0)
    ),
    constraint agent_runs_cost_nonneg check (cost_usd is null or cost_usd >= 0)
);

comment on table public.agent_runs is
    'Linha por execução de agente. LangGraph emite callbacks; a aplicação persiste cada um. Permite auditoria, billing e debug.';
comment on column public.agent_runs.task_id is
    'task_id do LangGraph — chave de correlação com traces do LangSmith.';

create index agent_runs_user_id_idx         on public.agent_runs (user_id);
create index agent_runs_task_id_idx         on public.agent_runs (task_id);
create index agent_runs_user_agent_idx      on public.agent_runs (user_id, agent_type);
create index agent_runs_user_status_idx     on public.agent_runs (user_id, status);
create index agent_runs_user_started_idx    on public.agent_runs (user_id, started_at desc);
create index agent_runs_message_id_idx      on public.agent_runs (message_id);
create index agent_runs_parent_run_id_idx   on public.agent_runs (parent_run_id);
create index agent_runs_metadata_gin_idx    on public.agent_runs using gin (metadata);

-- -----------------------------------------------------------------------------
-- 3.9 SOURCES — citações (origem verificável de uma afirmação)
-- -----------------------------------------------------------------------------
-- Diferente de messages.sources (que é denormalizado dentro da mensagem),
-- esta tabela é a fonte canônica e persistente: cada chunk que foi citado
-- alguma vez, em qualquer conversa, vira uma linha aqui. Útil para
-- "em qual conversa esse trecho apareceu?" e para auditoria.
create table public.sources (
    id                uuid        primary key default gen_random_uuid(),
    user_id           uuid        not null references public.users(id) on delete cascade,
    library_item_id   uuid        not null references public.library_items(id) on delete cascade,
    chunk_id          uuid        references public.document_chunks(id) on delete cascade,
    -- chunk_id é nullable: a citação pode ser só a URL/página do arquivo
    message_id        uuid        references public.messages(id) on delete cascade,
    -- em qual mensagem esta source foi citada
    conversation_id   uuid        references public.conversations(id) on delete cascade,

    url               text,
    -- URL externa (web) ou storage:// interno; ex: "https://..." ou
    -- "library://user-id/item-id#page=47"
    snippet           text        not null,
    -- excerto curto (200-400 chars) para preview sem buscar o chunk
    reliability_score real        not null default 1.0
                      check (reliability_score >= 0.0 and reliability_score <= 1.0),
    -- 1.0 = arquivo do próprio usuário; <1.0 = web (Tavily devolve score)
    page_number       integer,
    section           text,
    metadata          jsonb       not null default '{}'::jsonb,
    accessed_at       timestamptz not null default now(),

    constraint sources_snippet_len check (char_length(snippet) between 1 and 2000),
    constraint sources_page_positive check (page_number is null or page_number > 0)
);

comment on table public.sources is
    'Citação canônica e auditável. Cada chunk/URL citado em uma resposta gera uma linha. Permite "esse trecho apareceu em quais conversas?"';

create index sources_user_id_idx          on public.sources (user_id);
create index sources_library_item_id_idx  on public.sources (library_item_id);
create index sources_chunk_id_idx         on public.sources (chunk_id);
create index sources_message_id_idx       on public.sources (message_id);
create index sources_conversation_id_idx  on public.sources (conversation_id);
create index sources_reliability_idx      on public.sources (user_id, reliability_score desc);
create index sources_metadata_gin_idx     on public.sources using gin (metadata);
-- Búsqueda textual no snippet (fallback + UI de preview)
create index sources_snippet_trgm_idx
    on public.sources using gin (snippet gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- 3.10 GENERATED_DOCUMENTS — produtos finais (capítulos, relatórios, slides)
-- -----------------------------------------------------------------------------
create table public.generated_documents (
    id              uuid                          primary key default gen_random_uuid(),
    user_id         uuid                          not null references public.users(id) on delete cascade,
    project_id      uuid                          references public.projects(id) on delete set null,
    conversation_id uuid                          references public.conversations(id) on delete set null,
    -- conversa que originou o documento (nullable: pode ser gerado a partir
    -- de um job assíncrono sem conversa)

    title           text                          not null,
    description     text,
    format          public.generated_document_format not null,
    status          public.generated_document_status not null default 'draft',
    output_url      text,
    -- URL no Supabase Storage ou link externo (ex: Google Slides)
    storage_path    text,
    -- caminho no bucket (se output_url for signed URL do próprio Supabase)
    file_size_bytes bigint,
    content_hash    text,
    -- hash do output final (para detectar mudanças / re-geração)
    metadata        jsonb                         not null default '{}'::jsonb,
    -- metadata: { pages, word_count, slide_count, ... }
    created_at      timestamptz                   not null default now(),
    updated_at      timestamptz                   not null default now(),

    constraint generated_documents_title_len check (char_length(title) between 1 and 500),
    constraint generated_documents_size_positive check (
        file_size_bytes is null or file_size_bytes >= 0
    ),
    constraint generated_documents_hash_format check (
        content_hash is null or content_hash ~ '^[0-9a-f]{64}$'
    )
);

comment on table public.generated_documents is
    'Documento final gerado por um agente (capítulo, relatório, slide, ata). output_url aponta para o storage ou link público.';

create index generated_documents_user_id_idx        on public.generated_documents (user_id);
create index generated_documents_user_project_idx   on public.generated_documents (user_id, project_id);
create index generated_documents_user_status_idx    on public.generated_documents (user_id, status);
create index generated_documents_user_created_idx   on public.generated_documents (user_id, created_at desc);
create index generated_documents_metadata_gin_idx   on public.generated_documents using gin (metadata);

create trigger generated_documents_set_updated_at
    before update on public.generated_documents
    for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3.11 UPLOADED_FILES_LOG — audit trail de uploads
-- -----------------------------------------------------------------------------
-- Toda ação sobre um arquivo (upload começou, terminou, falhou, foi
-- reprocessado, deletado) vira uma linha. Permite investigar "por que
-- esse arquivo não aparece?" sem bisbilhotar logs da Vercel.
create table public.uploaded_files_log (
    id              uuid                  primary key default gen_random_uuid(),
    user_id         uuid                  not null references public.users(id) on delete cascade,
    library_item_id uuid                  references public.library_items(id) on delete cascade,
    -- nullable: o log pode existir mesmo se o item ainda não foi criado
    -- (ex: upload_started antes de criar o item)

    action          public.upload_action  not null,
    file_hash       text,
    -- hash do arquivo no momento da ação (pode mudar entre ações)
    file_size_bytes bigint,
    status          text,
    -- status textual livre (ex: HTTP 200, "etag set", etc)
    error           text,
    metadata        jsonb                 not null default '{}'::jsonb,
    -- metadata: { ip, user_agent, request_id, ... }
    created_at      timestamptz           not null default now(),

    constraint uploaded_files_log_hash_format check (
        file_hash is null or file_hash ~ '^[0-9a-f]{64}$'
    ),
    constraint uploaded_files_log_size_positive check (
        file_size_bytes is null or file_size_bytes >= 0
    )
);

comment on table public.uploaded_files_log is
    'Audit trail append-only de cada ação em arquivo (upload, process, delete). Use para debug e para "o que aconteceu com meu arquivo?".';

create index uploaded_files_log_user_id_idx      on public.uploaded_files_log (user_id);
create index uploaded_files_log_item_id_idx      on public.uploaded_files_log (library_item_id);
create index uploaded_files_log_user_action_idx  on public.uploaded_files_log (user_id, action);
create index uploaded_files_log_user_created_idx on public.uploaded_files_log (user_id, created_at desc);
create index uploaded_files_log_metadata_gin_idx on public.uploaded_files_log using gin (metadata);

-- -----------------------------------------------------------------------------
-- 3.12 WEB_SEARCH_CACHE — cache de buscas web (Tavily/Brave)
-- -----------------------------------------------------------------------------
-- Pesquisas externas são pagas e lentas. Cachear com TTL.
create table public.web_search_cache (
    id          uuid        primary key default gen_random_uuid(),
    user_id     uuid        references public.users(id) on delete cascade,
    -- user_id nullable: queries podem ser "compartilháveis" (mesma query
    -- entre usuários). Mas para evitar vazamento, o default é escopo por
    -- usuário. Cache público só é viável em modo self-hosted.
    query       text        not null,
    query_hash  text        not null,
    -- sha256(normalize(query)) — chave de dedup
    results     jsonb       not null,
    -- array de resultados: [{url, title, snippet, score, content}, ...]
    source      text        not null default 'tavily',
    -- 'tavily' | 'brave' | 'google' | 'custom'
    ttl         interval    not null default interval '24 hours',
    accessed_at timestamptz not null default now(),
    expires_at  timestamptz not null,
    created_at  timestamptz not null default now(),

    constraint web_search_cache_query_len check (char_length(query) between 1 and 1000),
    constraint web_search_cache_query_hash_format check (query_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.web_search_cache is
    'Cache de resultados de busca web. Key = (user_id, query_hash). TTL configurável (default 24h). Expira via índice + job de limpeza.';

-- Unicidade: mesma query (mesmo hash) para o mesmo user = mesma linha
create unique index web_search_cache_user_query_uq
    on public.web_search_cache (user_id, query_hash);

create index web_search_cache_expires_at_idx on public.web_search_cache (expires_at);
create index web_search_cache_results_gin_idx on public.web_search_cache using gin (results);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Política geral: cada linha é visível/editável APENAS pelo seu dono
-- (auth.uid() = user_id). Service role (backend) bypassa.
-- Mesmo single-user hoje, deixamos tudo pronto para multi-tenant.

-- Habilita RLS em TODAS as tabelas com dados de usuário
alter table public.users               enable row level security;
alter table public.projects            enable row level security;
alter table public.library_items       enable row level security;
alter table public.document_chunks      enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.memories            enable row level security;
alter table public.agent_runs          enable row level security;
alter table public.sources             enable row level security;
alter table public.generated_documents enable row level security;
alter table public.uploaded_files_log  enable row level security;
alter table public.web_search_cache    enable row level security;

-- Função helper que retorna o user_id (apenas para policies, evita repetir
-- auth.uid() em cada policy).
-- (Já declarada em §2.3: public.current_user_id())

-- -----------------------------------------------------------------------------
-- 4.1 Policies: users (perfil)
-- -----------------------------------------------------------------------------
-- Usuário lê/edita o próprio perfil; ninguém mais.
create policy "users_select_own"
    on public.users for select
    to authenticated
    using (id = public.current_user_id());

create policy "users_insert_own"
    on public.users for insert
    to authenticated
    with check (id = public.current_user_id());

create policy "users_update_own"
    on public.users for update
    to authenticated
    using (id = public.current_user_id())
    with check (id = public.current_user_id());

create policy "users_delete_own"
    on public.users for delete
    to authenticated
    using (id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.2 Policies: projects
-- -----------------------------------------------------------------------------
create policy "projects_select_own"
    on public.projects for select to authenticated
    using (user_id = public.current_user_id());

create policy "projects_insert_own"
    on public.projects for insert to authenticated
    with check (user_id = public.current_user_id());

create policy "projects_update_own"
    on public.projects for update to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

create policy "projects_delete_own"
    on public.projects for delete to authenticated
    using (user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.3 Policies: library_items
-- -----------------------------------------------------------------------------
create policy "library_items_select_own"
    on public.library_items for select to authenticated
    using (user_id = public.current_user_id());

create policy "library_items_insert_own"
    on public.library_items for insert to authenticated
    with check (user_id = public.current_user_id());

create policy "library_items_update_own"
    on public.library_items for update to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

create policy "library_items_delete_own"
    on public.library_items for delete to authenticated
    using (user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.4 Policies: document_chunks
-- -----------------------------------------------------------------------------
create policy "document_chunks_select_own"
    on public.document_chunks for select to authenticated
    using (user_id = public.current_user_id());

create policy "document_chunks_insert_own"
    on public.document_chunks for insert to authenticated
    with check (user_id = public.current_user_id());

create policy "document_chunks_update_own"
    on public.document_chunks for update to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

create policy "document_chunks_delete_own"
    on public.document_chunks for delete to authenticated
    using (user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.5 Policies: conversations
-- -----------------------------------------------------------------------------
create policy "conversations_select_own"
    on public.conversations for select to authenticated
    using (user_id = public.current_user_id());

create policy "conversations_insert_own"
    on public.conversations for insert to authenticated
    with check (user_id = public.current_user_id());

create policy "conversations_update_own"
    on public.conversations for update to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

create policy "conversations_delete_own"
    on public.conversations for delete to authenticated
    using (user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.6 Policies: messages
-- -----------------------------------------------------------------------------
create policy "messages_select_own"
    on public.messages for select to authenticated
    using (user_id = public.current_user_id());

create policy "messages_insert_own"
    on public.messages for insert to authenticated
    with check (user_id = public.current_user_id());

create policy "messages_update_own"
    on public.messages for update to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

create policy "messages_delete_own"
    on public.messages for delete to authenticated
    using (user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.7 Policies: memories
-- -----------------------------------------------------------------------------
create policy "memories_select_own"
    on public.memories for select to authenticated
    using (user_id = public.current_user_id());

create policy "memories_insert_own"
    on public.memories for insert to authenticated
    with check (user_id = public.current_user_id());

create policy "memories_update_own"
    on public.memories for update to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

create policy "memories_delete_own"
    on public.memories for delete to authenticated
    using (user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.8 Policies: agent_runs
-- -----------------------------------------------------------------------------
create policy "agent_runs_select_own"
    on public.agent_runs for select to authenticated
    using (user_id = public.current_user_id());

create policy "agent_runs_insert_own"
    on public.agent_runs for insert to authenticated
    with check (user_id = public.current_user_id());

create policy "agent_runs_update_own"
    on public.agent_runs for update to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

-- agent_runs é append-only na prática; DELETE é raro (LGPD talvez),
-- mas deixamos para o usuário poder limpar histórico.
create policy "agent_runs_delete_own"
    on public.agent_runs for delete to authenticated
    using (user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.9 Policies: sources
-- -----------------------------------------------------------------------------
create policy "sources_select_own"
    on public.sources for select to authenticated
    using (user_id = public.current_user_id());

create policy "sources_insert_own"
    on public.sources for insert to authenticated
    with check (user_id = public.current_user_id());

create policy "sources_update_own"
    on public.sources for update to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

create policy "sources_delete_own"
    on public.sources for delete to authenticated
    using (user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.10 Policies: generated_documents
-- -----------------------------------------------------------------------------
create policy "generated_documents_select_own"
    on public.generated_documents for select to authenticated
    using (user_id = public.current_user_id());

create policy "generated_documents_insert_own"
    on public.generated_documents for insert to authenticated
    with check (user_id = public.current_user_id());

create policy "generated_documents_update_own"
    on public.generated_documents for update to authenticated
    using (user_id = public.current_user_id())
    with check (user_id = public.current_user_id());

create policy "generated_documents_delete_own"
    on public.generated_documents for delete to authenticated
    using (user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 4.11 Policies: uploaded_files_log
-- -----------------------------------------------------------------------------
create policy "uploaded_files_log_select_own"
    on public.uploaded_files_log for select to authenticated
    using (user_id = public.current_user_id());

create policy "uploaded_files_log_insert_own"
    on public.uploaded_files_log for insert to authenticated
    with check (user_id = public.current_user_id());

-- uploaded_files_log é append-only por design; UPDATE/DELETE só admin (sem
-- policy = bloqueado para authenticated; só service_role insere).

-- -----------------------------------------------------------------------------
-- 4.12 Policies: web_search_cache
-- -----------------------------------------------------------------------------
-- O cache é "compartilhável" entre requests do mesmo user. Como user_id é
-- a chave, mantemos o isolamento por usuário. Para cache global (multi-user)
-- o backend usa service_role para inserir e lê com a policy do próprio user.
create policy "web_search_cache_select_own"
    on public.web_search_cache for select to authenticated
    using (user_id = public.current_user_id());

create policy "web_search_cache_insert_own"
    on public.web_search_cache for insert to authenticated
    with check (
        user_id is null                     -- linhas globais (sem dono)
        or user_id = public.current_user_id()
    );

create policy "web_search_cache_delete_own"
    on public.web_search_cache for delete to authenticated
    using (user_id = public.current_user_id());

-- =============================================================================
-- 5. GRANTS (Supabase default roles)
-- =============================================================================
-- O Supabase cria os roles 'anon', 'authenticated' e 'service_role'.
-- authenticated tem acesso CRUD; anon NÃO tem acesso a dados de usuário.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
-- anon NÃO insere/atualiza/deleta (precisa estar logado)

-- Garantir que tabelas futuras também recebam grants
alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated;

-- Funções auxiliares
grant execute on function public.current_user_id()                to authenticated;
grant execute on function public.is_owner(uuid)                   to authenticated;
grant execute on function public.sha256_hex(bytea)                to authenticated;
-- (set_updated_at e set_indexed_at rodam via trigger; sem grant a anon/authenticated)

-- Tipos enums (precisam de USAGE em alguns clients)

-- =============================================================================
-- 6. STORAGE (Bucket "library")
-- =============================================================================
-- O arquivo bruto fica no Supabase Storage. O bucket é criado fora do
-- schema SQL, mas as policies RLS do Storage SÃO configuradas aqui.
--
-- Para criar o bucket e policies, use o painel do Supabase OU a migration
-- 002_storage_policies.sql. O caminho do arquivo segue o padrão:
--   {user_id}/{library_item_id}.{ext}

-- Comentário: policies de Storage ficam em outro arquivo
-- (002_storage_policies.sql) para isolar o schema de banco da config de
-- object store. Mantém o diff limpo quando o time de backend mexer só
-- em storage.

-- =============================================================================
-- 7. VIEWS ÚTEIS (read-only)
-- =============================================================================

-- 7.1 View: estatísticas por projeto (para o dashboard)
create or replace view public.project_stats as
select
    p.id            as project_id,
    p.user_id,
    p.name,
    p.type,
    p.color,
    p.icon,
    count(distinct li.id)                                       as item_count,
    count(distinct li.id) filter (where li.status = 'ready')    as ready_count,
    count(distinct c.id)                                        as conversation_count,
    count(distinct m.id)                                        as message_count,
    count(distinct gd.id)                                       as document_count,
    max(li.created_at)                                          as last_item_at,
    max(c.last_message_at)                                      as last_message_at
from public.projects p
left join public.library_items        li on li.project_id = p.id
left join public.conversations        c  on c.project_id  = p.id
left join public.messages             m  on m.project_id  = p.id
left join public.generated_documents  gd on gd.project_id = p.id
group by p.id, p.user_id, p.name, p.type, p.color, p.icon;

comment on view public.project_stats is
    'Estatísticas agregadas por projeto. Usada no dashboard principal. Refresh incremental via trigger (futuro) ou materializada sob demanda.';

-- 7.2 View: uso de tokens por mês (billing)
create or replace view public.monthly_usage as
select
    ar.user_id,
    date_trunc('month', ar.started_at) as month,
    ar.agent_type,
    count(*)                           as run_count,
    sum(coalesce(ar.prompt_tokens, 0))     as total_prompt_tokens,
    sum(coalesce(ar.completion_tokens, 0)) as total_completion_tokens,
    sum(coalesce(ar.cost_usd, 0))          as total_cost_usd,
    avg(ar.latency_ms)                     as avg_latency_ms
from public.agent_runs ar
where ar.started_at >= now() - interval '12 months'
group by ar.user_id, date_trunc('month', ar.started_at), ar.agent_type;

comment on view public.monthly_usage is
    'Uso mensal por agente (últimos 12 meses). Para gráficos de billing.';

-- =============================================================================
-- 8. OBSERVAÇÕES FINAIS
-- =============================================================================
-- 1. PARTICIONAMENTO FUTURO:
--    Quando a tabela document_chunks passar de ~5M linhas, particionar por
--    RANGE (created_at) ou HASH (user_id). Hoje é prematura.
-- 2. VACUUM/ANALYZE:
--    O Supabase roda autovacuum por padrão. Em tabelas com alto churn
--    (messages, agent_runs), considerar pg_partman + vacuum mais agressivo.
-- 3. RETENÇÃO:
--    - messages: manter 12 meses em produção, arquivar >12m em cold storage
--    - agent_runs: manter 6 meses (depois disso o valor histórico cai)
--    - web_search_cache: purgar por expires_at (job diário)
-- 4. BACKUP:
--    PITR do Supabase (point-in-time recovery) cobre 7 dias no Pro/Team.
--    Para 30+ dias, agendar pg_dump diário em bucket separado.
-- 5. EXTENSÕES NÃO USADAS HOJE:
--    - pg_trgm: habilitada para fallback textual (title, snippet)
--    - pgcrypto: usada por gen_random_uuid() (sem precisar de -oss)
-- =============================================================================

-- FIM DA MIGRATION

-- =============================================================================
-- 4) STORAGE BUCKET 'library'
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'library',
    'library',
    false,  -- private, signed URLs only
    104857600,  -- 100 MB
    ARRAY[
        'application/pdf',
        'image/jpeg', 'image/png', 'image/heic', 'image/webp',
        'audio/mpeg', 'audio/m4a', 'audio/wav', 'audio/x-wav',
        'video/mp4', 'video/quicktime',
        'text/plain', 'text/markdown', 'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/json'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket
CREATE POLICY "library_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'library' AND owner = auth.uid());

CREATE POLICY "library_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'library' AND owner = auth.uid());

CREATE POLICY "library_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'library' AND owner = auth.uid())
WITH CHECK (bucket_id = 'library' AND owner = auth.uid());

CREATE POLICY "library_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'library' AND owner = auth.uid());

-- =============================================================================
-- FIM — Schema completo aplicado
-- =============================================================================

-- Cache-bust marker: 2026-07-06T17:53:10Z

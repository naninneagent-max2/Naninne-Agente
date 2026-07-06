# SPRINT 0 — Deliverable: Supabase Setup

> **Status**: ✅ Completo (com fallback local — Docker indisponível neste sandbox)
> **Data**: 2026-07-06
> **Owner**: Coder (DBA / DevOps do Naninne)

---

## TL;DR

- ✅ 12 tabelas criadas em `public`, todas com RLS habilitado
- ✅ Índice HNSW em `document_chunks.embedding` (vector_cosine_ops, m=16, ef_construction=64)
- ✅ Índice HNSW adicional em `memories.embedding` (m=16, ef_construction=32)
- ✅ 45 RLS policies distribuídas pelas 12 tabelas (4 por tabela, exceto
  `uploaded_files_log` que é append-only com 2 policies, e `web_search_cache`
  com 3)
- ✅ Storage bucket `library` criado (privado, 100MB, 13 MIME types, 5 RLS policies)
- ✅ 4 projects seed com cores/ícones do design system
- ✅ 1 usuário de teste (`seed@naninne.local`) + perfil em `public.users`
- ✅ 16/16 checagens automatizadas passam (`/workspace/supabase/verify.sh`)

---

## 1. Status do setup: FALLBACK LOCAL (sem Docker)

### Por que fallback?

O sandbox onde o agente roda **não tem Docker instalado**:
```
$ which docker
/bin/bash: line 3: docker: command not found
```

Como alternativa, usei:
- **Postgres 15** já disponível no sandbox (`apt: postgresql-15, 15.18`)
- **pgvector 0.7.4** já instalado em `/usr/share/postgresql/15/extension/`
- Criei um **shim do Supabase Lite** que recria o mínimo necessário:
  - Schema `auth` (com tabela `auth.users` + funções `auth.uid()`, `auth.role()`,
    `auth.email()`)
  - Roles `anon`, `authenticated`, `service_role` (com `bypassrls` no
    `service_role`)

### 3 diferenças (portabilidade) entre o port local e o schema original

1. **search_path** — prepended `set search_path = "$user", public, extensions;`
   no início da migration 0001. Necessário porque `vector(1536)`, `digest()` e
   `gin_trgm_ops` ficam no schema `extensions` em vez de `public`.

2. **`sha256_hex` qualifica `digest()`** como `extensions.digest(...)` —
   imutável ao search_path, funciona em qualquer ambiente.

3. **`GRANT USAGE ON ALL TYPES`** substituído por loop DO que itera os
   enums e faz grant individual. `ALL TYPES IN SCHEMA` é PG 16+.

**Schema original `docs/schema-supabase.sql` ficou INTACTO** (a restrição
do task: "Não modifique o schema-supabase.sql original sem documentar
a mudança"). As mudanças foram aplicadas na cópia em
`/workspace/supabase/migrations/00000000000001_init.sql`.

Detalhes completos em [`/workspace/supabase/LOCAL-PORT-NOTES.md`](./LOCAL-PORT-NOTES.md).

---

## 2. As 4 migrations aplicadas

| # | Arquivo | Linhas | Função |
|---|---|---|---|
| 0 | `00000000000000_supabase_lite_setup.sql` | 110 | Shim: schema `auth`, roles, extensões, `auth.uid()`, grants |
| 1 | `00000000000001_init.sql` | 1147 | Schema principal (12 tabelas + 76 indexes + 45 policies + 8 triggers + 2 views) |
| 2 | `00000000000002_seed_dev.sql` | 130 | Seed: 1 user + perfil + 4 projects |
| 3 | `00000000000003_storage_bucket.sql` | 156 | Storage local-port: bucket "library" + 5 policies |

Apliquei em sequência com `psql -v ON_ERROR_STOP=1 -f ...`. **Zero erros**.

---

## 3. As 12 tabelas criadas

```
 public     | agent_runs          | t
 public     | conversations       | t
 public     | document_chunks     | t   ⭐ HNSW index aqui
 public     | generated_documents | t
 public     | library_items       | t
 public     | memories            | t   ⭐ HNSW index aqui também
 public     | messages            | t
 public     | projects            | t
 public     | sources             | t
 public     | uploaded_files_log  | t
 public     | users               | t
 public     | web_search_cache    | t
```

**Todas com `rowsecurity = t`** (RLS ativo).

---

## 4. Indexes criados (76 no total)

### Destaque: HNSW vetorial

**`document_chunks_embedding_hnsw_idx`** (HNSW principal):
```sql
CREATE INDEX document_chunks_embedding_hnsw_idx
    ON public.document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

**`memories_embedding_hnsw_idx`** (HNSW secundário, ef_construction menor):
```sql
CREATE INDEX memories_embedding_hnsw_idx
    ON public.memories
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 32);
```

### Resumo por categoria

| Categoria | Quantidade |
|---|---|
| **HNSW (vetorial)** | **2** (document_chunks + memories) |
| **B-tree únicos (PKs)** | 12 |
| **B-tree únicos (constraints)** | 5 (ex: `projects_user_slug_uq`, `library_items_user_hash_uq`) |
| **B-tree não-únicos** | ~45 (índices secundários por user_id, project_id, etc) |
| **GIN (JSONB / trgm)** | ~12 (metadata, sources, title, snippet) |
| **TOTAL** | **76** |

---

## 5. RLS Policies (45 total)

| Tabela | Policies | Notas |
|---|---|---|
| `users` | 4 | SELECT / INSERT / UPDATE / DELETE (só o próprio user) |
| `projects` | 4 | idem |
| `library_items` | 4 | idem |
| `document_chunks` | 4 | idem |
| `conversations` | 4 | idem |
| `messages` | 4 | idem |
| `memories` | 4 | idem |
| `agent_runs` | 4 | idem |
| `sources` | 4 | idem |
| `generated_documents` | 4 | idem |
| `uploaded_files_log` | 2 | SELECT (próprio) + INSERT (próprio) — append-only, sem UPDATE/DELETE |
| `web_search_cache` | 3 | SELECT (próprio) + INSERT (próprio OU global) + DELETE (próprio) |
| **TOTAL** | **45** | |

Todas com `to authenticated` e predicado `id = public.current_user_id()` ou
`user_id = public.current_user_id()`.

### Storage policies (5)

```
 storage    | buckets_local | buckets_local_select_authenticated | SELECT
 storage    | objects_local | objects_local_delete_own           | DELETE
 storage    | objects_local | objects_local_insert_own           | INSERT
 storage    | objects_local | objects_local_select_own           | SELECT
 storage    | objects_local | objects_local_update_own           | UPDATE
```

Sintaxe **idêntica** à que o Supabase Cloud usa em `storage.objects`. Para
migrar para Cloud, basta trocar a referência à tabela.

---

## 6. Storage bucket "library"

```
   id    |  name   | public | file_size_limit | mime_count 
---------+---------+--------+-----------------+------------
 library | library | f      |       104857600 |         13
```

- **Privado** (signed URLs)
- **100 MB** de limite por arquivo
- **13 MIME types** permitidos:
  - `application/pdf`
  - `image/jpeg`, `image/png`, `image/heic`
  - `audio/mpeg`, `audio/m4a`, `audio/wav`
  - `video/mp4`, `video/quicktime`
  - `text/plain`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
  - `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)

### RLS policies (5)

Cada user só lê/escreve/deleta **seus próprios arquivos** (path
`{user_id}/{library_item_id}.{ext}`, primeira pasta do path = `auth.uid()`).

A versão Supabase Cloud está em
[`/workspace/supabase/storage-bucket-cloud.sql`](./storage-bucket-cloud.sql)
(pronta para `npx supabase db execute` ou Studio SQL Editor).

---

## 7. 4 projects seed

```
    slug     |       name       |  color  |    icon    |    type     
-------------+------------------+---------+------------+-------------
 escrita     | Escrita Criativa | #3B82F6 | BookOpen   | escrita
 audiovisual | Audiovisual      | #F97316 | Film       | audiovisual
 mercado     | Mercado          | #10B981 | TrendingUp | mercado
 tech        | Tech             | #64748B | Wrench     | tech
```

UUIDs fixos (facilitam o frontend):

| Slug | UUID | Cor | Ícone |
|---|---|---|---|
| `escrita` | `11111111-1111-1111-1111-111111111111` | `#3B82F6` (azul) | `BookOpen` |
| `audiovisual` | `22222222-2222-2222-2222-222222222222` | `#F97316` (laranja) | `Film` |
| `mercado` | `33333333-3333-3333-3333-333333333333` | `#10B981` (verde) | `TrendingUp` |
| `tech` | `44444444-4444-4444-4444-444444444444` | `#64748B` (cinza-azulado) | `Wrench` |

Cores e ícones vêm do `/workspace/docs/design-system.md`.

---

## 8. Usuário de teste (seed)

| Item | Valor |
|---|---|
| **Email** | `seed@naninne.local` |
| **UUID** | `00000000-0000-0000-0000-000000000001` (fixo) |
| **Role** | `authenticated` |
| **Display name** | `Seed User` |
| **Locale** | `pt-BR` |
| **Timezone** | `America/Sao_Paulo` |
| **Theme** | `dark` |
| **Senha** | placeholder (`$2a$10$placeholder...`) — em produção, GoTrue gerencia |

---

## 9. Queries de verificação (com output)

Todas em [`/workspace/supabase/verify.sh`](./verify.sh) (16 checks automatizados).
**Resultado atual: 16/16 ✅**.

### Output completo (resumo)

```
→ 1. 12 tabelas em public          ✅
→ 2. RLS = true em todas           ✅ (12/12)
→ 3. HNSW em document_chunks       ✅
→ 4. HNSW em memories              ✅
→ 5. Extensão vector instalada     ✅ (v0.7.4)
→ 6. Bucket library registrado     ✅
→ 7. Bucket library privado        ✅ (public=false)
→ 8. Bucket library 100MB          ✅ (104857600 bytes)
→ 9. Bucket library 13 mimes       ✅
→ 10. 4 projects seed              ✅
→ 11. Cores dos 4 projects         ✅
→ 12. 1 user em auth.users         ✅
→ 13. 1 perfil em public.users     ✅
→ 14. Policies em todas tabelas    ✅ (0 tabelas sem policy)
→ 15. Função auth.uid() existe     ✅
→ 16. RLS isola entre users        ✅ (seed=4, other=0, anon=0)

RESULTADO: 16 ✅ / 0 ❌
```

### Como re-verificar

```bash
/workspace/supabase/verify.sh
```

---

## 10. Como o frontend vai conectar

### Variáveis de ambiente (`.env.local` do Next.js)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # BACKEND ONLY
```

### Conexão browser

```ts
import { createBrowserClient } from '@supabase/ssr';
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Conexão server-side (API routes, Server Components)

```ts
import { createServerClient } from '@supabase/ssr';
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { ... } }   // cookies do Next.js
);
```

### Conexão backend (Python/LangGraph — bypassa RLS)

```python
from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` NUNCA vai pro frontend — bypassa RLS.
> Só use em backend (LangGraph nodes, API routes autenticadas) após validar o user.

---

## 11. Limitações conhecidas

1. **Fallback local sem Storage API real**:
   - Bucket é simulado em `storage.buckets_local`.
   - Binários vão em `/workspace/supabase/storage/library/{user_id}/{item_id}.{ext}`.
   - Em Cloud/Docker, Supabase Storage API funciona normalmente.

2. **Fallback local sem GoTrue**:
   - Signup/login real não funciona.
   - `auth.uid()` lê de `request.jwt.claim.sub` (config manual via `set_config`).
   - Senha do user seed é placeholder.

3. **HNSW tuning conservador**:
   - `ef_construction=64` é o default seguro.
   - Em produção com >100k chunks, considerar 128 (build mais lento, recall melhor).
   - `ef_search` é runtime (configurável por query).

4. **Sem rate limiting no storage**:
   - Bucket aceita qualquer número de uploads até 100MB.
   - Em produção, considerar RLS com quota via função `public.user_storage_used()`.

5. **Sem particionamento**:
   - `document_chunks` e `messages` vão crescer muito.
   - Particionar por RANGE(created_at) ou HASH(user_id) quando passarem de 5M
     linhas (decisão Sprint 2+).

6. **Storage RLS no Cloud precisa ajustar se mudar path convention**:
   - Assume `{user_id}/{item_id}.{ext}` como path.
   - Se a app usar paths diferentes (ex: `{user_id}/{project_id}/{item_id}.{ext}`),
     ajustar a policy de `(storage.foldername(name))[1]` para `[2]`, etc.

---

## 12. Próximo passo (Sprint 1)

1. **Upload + chunking + embedding** (LangGraph worker `bibliotecario`):
   - Worker recebe arquivo do Storage.
   - Detecta MIME, escolhe parser (PyPDFLoader, Whisper, etc).
   - Chunks semânticos (~500 tokens, overlap 50).
   - Embedding via OpenAI `text-embedding-3-small` (1536 dims).
   - Persiste em `document_chunks` + atualiza `library_items.status='ready'`.
   - Trigger `library_items_set_indexed_at` seta `indexed_at=now()`.

2. **Storage upload com signed URL**:
   - Frontend pede URL signed, backend valida e gera.
   - Path: `{user_id}/{library_item_id}.{ext}` (convenção das policies RLS).

3. **Camada Mem0** (extração de fatos do usuário após cada conversa):
   - Worker assíncrono processa `messages.content`.
   - Persiste em `memories` com `confidence` e `embedding`.
   - Trigger `memories_set_updated_at` mantém `updated_at`.

4. **Frontend**:
   - Tela de upload (drag-and-drop) com barra de progresso.
   - Listagem da Biblioteca Universal com busca textual (trgm) + semântica (HNSW).
   - Filtro por project (4 colors) vindo do seed.

---

## 13. Arquivos modificados / criados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `/workspace/supabase/migrations/00000000000000_supabase_lite_setup.sql` | **CRIADO** | Shim Supabase Lite (auth schema, roles, auth.uid) |
| `/workspace/supabase/migrations/00000000000001_init.sql` | **CRIADO** (cópia + 3 ajustes de port) | Schema principal (12 tabelas, 76 indexes, 45 policies) |
| `/workspace/supabase/migrations/00000000000002_seed_dev.sql` | **CRIADO** | Seed: 1 user + 4 projects |
| `/workspace/supabase/migrations/00000000000003_storage_bucket.sql` | **CRIADO** | Storage local-port: bucket library + 5 policies |
| `/workspace/supabase/storage-bucket-cloud.sql` | **CRIADO** | Storage SQL para Supabase Cloud (storage.objects policies) |
| `/workspace/supabase/storage/library/00000000-.../.gitkeep` | CRIADO | Pasta do user seed no storage local |
| `/workspace/supabase/verify.sh` | **CRIADO** | 16 checagens automatizadas (pass/fail) |
| `/workspace/supabase/README.md` | **CRIADO** | Documentação principal (subir, resetar, credenciais, env vars) |
| `/workspace/supabase/LOCAL-PORT-NOTES.md` | **CRIADO** | Diferenças entre o schema original e o port local |
| `/workspace/supabase/SPRINT0-deliverable.md` | **CRIADO** | Este arquivo |
| `/workspace/docs/schema-supabase.sql` | **NÃO MODIFICADO** | Original preservado (a restrição do task) |

---

## 14. Comandos para reproduzir

```bash
# 1. Subir Postgres
pg_ctlcluster 15 main start

# 2. Criar database
su postgres -c "psql -c \"DROP DATABASE IF EXISTS naninne;\""
su postgres -c "psql -c \"CREATE DATABASE naninne OWNER postgres;\""

# 3. Aplicar migrations (em ordem)
for f in /workspace/supabase/migrations/0000*.sql \
         /workspace/supabase/migrations/0001*.sql \
         /workspace/supabase/migrations/0002*.sql \
         /workspace/supabase/migrations/0003*.sql; do
  su postgres -c "psql -d naninne -v ON_ERROR_STOP=1 -f $f"
done

# 4. Verificar
/workspace/supabase/verify.sh
```

Tempo total: ~5s (migrations) + 1s (verify).

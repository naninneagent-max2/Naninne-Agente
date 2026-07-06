# Supabase — Banco do Naninne (Sprint 0)

Setup do banco de dados do Naninne: schema, RLS, indexes vetoriais (HNSW),
storage bucket e seeds.

---

## TL;DR

```bash
# 1. Subir Postgres 15 local (já está rodando neste sandbox)
pg_ctlcluster 15 main start

# 2. Criar database fresh e aplicar migrations
su postgres -c "psql -c \"DROP DATABASE IF EXISTS naninne;\""
su postgres -c "psql -c \"CREATE DATABASE naninne OWNER postgres;\""
for f in /workspace/supabase/migrations/0000*.sql \
         /workspace/supabase/migrations/0001*.sql \
         /workspace/supabase/migrations/0002*.sql \
         /workspace/supabase/migrations/0003*.sql; do
  su postgres -c "psql -d naninne -v ON_ERROR_STOP=1 -f $f"
done

# 3. Verificar (16 checks)
/workspace/supabase/verify.sh
```

Em **Supabase Cloud** ou via `npx supabase start` (Docker, em ambiente
com Docker), use o schema original sem modificações:

```bash
# No projeto conectado ao Supabase Cloud
npx supabase init                 # gera config.toml
cp /workspace/docs/schema-supabase.sql supabase/migrations/00000000000001_init.sql
npx supabase db push              # aplica migrations
# Cria bucket via Dashboard OU supabase-cli:
npx supabase storage create library --public=false
# Aplica policies de storage (storage-bucket-cloud.sql):
npx supabase db execute -f /workspace/supabase/storage-bucket-cloud.sql
# Aplica seed:
npx supabase db execute -f /workspace/supabase/migrations/00000000000002_seed_dev.sql
```

---

## Estrutura de arquivos

```
/workspace/supabase/
├── README.md                        # este arquivo
├── LOCAL-PORT-NOTES.md              # diferenças entre schema original e o port local
├── verify.sh                        # 16 checagens automáticas (✅/❌)
├── storage-bucket-cloud.sql         # SQL de policies de storage para Supabase Cloud
├── migrations/
│   ├── 00000000000000_supabase_lite_setup.sql   # shim p/ Supabase Lite (auth, roles)
│   ├── 00000000000001_init.sql                 # schema principal (port de schema-supabase.sql)
│   ├── 00000000000002_seed_dev.sql             # seed: 1 user + 4 projects
│   └── 00000000000003_storage_bucket.sql       # bucket library + RLS (local-port)
└── storage/                         # fallback local p/ arquivos (em Cloud, é o Supabase Storage)
    └── library/
        └── 00000000-0000-0000-0000-000000000001/   # arquivos do user seed
```

---

## Como subir o ambiente (do zero)

### Opção A — Supabase Cloud (produção)

Pré-requisitos:
- Conta em https://supabase.com
- `npx supabase` CLI instalado (`npm i -g supabase`)
- Variáveis de ambiente:
  ```bash
  export SUPABASE_ACCESS_TOKEN=<seu-token>
  export SUPABASE_PROJECT_REF=<ref-do-projeto>
  export SUPABASE_DB_PASSWORD=<senha-do-banco>
  ```

Setup:
```bash
cd /workspace
npx supabase init
# Copia o schema original (sem modificações)
cp /workspace/docs/schema-supabase.sql supabase/migrations/00000000000001_init.sql
# Conecta ao projeto Cloud
npx supabase link --project-ref $SUPABASE_PROJECT_REF
# Aplica
npx supabase db push
# Cria o bucket
npx supabase storage create library --public=false
# Aplica as policies de storage + seed
npx supabase db execute -f /workspace/supabase/storage-bucket-cloud.sql
npx supabase db execute -f /workspace/supabase/migrations/00000000000002_seed_dev.sql
```

### Opção B — Docker local (desenvolvimento com Supabase completo)

Pré-requisitos:
- Docker + Docker Compose
- `npx supabase` CLI

Setup:
```bash
cd /workspace
mkdir -p supabase
cd supabase
npx supabase init
# Copia o schema
cp /workspace/docs/schema-supabase.sql migrations/00000000000001_init.sql
# Sobe o stack
npx supabase start
# Aplica as migrations
npx supabase db reset
# Cria o bucket
npx supabase storage create library --public=false
# Aplica as policies de storage + seed
psql "$(npx supabase status --output env | grep DB_URL | cut -d= -f2- | tr -d \"")" \
  -f /workspace/supabase/storage-bucket-cloud.sql
psql "$(npx supabase status --output env | grep DB_URL | cut -d= -f2- | tr -d \"")" \
  -f /workspace/supabase/migrations/00000000000002_seed_dev.sql
```

Serviços que sobem:
- **Postgres** (54322) — banco principal
- **GoTrue** (54324) — auth (signup, login, JWT)
- **Storage** (54325) — S3-compatible object store
- **Realtime** (54326) — websocket subscriptions
- **Studio** (54323) — UI web: http://localhost:54323

### Opção C — Fallback local (este sandbox, sem Docker)

Este sandbox **não tem Docker**, então usei Postgres 15 + pgvector 0.7.4
que já estavam disponíveis. Veja [LOCAL-PORT-NOTES.md](./LOCAL-PORT-NOTES.md)
para os 3 ajustes de portabilidade aplicados.

```bash
# 1. Garantir Postgres rodando
pg_ctlcluster 15 main start

# 2. Aplicar 4 migrations + verificar
for f in /workspace/supabase/migrations/0000*.sql \
         /workspace/supabase/migrations/0001*.sql \
         /workspace/supabase/migrations/0002*.sql \
         /workspace/supabase/migrations/0003*.sql; do
  su postgres -c "psql -d naninne -v ON_ERROR_STOP=1 -f $f"
done
/workspace/supabase/verify.sh
```

---

## Como resetar o banco

```bash
# Supabase Cloud ou Docker local
npx supabase db reset

# Fallback local
su postgres -c "psql -c 'DROP DATABASE IF EXISTS naninne;'"
su postgres -c "psql -c 'CREATE DATABASE naninne OWNER postgres;'"
for f in /workspace/supabase/migrations/0000*.sql \
         /workspace/supabase/migrations/0001*.sql \
         /workspace/supabase/migrations/0002*.sql \
         /workspace/supabase/migrations/0003*.sql; do
  su postgres -c "psql -d naninne -v ON_ERROR_STOP=1 -f $f"
done
```

---

## Credenciais padrão (desenvolvimento)

### Fallback local (este sandbox)

| Item | Valor |
|---|---|
| **Postgres host** | `/var/run/postgresql` (socket Unix) |
| **Postgres port** | 5432 |
| **Database** | `naninne` |
| **Owner** | `postgres` (superuser, bypassa RLS — usar para migrations) |
| **Roles auxiliares** | `anon`, `authenticated`, `service_role` (sem senha, RLS enforced) |
| **Seed user** | `seed@naninne.local` (UUID `00000000-0000-0000-0000-000000000001`) |

> ⚠️ O seed user tem senha placeholder. Não dá pra fazer login real (sem
> GoTrue no fallback local). Para testar RLS, use:
> ```sql
> SET ROLE authenticated;
> SELECT set_config('request.jwt.claim.sub',
>     '00000000-0000-0000-0000-000000000001', false);
> -- agora suas queries respeitam o RLS desse user
> RESET ROLE;
> ```

### Supabase Cloud / Docker local

| Item | Como obter |
|---|---|
| **Project URL** | `npx supabase status` → `API URL` (ou Dashboard → Settings → API) |
| **anon key** | `npx supabase status` → `anon key` (frontend público) |
| **service_role key** | `npx supabase status` → `service_role key` (backend, bypassa RLS) |
| **JWT secret** | `npx supabase status` → `JWT_SECRET` |

> ⚠️ O `service_role key` NUNCA deve ir pro frontend — bypassa RLS!

---

## Como criar uma nova migration

1. **Cloud / Docker**: `npx supabase migration new <nome>` → cria arquivo em
   `supabase/migrations/<timestamp>_<nome>.sql`. Edite e rode `npx supabase db reset`.

2. **Fallback local**: criar `supabase/migrations/<timestamp>_<nome>.sql`
   manualmente. Aplicar:
   ```bash
   su postgres -c "psql -d naninne -v ON_ERROR_STOP=1 -f supabase/migrations/<arquivo>.sql"
   ```

**Convenção**:
- Nomes em snake_case, descritivos (`00000000000005_add_notifications.sql`).
- Cada migration deve ser **idempotente** quando possível (`create ... if not exists`,
  `on conflict do nothing`).
- Mudanças destrutivas (DROP, ALTER) devem ser revisadas por 2 pessoas.
- Use `select set_config('request.jwt.claim.sub', '<uuid>', false);` para
  testar policies RLS.

---

## Como aplicar em produção (Supabase Cloud)

```bash
# 1. Conectar ao projeto
npx supabase link --project-ref $SUPABASE_PROJECT_REF

# 2. Aplicar todas as migrations novas
npx supabase db push

# 3. Verificar (via Studio ou SQL Editor)
#    - 12 tabelas com RLS = true
#    - 76 indexes
#    - HNSW em document_chunks e memories
#    - bucket "library" com 13 MIME types

# 4. Aplicar seed (se for ambiente de demo)
npx supabase db execute -f /workspace/supabase/migrations/00000000000002_seed_dev.sql
```

Para aplicar uma migration pontual sem re-rodar tudo:
```bash
npx supabase db execute -f /workspace/supabase/migrations/<arquivo>.sql
```

---

## Como o frontend vai conectar

Variáveis de ambiente (no `.env.local` do Next.js):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # BACKEND ONLY
```

Conexão client-side (browser):
```ts
import { createBrowserClient } from '@supabase/ssr';
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

Conexão server-side (API routes, Server Components):
```ts
import { createServerClient } from '@supabase/ssr';
// usa cookies do Next.js para passar o JWT do user
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { ... } }
);
```

Conexão backend puro (Python/LangGraph — bypassa RLS):
```python
from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

> O service_role key bypassa RLS — só use em código de backend
> (LangGraph nodes, API routes autenticadas) que já validou o user.

---

## Limitações conhecidas

1. **Fallback local sem Storage API**: arquivos não podem ser upados via
   Supabase Storage (não existe neste sandbox). O bucket "library" é
   simulado em `storage.buckets_local` + arquivos em
   `/workspace/supabase/storage/library/`. Em Cloud/Docker, a API real
   funciona normalmente.

2. **Fallback local sem GoTrue**: signup/login real não funciona. O
   `auth.uid()` lê de `request.jwt.claim.sub` (config manual).

3. **HNSW tuning**: `ef_construction=64` é o default seguro. Em produção
   com >100k chunks, considerar `ef_construction=128` (build mais lento,
   recall melhor). `ef_search` é runtime (configurável por query).

4. **Sem rate limiting no storage**: o bucket aceita qualquer número de
   uploads até 100MB. Em produção, considerar RLS mais granular (quota
   por user via função `public.user_storage_used()`).

5. **Sem particionamento**: `document_chunks` e `messages` vão crescer
   muito. Particionar por RANGE(created_at) ou HASH(user_id) quando
   passarem de 5M linhas (decisão Sprint 2+).

6. **Storage RLS no Cloud precisa ajustar**: as policies deste schema usam
   `storage.foldername(name)[1] = auth.uid()::text`. Isso assume o padrão
   `{user_id}/{item_id}.{ext}`. Se a app usar paths diferentes, ajustar.

---

## Próximo passo (Sprint 1)

- Implementar upload + chunking + embedding em LangGraph:
  - Worker `bibliotecario` recebe o arquivo do Storage.
  - Detecta MIME, escolhe parser (PyPDFLoader, Whisper para áudio, etc).
  - Faz chunking semântico (chunks de ~500 tokens com overlap de 50).
  - Gera embedding via OpenAI `text-embedding-3-small` (1536 dims).
  - Persiste em `document_chunks` + atualiza `library_items.status='ready'`.
  - Trigger `library_items_set_indexed_at` seta `indexed_at=now()`.
- Storage:
  - Implementar upload com signed URL (frontend pede URL, backend valida).
  - Path: `{user_id}/{library_item_id}.{ext}` (convenção das policies RLS).
- Mem0:
  - Camada de memórias (extração de fatos do usuário após cada conversa).
- Frontend:
  - Tela de upload (drag-and-drop) com barra de progresso.
  - Listagem da Biblioteca Universal com busca textual + semântica.

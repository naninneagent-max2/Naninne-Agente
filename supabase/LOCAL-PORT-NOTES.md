# LOCAL-PORT-NOTES — Diferenças entre o schema original e o port local

> ⚠️ Este arquivo é **apenas para o fallback local** (Postgres 15 vanilla sem Supabase).
> Em **Supabase Cloud** ou via `supabase start` (Docker), aplique
> `/workspace/docs/schema-supabase.sql` **sem modificação**.

## Contexto

Este sandbox **não tem Docker**. Por isso, em vez de `supabase start` (que
sobe Postgres + GoTrue + Storage + Studio via containers), instalei um
Postgres 15 local já disponível + pgvector 0.7.4 e criei as 4 migrations
abaixo, que fazem o **mesmo trabalho** mas com 3 ajustes de portabilidade.

## As 4 migrations

| Arquivo | Equivalente no Supabase Cloud | Notas |
|---|---|---|
| `00000000000000_supabase_lite_setup.sql` | `npx supabase init` + `npx supabase start` | Cria schema `auth` + roles `anon`/`authenticated`/`service_role` + função `auth.uid()` + extensões. **Não aplicar no Supabase Cloud** (já existe lá). |
| `00000000000001_init.sql` | `docs/schema-supabase.sql` | O schema original, com 3 ajustes de portabilidade (detalhes abaixo). |
| `00000000000002_seed_dev.sql` | Seed manual via Dashboard | Cria o usuário de teste `seed@naninne.local` + perfil + 4 projects. |
| `00000000000003_storage_bucket.sql` | `supabase storage create library` + policies | Cria o bucket "library" no **fallback local** (tabela `storage.buckets_local`). Para Cloud, usar `storage-bucket-cloud.sql`. |

## 3 ajustes no schema original (0001_init.sql)

O `docs/schema-supabase.sql` foi pensado para Supabase Cloud, onde:

1. `search_path` default já inclui `public, extensions`
2. `pgcrypto` (com `digest()`) está em schema acessível
3. PostgreSQL ≥ 16 (com `GRANT USAGE ON ALL TYPES IN SCHEMA`)

Em Postgres 15 vanilla local:

1. **search_path fixo em `"$user", public`**: `vector(1536)`, `gin_trgm_ops`,
   `digest()` não são encontrados sem qualificar o schema.
   **Fix**: prependemos `set search_path = "$user", public, extensions;`
   no início da migration 0001 (linha 28), e `alter database naninne
   set search_path = ...` na 0000 (linha 92) para futuras sessões.

2. **`digest()` no schema extensions**: a função `sha256_hex` chama
   `digest(p_data, 'sha256')`. Como `digest` está em `extensions`, qualificamos
   explicitamente: `extensions.digest(...)` (linha 144 da 0001). Funciona em
   qualquer ambiente.

3. **`GRANT USAGE ON ALL TYPES IN SCHEMA` é PG 16+**: substituímos por um
   loop DO que faz `grant usage on type <each_enum> to authenticated, anon;`
   (linhas 1090-1107 da 0001). Em Supabase Cloud, o original funciona.

## Como aplicar manualmente (sem Supabase CLI)

```bash
# 1. Subir Postgres 15 (já está rodando neste sandbox)
pg_ctlcluster 15 main start

# 2. Criar database
su postgres -c "psql -c \"DROP DATABASE IF EXISTS naninne;\""
su postgres -c "psql -c \"CREATE DATABASE naninne OWNER postgres;\""

# 3. Aplicar as 4 migrations em ordem
for f in /workspace/supabase/migrations/0000*.sql \
         /workspace/supabase/migrations/0001*.sql \
         /workspace/supabase/migrations/0002*.sql \
         /workspace/supabase/migrations/0003*.sql; do
  su postgres -c "psql -d naninne -v ON_ERROR_STOP=1 -f $f"
done

# 4. Verificar
/workspace/supabase/verify.sh
```

## Limitação importante do fallback local

- **Storage API não existe**: `storage.objects` e `storage.buckets` do
  Supabase Cloud não estão disponíveis. Criei `storage.buckets_local` e
  `storage.objects_local` (mesmo schema) com as **mesmas policies RLS**,
  mas o binário do arquivo precisa ser guardado manualmente em
  `/workspace/supabase/storage/library/{user_id}/{item_id}.{ext}`.
- **GoTrue não existe**: o `auth.uid()` é simulado lendo a config
  `request.jwt.claim.sub` (que o GoTrue injeta). Para testar RLS, use
  `SELECT set_config('request.jwt.claim.sub', '<uuid>', false); SET ROLE authenticated;`.
- **Sem signup real**: o usuário `seed@naninne.local` tem senha placeholder
  (`$2a$10$placeholder...`). Em Cloud, signup real é gerenciado pelo GoTrue.

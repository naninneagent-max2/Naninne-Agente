-- =============================================================================
-- Naninne — Storage Bucket "library" (FALLBACK LOCAL)
-- =============================================================================
-- Configuração do bucket para a Biblioteca Universal.
-- Os arquivos brutos (PDFs, áudios, vídeos, imagens, etc.) ficam aqui.
-- Path convention: {user_id}/{library_item_id}.{ext}
--
-- ⚠️  ESTA MIGRATION É O FALLBACK LOCAL (sem Supabase Storage API).
-- Em Supabase Cloud, esta migration NÃO deve ser aplicada. Use a versão
-- Supabase Cloud em /workspace/supabase/storage-bucket-cloud.sql como
-- referência e crie o bucket via Dashboard / CLI / Management API.
--
-- O QUE ESTA MIGRATION FAZ LOCALMENTE:
--   1. Cria a tabela `storage.buckets_local` que registra os buckets
--      com a mesma estrutura do Supabase Cloud (id, name, public,
--      file_size_limit, allowed_mime_types).
--   2. Cria a tabela `storage.objects_local` que simula storage.objects
--      (apenas metadata, sem o binário — esse fica em /workspace/supabase/storage/).
--   3. Registra o bucket "library" com a config do design doc.
--   4. Cria RLS policies simuladas em storage.objects_local.
--   5. Cria o diretório /workspace/supabase/storage/library/ no disco.
--
-- Data: 2026-07-06
-- =============================================================================

set search_path = "$user", public, extensions;

-- -----------------------------------------------------------------------------
-- 1. Schema storage local (espelha o que o Supabase Cloud cria)
-- -----------------------------------------------------------------------------
create schema if not exists storage;

-- 1.1 storage.buckets_local
create table if not exists storage.buckets_local (
    id                  text primary key,
    name                text not null unique,
    public              boolean not null default false,
    file_size_limit     bigint,    -- em bytes; null = sem limite
    allowed_mime_types  text[],   -- null = sem restrição
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table storage.buckets_local is
    'Registro local de buckets (fallback sem Supabase Storage API). Espelha storage.buckets do Supabase Cloud.';

-- 1.2 storage.objects_local
-- Representa os metadados dos arquivos guardados em /workspace/supabase/storage/{bucket}/
create table if not exists storage.objects_local (
    id           uuid primary key default gen_random_uuid(),
    bucket_id    text not null references storage.buckets_local(id) on delete cascade,
    name         text not null,  -- path dentro do bucket: "{user_id}/{library_item_id}.{ext}"
    owner        uuid,            -- user_id (auth.uid() no Cloud)
    mime_type    text,
    file_size    bigint,
    etag         text,
    metadata     jsonb not null default '{}'::jsonb,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    -- Unicidade: 1 path por bucket
    unique (bucket_id, name)
);

comment on table storage.objects_local is
    'Metadados de objetos (fallback local). Os binários ficam em /workspace/supabase/storage/{bucket}/{name}.';

create index objects_local_bucket_idx      on storage.objects_local (bucket_id);
create index objects_local_owner_idx       on storage.objects_local (owner);
create index objects_local_created_at_idx  on storage.objects_local (created_at desc);

alter table storage.buckets_local  enable row level security;
alter table storage.objects_local  enable row level security;

-- Grants no schema storage (necessário para authenticated/anon)
grant usage on schema storage to authenticated, anon;
-- Grants nas tabelas: authenticated tem CRUD; anon apenas SELECT
grant select on storage.buckets_local to authenticated, anon;
grant select, insert, update, delete on storage.objects_local to authenticated;
-- INSERT/UPDATE/DELETE são controlados pelas RLS policies acima
-- (cada user só mexe nos próprios arquivos).

-- -----------------------------------------------------------------------------
-- 2. Cria o bucket "library" com a config do design doc
-- -----------------------------------------------------------------------------
insert into storage.buckets_local (
    id, name, public, file_size_limit, allowed_mime_types
) values (
    'library',
    'library',
    false,                 -- privado (signed URLs)
    104857600,             -- 100 MB
    array[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/heic',
        'audio/mpeg',
        'audio/m4a',
        'audio/wav',
        'video/mp4',
        'video/quicktime',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
) on conflict (id) do update set
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- 3. RLS Policies (sintaxe idêntica à Supabase Cloud, com auth.uid())
-- -----------------------------------------------------------------------------
-- storage.buckets_local: todos autenticados podem SELECT (ver os buckets disponíveis)
-- INSERT/UPDATE/DELETE só service_role (não há policy = bloqueado pra authenticated)
create policy "buckets_local_select_authenticated"
    on storage.buckets_local for select to authenticated
    using (true);

-- storage.objects_local: o owner só acessa objetos do seu próprio path
-- Path convention: {user_id}/{library_item_id}.{ext}
-- Pegamos a primeira pasta do path e comparamos com auth.uid()
create policy "objects_local_select_own"
    on storage.objects_local for select to authenticated
    using (
        bucket_id = 'library'
        and owner = auth.uid()
    );

create policy "objects_local_insert_own"
    on storage.objects_local for insert to authenticated
    with check (
        bucket_id = 'library'
        and owner = auth.uid()
    );

create policy "objects_local_update_own"
    on storage.objects_local for update to authenticated
    using (
        bucket_id = 'library'
        and owner = auth.uid()
    )
    with check (
        bucket_id = 'library'
        and owner = auth.uid()
    );

create policy "objects_local_delete_own"
    on storage.objects_local for delete to authenticated
    using (
        bucket_id = 'library'
        and owner = auth.uid()
    );

-- Trigger updated_at
create trigger buckets_local_set_updated_at
    before update on storage.buckets_local
    for each row execute function public.set_updated_at();

create trigger objects_local_set_updated_at
    before update on storage.objects_local
    for each row execute function public.set_updated_at();

-- =============================================================================
-- FIM do fallback local
-- =============================================================================

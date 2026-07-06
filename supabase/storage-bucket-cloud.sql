-- =============================================================================
-- Naninne — Storage Bucket "library" (versão Supabase Cloud / produção)
-- =============================================================================
-- ⚠️  ESTE ARQUIVO É REFERÊNCIA. NÃO É APLICADO NESTE SANDBOX.
--
-- Em Supabase Cloud, o bucket "library" deve ser criado de UMA das formas:
--   (a) Dashboard do Supabase → Storage → New bucket → name=library, public=false
--   (b) supabase-cli: supabase storage create library --public=false
--   (c) Management API: POST /v1/storage/buckets
--
-- DEPOIS de criar o bucket, aplique o SQL abaixo via:
--   supabase db push
-- OU cole este conteúdo no SQL Editor do Dashboard.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Configuração do bucket (criar via Dashboard OU via este insert)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'library',
    'library',
    false,                  -- privado (signed URLs)
    104857600,              -- 100 MB
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
) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. RLS Policies no storage.objects
-- -----------------------------------------------------------------------------
-- Path convention: {user_id}/{library_item_id}.{ext}
-- A primeira pasta do path É o user_id. Usamos storage.foldername(name)[1].

-- SELECT (download / gerar signed URL)
drop policy if exists "library_select_own" on storage.objects;
create policy "library_select_own"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'library'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- INSERT (upload)
drop policy if exists "library_insert_own" on storage.objects;
create policy "library_insert_own"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'library'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- UPDATE (substituir arquivo)
drop policy if exists "library_update_own" on storage.objects;
create policy "library_update_own"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'library'
        and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
        bucket_id = 'library'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- DELETE (remover arquivo)
drop policy if exists "library_delete_own" on storage.objects;
create policy "library_delete_own"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'library'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- =============================================================================
-- FIM
-- =============================================================================

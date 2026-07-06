-- =============================================================================
-- Naninne — Supabase Lite Setup (fallback sem Docker)
-- =============================================================================
-- Este arquivo existe porque este sandbox NÃO tem Docker disponível.
-- Ele recria o mínimo do Supabase (auth schema, roles, funções helper) em um
-- Postgres 15 vanilla com pgvector, para que o schema da aplicação
-- (001_init.sql) possa ser aplicado e testado localmente.
--
-- Em ambiente real (Supabase Cloud ou `supabase start` via Docker), ESTE
-- arquivo NÃO deve ser aplicado — o Supabase já provê auth schema, roles,
-- GoTrue, etc. O schema da aplicação (001_init.sql) é o mesmo nos dois
-- casos.
--
-- Data: 2026-07-06
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSÕES no schema extensions (espelha o Supabase)
-- -----------------------------------------------------------------------------
create schema if not exists extensions;

create extension if not exists "uuid-ossp"   with schema extensions;
create extension if not exists "pgcrypto"    with schema extensions;
create extension if not exists "pg_trgm"     with schema extensions;
create extension if not exists "vector"      with schema extensions;

-- -----------------------------------------------------------------------------
-- 2. SCHEMA auth (espelha o que o GoTrue do Supabase cria)
-- -----------------------------------------------------------------------------
create schema if not exists auth;

-- Tabela auth.users — em produção, gerenciada pelo GoTrue
create table if not exists auth.users (
    instance_id          uuid,
    id                   uuid primary key default gen_random_uuid(),
    aud                  varchar(255),
    role                 varchar(255),
    email                varchar(255) unique,
    encrypted_password   varchar(255),
    email_confirmed_at   timestamptz,
    invited_at           timestamptz,
    confirmation_token   varchar(255),
    confirmation_sent_at timestamptz,
    recovery_token       varchar(255),
    recovery_sent_at     timestamptz,
    email_change_token_new varchar(255),
    email_change         varchar(255),
    email_change_sent_at timestamptz,
    last_sign_in_at      timestamptz,
    raw_app_meta_data    jsonb,
    raw_user_meta_data   jsonb,
    is_super_admin       boolean,
    created_at           timestamptz default now(),
    updated_at           timestamptz default now(),
    phone                varchar(15),
    phone_confirmed_at   timestamptz,
    phone_change         varchar(15) default '',
    phone_change_token   varchar(255) default '',
    phone_change_sent_at timestamptz,
    confirmed_at         timestamptz generated always as (LEAST(email_confirmed_at, phone_confirmed_at)) stored,
    email_change_token_current varchar(255) default '',
    email_change_confirm_status smallint check (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2),
    banned_until         timestamptz,
    reauthentication_token varchar(255) default '',
    reauthentication_sent_at timestamptz,
    is_sso_user          boolean default false,
    deleted_at           timestamptz
);

-- Função auth.uid() — em produção, gerenciada pelo Supabase
-- Lê do claim 'sub' do JWT (que o GoTrue injeta como request.jwt.claim.sub)
create or replace function auth.uid()
returns uuid
language sql stable
as $$
    select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'),
        (nullif(current_setting('request.jwt.claim.email', true), ''))  -- fallback dev
    )::uuid;
$$;

-- Função auth.role() — papel do JWT
create or replace function auth.role()
returns text
language sql stable
as $$
    select coalesce(
        nullif(current_setting('request.jwt.claim.role', true), ''),
        'anon'
    );
$$;

-- Função auth.email() — email do JWT
create or replace function auth.email()
returns text
language sql stable
as $$
    select coalesce(
        nullif(current_setting('request.jwt.claim.email', true), ''),
        ''
    );
$$;

-- -----------------------------------------------------------------------------
-- 3. ROLES — espelha o que o Supabase cria
-- -----------------------------------------------------------------------------
-- Supabase cria 3 roles: anon, authenticated, service_role
-- No Postgres local, precisamos criá-los como NOLOGIN e dar GRANT
do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin noinherit bypassrls;
    end if;
end
$$;

-- Garante que o role que vai aplicar a migration (postgres) é superuser e
-- bypassa RLS. Em produção, o Supabase aplica via service_role que tem
-- bypassrls.

-- Grants no schema auth (em produção o Supabase faz; replicamos aqui)
-- Permite que authenticated/anon usem auth.uid() e vejam auth.users
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid()   to authenticated, anon;
grant execute on function auth.role()  to authenticated, anon;
grant execute on function auth.email() to authenticated, anon;
grant select on auth.users to authenticated;

-- -----------------------------------------------------------------------------
-- 4. SEARCH_PATH (essencial para vector / digest / gin_trgm_ops)
-- -----------------------------------------------------------------------------
-- O Supabase Cloud já define search_path = "$user", public, extensions no
-- postgresql.conf. Em Postgres vanilla, definimos aqui.
-- Isso permite que schema-supabase.sql (que usa `vector(1536)`, `digest()`,
-- `gin_trgm_ops` sem qualificar schema) funcione sem modificações.
-- ⚠ Apenas para este fallback local. Em Supabase Cloud, NÃO aplicar.
alter database naninne set search_path = "$user", public, extensions;

-- Garante que a sessão atual também pega
set search_path = "$user", public, extensions;

-- =============================================================================
-- FIM do setup 0000 (Supabase Lite)
-- =============================================================================

-- =============================================================================
-- Naninne — Seed DEV (Sprint 0)
-- =============================================================================
-- Cria:
--   1. Um usuário de teste em auth.users (seed@naninne.local) — UUID FIXO
--   2. O perfil correspondente em public.users
--   3. Os 4 projects default (escrita, audiovisual, mercado, tech) com IDs fixos
--      e cores/ícones vindos do design system
--   4. O perfil de dev em public.users para o primeiro auth user
--
-- UUID FIXO: 00000000-0000-0000-0000-000000000001
-- Esse é o "demo user" — em produção, vem do GoTrue no signup.
--
-- Data: 2026-07-06
-- =============================================================================

set search_path = "$user", public, extensions;

-- -----------------------------------------------------------------------------
-- 1. Usuário de teste (auth.users)
-- -----------------------------------------------------------------------------
-- Senha: naninne-dev-password (em produção: fluxo real de signup)
-- O Supabase Auth usaria pgcrypto.crypt para o encrypted_password; aqui
-- usamos um hash bcrypt mock ($2a$ prefix indica bcrypt). Em produção,
-- GoTrue gerencia isso — não codificamos senha em migration.
insert into auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) values (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'seed@naninne.local',
    '$2a$10$placeholder.hash.placeholder.hash.placeholder.hash.placeholder',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Seed User"}'::jsonb,
    now(), now()
) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Perfil público (public.users)
-- -----------------------------------------------------------------------------
insert into public.users (
    id, display_name, locale, timezone, preferences, metadata
) values (
    '00000000-0000-0000-0000-000000000001',
    'Seed User',
    'pt-BR',
    'America/Sao_Paulo',
    jsonb_build_object(
        'theme', 'dark',
        'default_project_id', '11111111-1111-1111-1111-111111111111',
        'model_preferences', jsonb_build_object(
            'orchestrator', 'claude-sonnet-4-20260514',
            'fast', 'claude-haiku-4-5',
            'embeddings', 'text-embedding-3-small'
        )
    ),
    jsonb_build_object('source', 'seed', 'sprint', 0)
) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3. 4 Projects default (IDs fixos para o seed)
-- -----------------------------------------------------------------------------
-- IDs fixos facilitam o frontend (não precisa lookup de slug→id no boot).
-- Cores e ícones vêm do /workspace/docs/design-system.md
do $$
begin
    -- Escrita Criativa (azul)
    insert into public.projects (id, user_id, name, slug, type, color, icon, description, sort_order, metadata)
    values (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000001',
        'Escrita Criativa',
        'escrita',
        'escrita',
        '#3B82F6',
        'BookOpen',
        'Livros, capítulos, contos, ensaios, roteiros escritos.',
        0,
        '{"seed": true, "sprint": 0}'::jsonb
    ) on conflict (user_id, slug) do nothing;

    -- Audiovisual (laranja)
    insert into public.projects (id, user_id, name, slug, type, color, icon, description, sort_order, metadata)
    values (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000001',
        'Audiovisual',
        'audiovisual',
        'audiovisual',
        '#F97316',
        'Film',
        'Roteiros, vídeos, imagens, podcasts, storyboards.',
        1,
        '{"seed": true, "sprint": 0}'::jsonb
    ) on conflict (user_id, slug) do nothing;

    -- Mercado (verde)
    insert into public.projects (id, user_id, name, slug, type, color, icon, description, sort_order, metadata)
    values (
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000001',
        'Mercado',
        'mercado',
        'mercado',
        '#10B981',
        'TrendingUp',
        'Análise corporativa, planilhas, relatórios, apresentações executivas.',
        2,
        '{"seed": true, "sprint": 0}'::jsonb
    ) on conflict (user_id, slug) do nothing;

    -- Tech (cinza-azulado)
    insert into public.projects (id, user_id, name, slug, type, color, icon, description, sort_order, metadata)
    values (
        '44444444-4444-4444-4444-444444444444',
        '00000000-0000-0000-0000-000000000001',
        'Tech',
        'tech',
        'tech',
        '#64748B',
        'Wrench',
        'Desenvolvimento, código, DevOps, arquitetura, debugging.',
        3,
        '{"seed": true, "sprint": 0}'::jsonb
    ) on conflict (user_id, slug) do nothing;
end
$$;

-- =============================================================================
-- FIM do seed
-- =============================================================================

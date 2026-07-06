-- =============================================================================
-- Naninne — POST-AUTH-INIT.sql
-- RODE ESTE SQL DEPOIS de criar sua conta no Supabase Auth
-- (Dashboard → Authentication → Users → Add user → Create new user)
-- =============================================================================
-- O que faz:
--   1) Cria o perfil do seu user em public.users (se ainda não existir)
--   2) Insere 4 projects padrão vinculados ao seu user
-- =============================================================================

-- 1) Perfil em public.users (linkado ao auth.users via id)
insert into public.users (id, display_name, preferences)
select
    au.id,
    coalesce(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as display_name,
    jsonb_build_object(
        'theme', coalesce(au.raw_user_meta_data->>'theme', 'light'),
        'default_project', 'escrita',
        'locale', 'pt-BR'
    ) as preferences
from auth.users au
where not exists (select 1 from public.users pu where pu.id = au.id)
limit 1;

-- 2) 4 projects padrão (vinculados ao user)
insert into public.projects (slug, nome, cor, icone, descricao, user_id, is_default, ordem)
select v.slug, v.nome, v.cor, v.icone, v.descricao, au.id, true, v.ordem
from auth.users au
cross join (values
    ('escrita',     'Escrita Criativa', '#3B82F6', 'BookOpen',   'Livros, capítulos, ensaios, ficção, poesia.', 1),
    ('audiovisual', 'Audiovisual',      '#F97316', 'Film',       'Roteiros, cenas, prompts Midjourney, vídeos.', 2),
    ('mercado',     'Mercado',          '#10B981', 'TrendingUp', 'Análise de planilhas, dados comerciais, apresentações.', 3),
    ('tech',        'Tech',             '#64748B', 'Wrench',     'Desenvolvimento do próprio app, GitHub, Supabase.', 4)
) as v(slug, nome, cor, icone, descricao, ordem)
where not exists (select 1 from public.projects p where p.slug = v.slug and p.user_id = au.id)
limit 4;

-- =============================================================================
-- Verificação (opcional — rode SELECT para confirmar)
-- =============================================================================
-- select * from public.users;
-- select slug, nome, cor from public.projects order by ordem;

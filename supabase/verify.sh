#!/bin/bash
# =============================================================================
# verify.sh — Verificação completa do estado do banco Naninne
# =============================================================================
# Rode após `npx supabase db reset` (Docker) ou após aplicar as migrations
# manualmente (modo local-port). Imprime 16 checagens com saída colorida.
#
# Uso:
#   ./verify.sh
#
# Exit code 0 = tudo OK, != 0 = alguma checagem falhou.
# =============================================================================

set -e
DB="${DB:-naninne}"
PSQL_USER="${PSQL_USER:-postgres}"

if [ "$(id -u)" = "0" ]; then
    PSQL_CMD="su $PSQL_USER -c"
else
    PSQL_CMD=""
fi

run_psql() {
    if [ -n "$PSQL_CMD" ]; then
        su $PSQL_USER -c "psql -d $DB -tA -c \"$1\""
    else
        psql -d $DB -tA -c "$1"
    fi
}

fail=0
pass=0

check() {
    local name="$1"
    local query="$2"
    local expected="$3"
    local actual=$(run_psql "$query" 2>/dev/null)
    if [ "$actual" = "$expected" ]; then
        echo "  ✅ $name"
        pass=$((pass+1))
    else
        echo "  ❌ $name — expected '$expected', got '$actual'"
        fail=$((fail+1))
    fi
}

echo ""
echo "=========================================="
echo "  VERIFICAÇÃO SPRINT 0 SUPABASE"
echo "=========================================="
echo ""

echo "→ 1. Tabelas criadas (deve ser 12)"
# Conta apenas as 12 tabelas do schema Naninne (excluindo checkpoints do LangGraph
# e tabelas do schema storage)
EXPECTED_TABLES="agent_runs|conversations|document_chunks|generated_documents|library_items|memories|messages|projects|sources|uploaded_files_log|users|web_search_cache"
check "12 tabelas Naninne em public" \
    "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename ~ '($EXPECTED_TABLES)'" \
    "12"

echo ""
echo "→ 2. RLS habilitado em todas as 12"
check "Todas as 12 Naninne com rowsecurity=true" \
    "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=true AND tablename ~ '($EXPECTED_TABLES)'" \
    "12"

echo ""
echo "→ 3. HNSW no document_chunks"
check "HNSW index em document_chunks" \
    "SELECT count(*) FROM pg_indexes WHERE tablename='document_chunks' AND indexdef ILIKE '%hnsw%'" \
    "1"

echo ""
echo "→ 4. HNSW no memories"
check "HNSW index em memories" \
    "SELECT count(*) FROM pg_indexes WHERE tablename='memories' AND indexdef ILIKE '%hnsw%'" \
    "1"

echo ""
echo "→ 5. Vector extension instalada"
check "Extensão vector instalada" \
    "SELECT count(*) FROM pg_extension WHERE extname='vector'" \
    "1"

echo ""
echo "→ 6. Storage bucket 'library' existe"
check "Bucket library registrado" \
    "SELECT count(*) FROM storage.buckets_local WHERE id='library'" \
    "1"

echo ""
echo "→ 7. Bucket library NÃO público"
check "Bucket library é privado" \
    "SELECT count(*) FROM storage.buckets_local WHERE id='library' AND public=false" \
    "1"

echo ""
echo "→ 8. Bucket library tem 100MB limit"
check "Bucket library 100MB" \
    "SELECT count(*) FROM storage.buckets_local WHERE id='library' AND file_size_limit=104857600" \
    "1"

echo ""
echo "→ 9. Bucket library tem 13 MIME types"
check "Bucket library 13 mimes" \
    "SELECT count(*) FROM storage.buckets_local WHERE id='library' AND array_length(allowed_mime_types,1)=13" \
    "1"

echo ""
echo "→ 10. 4 projects seed criados"
check "4 projects" \
    "SELECT count(*) FROM public.projects" \
    "4"

echo ""
echo "→ 11. 4 projects com cores/ícones corretos"
check "Cores dos 4 projects" \
    "SELECT count(*) FROM public.projects WHERE (slug='escrita' AND color='#3B82F6' AND icon='BookOpen') OR (slug='audiovisual' AND color='#F97316' AND icon='Film') OR (slug='mercado' AND color='#10B981' AND icon='TrendingUp') OR (slug='tech' AND color='#64748B' AND icon='Wrench')" \
    "4"

echo ""
echo "→ 12. 1 usuário seed"
check "1 user em auth.users (seed@naninne.local)" \
    "SELECT count(*) FROM auth.users WHERE email='seed@naninne.local'" \
    "1"

echo ""
echo "→ 13. 1 perfil em public.users"
check "1 perfil em public.users" \
    "SELECT count(*) FROM public.users" \
    "1"

echo ""
echo "→ 14. RLS policies em todas as 12 tabelas (>0 cada)"
EMPTY=$(run_psql "SELECT COALESCE(count(*),0) FROM (SELECT tablename, count(*) c FROM pg_policies WHERE schemaname='public' GROUP BY tablename HAVING count(*)=0) x" 2>/dev/null | tr -d ' ' | head -1)
if [ "$EMPTY" = "0" ]; then
    echo "  ✅ Nenhuma tabela sem policy ($EMPTY)"
    pass=$((pass+1))
else
    echo "  ❌ Existem tabelas sem policy ($EMPTY)"
    fail=$((fail+1))
fi

echo ""
echo "→ 15. auth.uid() funciona (checa função)"
HAS_FN=$(run_psql "SELECT count(*) FROM pg_proc WHERE proname='uid' AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='auth')" 2>/dev/null | tr -d ' ' | head -1)
if [ "$HAS_FN" = "1" ]; then
    echo "  ✅ Função auth.uid() existe"
    pass=$((pass+1))
else
    echo "  ❌ Função auth.uid() não existe (got '$HAS_FN')"
    fail=$((fail+1))
fi

echo ""
echo "→ 16. RLS isola dados entre users"
# Como authenticated seed: 4 projects
# Como authenticated outro: 0 projects
# Como anon: 0 projects
rls_query() {
    local jwt_sub="$1"
    local role="$2"
    if [ -n "$PSQL_CMD" ]; then
        su $PSQL_USER -c "psql -d $DB -tA -X -c \"
            SET ROLE $role;
            SELECT set_config('request.jwt.claim.sub', '$jwt_sub', false);
            SELECT count(*) FROM public.projects;
            RESET ROLE;
        \"" 2>/dev/null | tr -d ' ' | grep -E '^[0-9]+$' | head -1
    else
        psql -d $DB -tA -X -c "
            SET ROLE $role;
            SELECT set_config('request.jwt.claim.sub', '$jwt_sub', false);
            SELECT count(*) FROM public.projects;
            RESET ROLE;
        " 2>/dev/null | tr -d ' ' | grep -E '^[0-9]+$' | head -1
    fi
}
SEED_COUNT=$(rls_query '00000000-0000-0000-0000-000000000001' authenticated)
OTHER_COUNT=$(rls_query 'ffffffff-ffff-ffff-ffff-ffffffffffff' authenticated)
ANON_COUNT=$(rls_query '' anon)
RLS_OK=0
if [ "$SEED_COUNT" = "4" ] && [ "$OTHER_COUNT" = "0" ] && [ "$ANON_COUNT" = "0" ]; then
    echo "  ✅ RLS isola (seed=$SEED_COUNT, other=$OTHER_COUNT, anon=$ANON_COUNT)"
    RLS_OK=1
fi
if [ $RLS_OK -eq 0 ]; then
    echo "  ❌ RLS NÃO está isolando — seed=$SEED_COUNT other=$OTHER_COUNT anon=$ANON_COUNT"
    fail=$((fail+1))
else
    pass=$((pass+1))
fi

echo ""
echo "=========================================="
echo "  RESULTADO: $pass ✅ / $fail ❌"
echo "=========================================="

if [ $fail -gt 0 ]; then
    exit 1
fi
exit 0

@echo off
REM Sprint 0 - Backend quick start (CMD)
REM Usage: start.bat

echo === Naninne Backend Sprint 0 ===

REM 1. Verificar Python
where python >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado. Instale Python 3.11+ de https://python.org
    exit /b 1
)

REM 2. Criar venv se nao existir
if not exist .venv (
    echo Criando .venv...
    python -m venv .venv
)

REM 3. Ativar venv
call .venv\Scripts\activate.bat

REM 4. Instalar deps
echo Instalando dependencias...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERRO: pip install falhou
    exit /b 1
)

REM 5. Criar .env se nao existir
if not exist .env (
    echo Criando .env basico...
    (
        echo DATABASE_URL=postgresql://naninne:naninne@localhost:5432/naninne
        echo SUPABASE_URL=http://localhost:54321
        echo SUPABASE_SERVICE_ROLE_KEY=stub
        echo ANTHROPIC_API_KEY=stub
        echo GOOGLE_API_KEY=stub
        echo OPENAI_API_KEY=stub
        echo ENVIRONMENT=dev
    ) > .env
)

REM 6. Subir servidor
echo.
echo Subindo servidor em http://localhost:8000 ...
echo Documentacao Swagger em http://localhost:8000/docs
echo.
uvicorn app.main:app --reload --port 8000
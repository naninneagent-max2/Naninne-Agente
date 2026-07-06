# Sprint 0 — Backend quick start (PowerShell)
# Usage: .\start.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Naninne Backend Sprint 0 ===" -ForegroundColor Cyan

# 1. Verificar Python
$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) {
    Write-Host "ERRO: Python nao encontrado. Instale Python 3.11+ de https://python.org" -ForegroundColor Red
    exit 1
}
Write-Host "Python: $python" -ForegroundColor Green

# 2. Criar venv se nao existir
if (-not (Test-Path ".venv")) {
    Write-Host "Criando .venv..." -ForegroundColor Yellow
    python -m venv .venv
}

# 3. Ativar venv
& .\.venv\Scripts\Activate.ps1
Write-Host "Venv ativo: $((Get-Command python).Source)" -ForegroundColor Green

# 4. Instalar deps
Write-Host "Instalando dependencias (requirements.txt)..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: pip install falhou" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencias instaladas." -ForegroundColor Green

# 5. Criar .env se nao existir
if (-not (Test-Path ".env")) {
    Write-Host "Criando .env basico..." -ForegroundColor Yellow
    @"
DATABASE_URL=postgresql://naninne:naninne@localhost:5432/naninne
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=stub
ANTHROPIC_API_KEY=stub
GOOGLE_API_KEY=stub
OPENAI_API_KEY=stub
ENVIRONMENT=dev
"@ | Out-File -Encoding utf8 .env
    Write-Host ".env criado. Edite com suas chaves reais." -ForegroundColor Yellow
}

# 6. Subir servidor
Write-Host ""
Write-Host "Subindo servidor em http://localhost:8000 ..." -ForegroundColor Cyan
Write-Host "Documentacao Swagger em http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
uvicorn app.main:app --reload --port 8000
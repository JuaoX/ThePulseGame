param([switch]$Publish)
$ErrorActionPreference = 'Stop'

Write-Host 'Verificando regras e conteúdo...' -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Compilando a versão de demonstração...' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $Publish) {
    Write-Host 'Build pronto em dist/. Nada foi enviado. Use npm run preview para conferir.' -ForegroundColor Green
    exit 0
}

$pendingChanges = git status --porcelain
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($pendingChanges) {
    Write-Error 'Revise e faça commit das alterações antes de publicar. O script não adiciona arquivos nem cria commits automaticamente.'
    exit 1
}

git push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Push normal concluído. Confira o resultado no serviço de hospedagem.' -ForegroundColor Green

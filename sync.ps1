$ErrorActionPreference = "Stop"
Write-Host "📥 Lendo código da Área de Transferência (Ctrl+C)..." -ForegroundColor Cyan
$clip = Get-Clipboard -Raw

if ([string]::IsNullOrWhiteSpace($clip) -or ($clip -notmatch "const files =")) {
    Write-Host "⚠️ O conteúdo atual do seu Ctrl+C não é um pacote de atualização do Pulso!" -ForegroundColor Yellow
    Write-Host "👉 Clique no botão 'Copiar' do bloco de código no Gemini antes de rodar .\sync.ps1" -ForegroundColor Yellow
    exit 1
}

[System.IO.File]::WriteAllText("$PWD\instalador-pulso.cjs", $clip, [System.Text.UTF8Encoding]::new($false))
node instalador-pulso.cjs

Write-Host "🛠️ Testando compilação (npm run build)..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "☁️ Enviando atualização para GitHub (JuaoX/ThePulseGame)..." -ForegroundColor Cyan
    git add .
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "chore: update Pulso ($timestamp)"
    git push -u origin main --force
    Write-Host "🚀 Tudo pronto! Código no GitHub e deploy acionado na Vercel!" -ForegroundColor Green
} else {
    Write-Host "❌ O build falhou. Nada foi enviado ao GitHub para proteger seu site." -ForegroundColor Red
}

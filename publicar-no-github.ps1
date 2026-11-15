param([string]$Repository = 'https://github.com/gabrielsousa45559-eng/recutramento.git')
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git não está instalado.' }
$email = git config user.email
if (-not $email -or $email -eq 'SEU_EMAIL_DO_GITHUB') { $email = Read-Host 'Informe o e-mail de autoria do GitHub' }
git config user.name 'Gabriel Sousa'
git config user.email $email
if (-not (Test-Path '.git')) { git init -b main | Out-Null }
$remote = git remote get-url origin 2>$null
if (-not $remote) { git remote add origin $Repository }
elseif ($remote -ne $Repository) { throw "O remoto origin já aponta para $remote. Verifique antes de publicar." }
git add --all
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Host 'Não há alterações novas para publicar.'; exit 0 }
$message = 'Implementa painel inicial de recrutamento e configuração segura'
git commit -m $message
if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar commit.' }
git push -u origin main
if ($LASTEXITCODE -ne 0) { throw 'O envio falhou. Confirme a conta GitHub no Gerenciador de Credenciais e tente novamente.' }
Write-Host 'Projeto publicado no GitHub.'

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not (Test-Path (Join-Path $root 'node_modules\pg\package.json'))) {
  if (-not $npm) { throw 'Instale Node.js 20 ou superior antes de importar os dados.' }
  Push-Location $root
  try { & $npm.Source ci --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências.' } }
  finally { Pop-Location }
}
$secureUrl = Read-Host 'Cole a External Database URL do PostgreSQL no Render' -AsSecureString
$urlBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
try {
  $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($urlBuffer)
  Push-Location $root
  try { & node scripts/import-render-data.mjs; if ($LASTEXITCODE -ne 0) { throw 'A importação falhou; confira a mensagem acima.' } }
  finally { Pop-Location; Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($urlBuffer)
  $secureUrl.Dispose()
}

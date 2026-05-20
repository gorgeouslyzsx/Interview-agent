param(
  [string]$PostgresDb = "interview_agent",
  [string]$PostgresUser = "interview",
  [string]$PostgresImage = "postgres:16-alpine",
  [int]$AppPort = 3000,
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$composeEnvPath = Join-Path $root ".env"
$productionEnvPath = Join-Path $root ".env.production"

function New-Secret {
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($bytes)
}

function Get-EnvValue {
  param([string]$Path, [string]$Key)

  if (!(Test-Path $Path)) {
    return $null
  }

  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match "^$([regex]::Escape($Key))=(.*)$") {
      return $Matches[1].Trim('"')
    }
  }

  return $null
}

function Set-EnvValue {
  param([string]$Path, [string]$Key, [string]$Value)

  $quoted = '"' + $Value.Replace('"', '\"') + '"'
  $newLine = "$Key=$quoted"
  $lines = @()

  if (Test-Path $Path) {
    $lines = @(Get-Content -LiteralPath $Path)
  }

  $found = $false
  $updated = foreach ($line in $lines) {
    if ($line -match "^$([regex]::Escape($Key))=") {
      $found = $true
      $newLine
    } else {
      $line
    }
  }

  if (!$found) {
    $updated = @($updated) + $newLine
  }

  Set-Content -LiteralPath $Path -Value $updated -Encoding UTF8
}

if (!(Test-Path $composeEnvPath)) {
  New-Item -ItemType File -Path $composeEnvPath | Out-Null
}

$existingDbPassword = Get-EnvValue -Path $composeEnvPath -Key "POSTGRES_PASSWORD"
$dbPassword = if ($existingDbPassword -and !$Force) { $existingDbPassword } else { New-Secret }

Set-EnvValue -Path $composeEnvPath -Key "POSTGRES_DB" -Value $PostgresDb
Set-EnvValue -Path $composeEnvPath -Key "POSTGRES_USER" -Value $PostgresUser
Set-EnvValue -Path $composeEnvPath -Key "POSTGRES_PASSWORD" -Value $dbPassword
Set-EnvValue -Path $composeEnvPath -Key "POSTGRES_IMAGE" -Value $PostgresImage
Set-EnvValue -Path $composeEnvPath -Key "APP_PORT" -Value "$AppPort"

$existingAppSecret = Get-EnvValue -Path $productionEnvPath -Key "APP_SECRET"
$appSecret = if ($existingAppSecret -and !$Force) { $existingAppSecret } else { New-Secret }
$databaseUrl = "postgresql://${PostgresUser}:${dbPassword}@db:5432/${PostgresDb}"

Set-EnvValue -Path $productionEnvPath -Key "DATABASE_URL" -Value $databaseUrl
Set-EnvValue -Path $productionEnvPath -Key "APP_SECRET" -Value $appSecret
Set-EnvValue -Path $productionEnvPath -Key "OPENAI_API_KEY" -Value ""
Set-EnvValue -Path $productionEnvPath -Key "GLM_API_KEY" -Value ""
Set-EnvValue -Path $productionEnvPath -Key "LLM_BASE_URL" -Value "https://open.bigmodel.cn/api/paas/v4"
Set-EnvValue -Path $productionEnvPath -Key "LLM_MODEL" -Value "glm-5"

Write-Host "Production env files prepared: .env and .env.production"
Write-Host "Secrets were generated or preserved and were not printed."

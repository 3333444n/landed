# Launcher for the packaged installation (ADR 003), Windows PowerShell version of landed.sh.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\landed.ps1 start|stop|status|logs|backup|restore <file>
#
# `start` creates .env.release on first run (random database password) and never overwrites it.
# `stop` keeps the data volume; a factory reset is a separate, deliberate command, see
# docs/07-quickstart-contract.md. Untested on Windows as of 2026-09-13; report problems.
param(
  [Parameter(Position = 0)] [string] $Command,
  [Parameter(Position = 1, ValueFromRemainingArguments = $true)] [string[]] $Rest
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$envFile = ".env.release"
$composeArgs = @("compose", "--env-file", $envFile, "-f", "compose.release.yml")

function Invoke-Compose { param([string[]] $Args)
  & docker @composeArgs @Args
  if ($LASTEXITCODE -ne 0) { throw "docker compose $($Args -join ' ') failed with exit code $LASTEXITCODE" }
}

function Require-Docker {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed. Install Docker Desktop, then retry."
  }
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) { throw "Docker is installed but not running. Start Docker Desktop and retry." }
  & docker compose version *> $null
  if ($LASTEXITCODE -ne 0) { throw "Docker Compose v2 is missing ('docker compose' failed). Update Docker Desktop." }
}

function New-RandomPassword {
  # Hex only, so the value is safe inside the DATABASE_URL that compose.release.yml builds.
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

function Ensure-Env {
  if (Test-Path $envFile) { return }
  $password = New-RandomPassword
  # Copy the example, replacing only the password placeholder. ASCII without BOM keeps the
  # file readable by Docker Compose.
  $content = (Get-Content ".env.release.example") -replace "^POSTGRES_PASSWORD=.*", "POSTGRES_PASSWORD=$password"
  [System.IO.File]::WriteAllLines((Join-Path (Get-Location) $envFile), $content, (New-Object System.Text.UTF8Encoding $false))
  Write-Host "Created $envFile with a generated database password."
}

function Get-EnvValue { param([string] $Key)
  $line = Get-Content $envFile | Where-Object { $_ -like "$Key=*" } | Select-Object -First 1
  if ($null -eq $line) { return "" }
  return $line.Substring($Key.Length + 1)
}

function Require-Env {
  if (-not (Test-Path $envFile)) { throw "$envFile not found. Run 'scripts\landed.ps1 start' first." }
}

switch ($Command) {
  "start" {
    Require-Docker
    Ensure-Env
    # --build rebuilds the image from the current sources, so `start` is also the upgrade command.
    Invoke-Compose @("up", "-d", "--build")
    $port = Get-EnvValue "LANDED_PORT"; if (-not $port) { $port = "3000" }
    Write-Host "Landed is starting at http://127.0.0.1:$port"
    Write-Host "Run 'scripts\landed.ps1 status' to see when it reports healthy."
  }
  "stop" {
    Require-Docker; Require-Env
    # Deliberately no -v: containers go, the pgdata volume with personal data stays.
    Invoke-Compose @("down")
    Write-Host "Stopped. Your data is kept in the Docker volume landed-release_pgdata."
  }
  "status" { Require-Docker; Require-Env; Invoke-Compose @("ps") }
  "logs" { Require-Docker; Require-Env; Invoke-Compose (@("logs", "--tail=200") + $Rest) }
  "backup" {
    Require-Docker; Require-Env
    $user = Get-EnvValue "POSTGRES_USER"; $db = Get-EnvValue "POSTGRES_DB"
    New-Item -ItemType Directory -Force -Path "backups" | Out-Null
    $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
    $file = "backups\landed-release-$stamp.dump"
    # pg_dump writes binary; -o with cmd avoids PowerShell re-encoding the stream.
    & cmd /c "docker compose --env-file $envFile -f compose.release.yml exec -T db pg_dump -U $user -d $db --format=custom > $file"
    if ($LASTEXITCODE -ne 0) { throw "Backup failed" }
    Write-Host "Backup written to $file"
  }
  "restore" {
    Require-Docker; Require-Env
    if (-not $Rest -or -not $Rest[0]) { throw "Usage: scripts\landed.ps1 restore <dump file>" }
    $file = $Rest[0]
    $user = Get-EnvValue "POSTGRES_USER"; $db = Get-EnvValue "POSTGRES_DB"
    & cmd /c "docker compose --env-file $envFile -f compose.release.yml exec -T db pg_restore -U $user -d $db --clean --if-exists --no-owner --exit-on-error < $file"
    if ($LASTEXITCODE -ne 0) { throw "Restore failed" }
    Write-Host "Restored $file into $db"
  }
  default {
    Write-Error "Usage: scripts\landed.ps1 start|stop|status|logs|backup|restore <file>"
    exit 2
  }
}

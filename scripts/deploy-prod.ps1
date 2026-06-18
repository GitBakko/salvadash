<#
.SYNOPSIS
  SalvaDash production deploy automation — runs ON the prod Windows Server.

.DESCRIPTION
  Automates the incremental-upgrade flow from DEPLOY-GUIDA-IIS.md, with safety
  backups taken BEFORE anything is touched. Idempotent-ish, fail-fast.

  Steps:
    1. Preflight   — validate staging package structure, app .env, pg_dump
    2. Backup DB   — pg_dump -Fc into <app>\backend\backups\
    3. Backup app  — zip of <app> (minus node_modules) next to <app>
    4. Stop        — Stop-Website + pm2 stop  (NEVER iisreset)
    5. Copy        — staging -> app, PRESERVING .env / uploads / backups / logs / web.config
    6. Deps + DB   — pnpm install --filter backend --frozen-lockfile; prisma generate + db push
    7. Restart     — pm2 restart + Start-Website
    8. Verify      — poll /api/health (backend :3000 and IIS)
    9. On failure  — prints exact rollback commands (restore is MANUAL by design)

  Credentials are READ from <app>\backend\.env (DATABASE_URL, PG_BIN_PATH) — never
  hard-coded here.

.PARAMETER Version
  Release version being deployed, e.g. "1.3.0". Used to default the staging path.

.PARAMETER AppPath
  Live app root. Default: E:\www\salvadash

.PARAMETER StagingPath
  Extracted release package. Default: E:\www\salvadash-v<Version>

.PARAMETER SiteName
  IIS site name. Default: Salvadash

.PARAMETER Pm2Process
  PM2 process name. Default: salvadash-api

.PARAMETER AppPoolName
  Optional IIS app pool to recycle after Start-Website.

.PARAMETER SkipDbBackup
  Skip the pg_dump backup (NOT recommended).

.PARAMETER SkipDbPush
  Skip `prisma db push` (use when the release has no schema changes).

.PARAMETER HealthTimeoutSec
  Seconds to wait for /api/health to come up. Default: 60

.EXAMPLE
  # PowerShell as Administrator on the prod server:
  cd E:\www\salvadash-v1.3.0
  .\scripts\deploy-prod.ps1 -Version 1.3.0
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [string]$AppPath = 'E:\www\salvadash',
  [string]$StagingPath = '',
  [string]$SiteName = 'Salvadash',
  [string]$Pm2Process = 'salvadash-api',
  [string]$AppPoolName = '',
  [switch]$SkipDbBackup,
  [switch]$SkipDbPush,
  [int]$HealthTimeoutSec = 60
)

$ErrorActionPreference = 'Stop'
$ts = Get-Date -Format 'yyyyMMdd_HHmmss'
if ([string]::IsNullOrWhiteSpace($StagingPath)) {
  $StagingPath = Join-Path (Split-Path $AppPath -Parent) "salvadash-v$Version"
}

# ── Console helpers ─────────────────────────────────────────
function Write-Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)        { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Info($msg)      { Write-Host "    --  $msg" -ForegroundColor DarkGray }
function Fail($msg)            { throw $msg }

# Tracks state for the rollback hint on failure.
$script:dbBackupFile  = $null
$script:appBackupFile = $null
$script:stopped       = $false

Write-Host "==================================================================" -ForegroundColor White
Write-Host " SalvaDash deploy -> v$Version" -ForegroundColor White
Write-Host "   App     : $AppPath" -ForegroundColor White
Write-Host "   Staging : $StagingPath" -ForegroundColor White
Write-Host "   Site    : $SiteName   PM2: $Pm2Process" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor White

try {
  # ════════════════════════════════════════════════════════════
  # 1. PREFLIGHT
  # ════════════════════════════════════════════════════════════
  Write-Step 1 'Preflight checks'

  # Admin check (warn only — copying into E:\www and IIS cmdlets need elevation)
  $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) { Write-Host '    !!  Not running as Administrator — IIS/copy steps may fail.' -ForegroundColor Yellow }

  if (-not (Test-Path $StagingPath)) { Fail "Staging path not found: $StagingPath (upload + extract the release zip first)" }
  if (-not (Test-Path $AppPath))     { Fail "App path not found: $AppPath" }

  # Structural validation of the release package (mirrors package-release.mjs gotchas)
  $fe = Join-Path $StagingPath 'frontend'
  $checks = @(
    @{ ok = (Test-Path (Join-Path $fe 'index.html'));                       msg = 'frontend/index.html present (flattened)' },
    @{ ok = (-not (Test-Path (Join-Path $fe 'web.config')));                msg = 'frontend/web.config absent (prod keeps its own)' },
    @{ ok = (-not (Test-Path (Join-Path $fe 'dist')));                      msg = 'frontend NOT double-nested (no frontend/dist/)' },
    @{ ok = (Test-Path (Join-Path $fe 'assets'));                           msg = 'frontend/assets/ present' },
    @{ ok = (Test-Path (Join-Path $StagingPath 'backend\dist\index.js'));   msg = 'backend/dist/index.js built' },
    @{ ok = (Test-Path (Join-Path $StagingPath 'backend\prisma\schema.prisma')); msg = 'backend/prisma/schema.prisma present' },
    @{ ok = (Test-Path (Join-Path $StagingPath 'shared\dist'));             msg = 'shared/dist present' },
    @{ ok = (Test-Path (Join-Path $StagingPath 'pnpm-lock.yaml'));          msg = 'pnpm-lock.yaml present' }
  )
  $structOk = $true
  foreach ($c in $checks) {
    if ($c.ok) { Write-Ok $c.msg } else { Write-Host "    XX  $($c.msg)" -ForegroundColor Red; $structOk = $false }
  }
  if (-not $structOk) { Fail 'Staging package failed structural validation — do NOT deploy.' }

  # App .env (preserved, never shipped) — source of DB creds + PG_BIN_PATH
  $envFile = Join-Path $AppPath 'backend\.env'
  if (-not (Test-Path $envFile)) { Fail "Missing $envFile — first-time setup must create it (see DEPLOY-GUIDA-IIS.md)." }
  Write-Ok 'backend\.env present'

  $envText = Get-Content $envFile -Raw
  function Get-EnvVal($name) {
    $m = [regex]::Match($envText, "(?m)^\s*$name\s*=\s*`"?([^`"\r\n]+)`"?\s*$")
    if ($m.Success) { return $m.Groups[1].Value.Trim() } else { return $null }
  }

  $dbUrl = Get-EnvVal 'DATABASE_URL'
  if (-not $dbUrl) { Fail 'DATABASE_URL not found in backend\.env' }
  $m = [regex]::Match($dbUrl, '^postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?]+)')
  if (-not $m.Success) { Fail "Could not parse DATABASE_URL (expected postgresql://user:pass@host:port/db). Got: $dbUrl" }
  $dbUser = [System.Uri]::UnescapeDataString($m.Groups[1].Value)
  $dbPass = [System.Uri]::UnescapeDataString($m.Groups[2].Value)
  $dbHost = $m.Groups[3].Value
  $dbPort = $m.Groups[4].Value
  $dbName = $m.Groups[5].Value
  Write-Ok "DB target: $dbUser@${dbHost}:$dbPort/$dbName"

  $pgBin = Get-EnvVal 'PG_BIN_PATH'
  $pgDump = if ($pgBin) { Join-Path $pgBin 'pg_dump.exe' } else { 'pg_dump' }
  if ($pgBin -and -not (Test-Path $pgDump)) { Fail "pg_dump not found at $pgDump (check PG_BIN_PATH)." }
  Write-Ok "pg_dump: $pgDump"

  # ════════════════════════════════════════════════════════════
  # 2. BACKUP DATABASE
  # ════════════════════════════════════════════════════════════
  Write-Step 2 'Backup database (pg_dump -Fc)'
  if ($SkipDbBackup) {
    Write-Host '    !!  -SkipDbBackup set — skipping DB backup.' -ForegroundColor Yellow
  } else {
    $backupDir = Join-Path $AppPath 'backend\backups'
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }
    $script:dbBackupFile = Join-Path $backupDir "predeploy_${dbName}_$ts.dump"
    $env:PGPASSWORD = $dbPass
    try {
      & $pgDump --host $dbHost --port $dbPort --username $dbUser --dbname $dbName `
        --format=custom --no-owner --no-privileges --file $script:dbBackupFile
      if ($LASTEXITCODE -ne 0) { Fail "pg_dump exited with code $LASTEXITCODE" }
    } finally {
      Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
    $sz = [math]::Round((Get-Item $script:dbBackupFile).Length / 1MB, 2)
    if ($sz -le 0) { Fail "DB backup file is empty: $script:dbBackupFile" }
    Write-Ok "DB backup: $script:dbBackupFile ($sz MB)"
  }

  # ════════════════════════════════════════════════════════════
  # 3. BACKUP APP (filesystem)
  # ════════════════════════════════════════════════════════════
  Write-Step 3 'Backup app folder (zip, minus node_modules/logs/backups)'
  $script:appBackupFile = Join-Path (Split-Path $AppPath -Parent) "salvadash-app-backup_$ts.zip"
  # Stage with robocopy (same drive as the app), then zip the staged copy. robocopy /XD
  # excludes dir NAMES anywhere in the tree — node_modules (the bulk), live PM2 `logs`
  # (held open by the pm2 daemon → can't be read by Compress-Archive), and the `backups`
  # dump dir (huge + redundant). /XF *.log skips any stray logs. This preserves .env,
  # uploads, dist, prisma — everything needed for a rollback.
  $tmpCopy = Join-Path (Split-Path $AppPath -Parent) "salvadash-bktmp_$ts"
  try {
    & robocopy $AppPath $tmpCopy /E /XD node_modules logs backups /XF *.log /R:1 /W:1 /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    # robocopy exit codes: 0-7 = success (1=files copied, etc.); >=8 = real failure.
    if ($LASTEXITCODE -ge 8) { Fail "robocopy failed (exit $LASTEXITCODE) staging app backup" }
    $global:LASTEXITCODE = 0
    Compress-Archive -Path (Join-Path $tmpCopy '*') -DestinationPath $script:appBackupFile -CompressionLevel Optimal -Force
  } finally {
    if (Test-Path $tmpCopy) { Remove-Item $tmpCopy -Recurse -Force -ErrorAction SilentlyContinue }
  }
  $asz = [math]::Round((Get-Item $script:appBackupFile).Length / 1MB, 2)
  Write-Ok "App backup: $script:appBackupFile ($asz MB)"

  # ════════════════════════════════════════════════════════════
  # 4. STOP services  (NEVER iisreset — site-scoped only)
  # ════════════════════════════════════════════════════════════
  Write-Step 4 "Stop site '$SiteName' + PM2 '$Pm2Process'"
  Import-Module WebAdministration -ErrorAction SilentlyContinue
  if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Stop-Website -Name $SiteName; Write-Ok "Stopped site '$SiteName'"
  } else {
    Write-Host "    !!  IIS site '$SiteName' not found — skipping site stop." -ForegroundColor Yellow
  }
  & pm2 stop $Pm2Process 2>&1 | Out-Null
  $script:stopped = $true
  Write-Ok "Stopped PM2 '$Pm2Process'"

  # ════════════════════════════════════════════════════════════
  # 5. COPY release -> app  (preserve runtime state)
  # ════════════════════════════════════════════════════════════
  Write-Step 5 'Copy release files (preserving .env / uploads / backups / logs / web.config)'

  # Helper: replace a build-output dir wholesale (remove then copy).
  function Sync-Dir($from, $to) {
    if (-not (Test-Path $from)) { Fail "Expected in staging but missing: $from" }
    if (Test-Path $to) { Remove-Item $to -Recurse -Force }
    Copy-Item $from $to -Recurse -Force
  }

  # frontend: refresh everything EXCEPT the prod-owned web.config.
  $feTo = Join-Path $AppPath 'frontend'
  if (-not (Test-Path $feTo)) { New-Item -ItemType Directory -Path $feTo -Force | Out-Null }
  Get-ChildItem -Path $feTo -Force | Where-Object { $_.Name -ne 'web.config' } | Remove-Item -Recurse -Force
  Copy-Item (Join-Path $fe '*') $feTo -Recurse -Force
  Write-Ok 'frontend refreshed (web.config preserved)'

  # shared (compiled)
  Sync-Dir (Join-Path $StagingPath 'shared\dist') (Join-Path $AppPath 'shared\dist')
  Copy-Item (Join-Path $StagingPath 'shared\package.json') (Join-Path $AppPath 'shared\package.json') -Force
  Write-Ok 'shared/dist refreshed'

  # backend: dist + prisma are build output; .env/uploads/backups/logs preserved (not in staging)
  Sync-Dir (Join-Path $StagingPath 'backend\dist')   (Join-Path $AppPath 'backend\dist')
  Sync-Dir (Join-Path $StagingPath 'backend\prisma') (Join-Path $AppPath 'backend\prisma')
  foreach ($f in @('package.json', 'prisma.config.ts', 'ecosystem.config.json')) {
    Copy-Item (Join-Path $StagingPath "backend\$f") (Join-Path $AppPath "backend\$f") -Force
  }
  Write-Ok 'backend dist/prisma/config refreshed (.env, uploads, backups, logs preserved)'

  # root workspace files
  foreach ($f in @('package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml')) {
    Copy-Item (Join-Path $StagingPath $f) (Join-Path $AppPath $f) -Force
  }
  Write-Ok 'root workspace files refreshed'

  # ════════════════════════════════════════════════════════════
  # 6. Dependencies + DB schema
  # ════════════════════════════════════════════════════════════
  Write-Step 6 'pnpm install + prisma'
  Push-Location $AppPath
  try {
    & pnpm install --filter backend --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install exited with code $LASTEXITCODE" }
    Write-Ok 'pnpm install (backend) done'
  } finally { Pop-Location }

  Push-Location (Join-Path $AppPath 'backend')
  try {
    & npx prisma generate
    if ($LASTEXITCODE -ne 0) { Fail "prisma generate exited with code $LASTEXITCODE" }
    Write-Ok 'prisma generate done'
    if ($SkipDbPush) {
      Write-Host '    !!  -SkipDbPush set — skipping prisma db push.' -ForegroundColor Yellow
    } else {
      & npx prisma db push
      if ($LASTEXITCODE -ne 0) { Fail "prisma db push exited with code $LASTEXITCODE" }
      Write-Ok 'prisma db push done'
    }
  } finally { Pop-Location }

  # ════════════════════════════════════════════════════════════
  # 7. RESTART services
  # ════════════════════════════════════════════════════════════
  Write-Step 7 'Restart PM2 + site'
  & pm2 restart $Pm2Process
  if ($LASTEXITCODE -ne 0) { Fail "pm2 restart exited with code $LASTEXITCODE" }
  & pm2 save 2>&1 | Out-Null
  Write-Ok "PM2 '$Pm2Process' restarted"
  if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Start-Website -Name $SiteName; Write-Ok "Started site '$SiteName'"
  }
  if ($AppPoolName) { Restart-WebAppPool -Name $AppPoolName; Write-Ok "Recycled app pool '$AppPoolName'" }
  $script:stopped = $false

  # ════════════════════════════════════════════════════════════
  # 8. VERIFY
  # ════════════════════════════════════════════════════════════
  Write-Step 8 "Verify /api/health (timeout ${HealthTimeoutSec}s)"
  function Wait-Health($url, $timeoutSec) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
      try {
        $r = Invoke-RestMethod -Uri $url -TimeoutSec 5
        if ($r.status -eq 'ok' -or $r.success -eq $true) { return $r }
      } catch { Start-Sleep -Seconds 2 }
    }
    return $null
  }
  $be = Wait-Health 'http://localhost:3000/api/health' $HealthTimeoutSec
  if (-not $be) { Fail 'Backend /api/health did not become healthy (PM2 :3000).' }
  Write-Ok 'backend :3000 healthy'
  $iis = Wait-Health 'http://localhost/api/health' 20
  if (-not $iis) { Write-Host '    !!  IIS proxy /api/health not confirmed — check ARR/site bindings.' -ForegroundColor Yellow }
  else { Write-Ok 'IIS reverse-proxy healthy' }

  # ════════════════════════════════════════════════════════════
  # DONE
  # ════════════════════════════════════════════════════════════
  Write-Host "`n==================================================================" -ForegroundColor Green
  Write-Host " DEPLOY OK -> v$Version" -ForegroundColor Green
  Write-Host "==================================================================" -ForegroundColor Green
  Write-Host " Backups (keep until verified in browser):"
  if ($script:dbBackupFile)  { Write-Host "   DB : $script:dbBackupFile" }
  Write-Host "   App: $script:appBackupFile"
  Write-Host "`n Next: hard-refresh https://salvadash.epartner.it , confirm footer shows v$Version," -ForegroundColor White
  Write-Host "       then smoke-test login / dashboard / analytics (see UPGRADE-v$Version.md)." -ForegroundColor White
}
catch {
  Write-Host "`n==================================================================" -ForegroundColor Red
  Write-Host " DEPLOY FAILED: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "==================================================================" -ForegroundColor Red
  if ($script:stopped) {
    Write-Host ' Services are STOPPED. ROLLBACK (manual):' -ForegroundColor Yellow
  } else {
    Write-Host ' ROLLBACK (manual) if needed:' -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host '  # 1. Restore app files' -ForegroundColor DarkGray
  if ($script:appBackupFile) {
    Write-Host "  Expand-Archive -Path '$script:appBackupFile' -DestinationPath '$AppPath' -Force"
  } else {
    Write-Host '  (no app backup was taken)'
  }
  Write-Host ''
  Write-Host '  # 2. Restore database (drops + recreates objects from the dump)' -ForegroundColor DarkGray
  if ($script:dbBackupFile) {
    $pgRestore = if ($pgBin) { Join-Path $pgBin 'pg_restore.exe' } else { 'pg_restore' }
    Write-Host "  `$env:PGPASSWORD='<db-pass>'; & '$pgRestore' --host $dbHost --port $dbPort --username $dbUser --dbname $dbName --clean --if-exists --no-owner '$script:dbBackupFile'"
  } else {
    Write-Host '  (no DB backup was taken)'
  }
  Write-Host ''
  Write-Host '  # 3. Restart services' -ForegroundColor DarkGray
  Write-Host "  pm2 restart $Pm2Process ; Import-Module WebAdministration ; Start-Website -Name '$SiteName'"
  Write-Host ''
  exit 1
}

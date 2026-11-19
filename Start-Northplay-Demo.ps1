$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host 'Node.js 24 or newer is required. Install it from https://nodejs.org, then reopen this launcher.' -ForegroundColor Red
  exit 1
}

$nodeVersion = (& node -p "process.versions.node").Trim()
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 24) {
  Write-Host "Node.js 24 or newer is required. Found $nodeVersion. Install the current LTS release, then reopen this launcher." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host 'npm was not found. Reinstall Node.js with the option to add it to PATH, then reopen this launcher.' -ForegroundColor Red
  exit 1
}

$envPath = Join-Path $PSScriptRoot '.env'
$envText = if (Test-Path -LiteralPath $envPath) { [System.IO.File]::ReadAllText($envPath) } else { '' }
$settings = @{}
foreach ($line in ($envText -split "`r?`n")) {
  if ($line -match '^\s*([A-Z_][A-Z0-9_]*)\s*=(.*)$') {
    $settings[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
  }
}

$pendingSettings = [System.Collections.Generic.List[string]]::new()
if ([string]::IsNullOrWhiteSpace($settings['BOOTSTRAP_ADMIN_EMAIL'])) {
  do {
    $adminEmail = (Read-Host 'Choose a local operator email for /admin').Trim().ToLowerInvariant()
    if ($adminEmail -notmatch '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') {
      Write-Host 'Enter a valid email address.' -ForegroundColor Yellow
    }
  } while ($adminEmail -notmatch '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
  $pendingSettings.Add("BOOTSTRAP_ADMIN_EMAIL=$adminEmail")
}

if ([string]::IsNullOrWhiteSpace($settings['BOOTSTRAP_ADMIN_PASSWORD'])) {
  $adminPassword = $null
  while (-not $adminPassword) {
    $securePassword = Read-Host 'Choose a local operator password (12+ characters: letters, numbers, ! @ % $ _ . -)' -AsSecureString
    $secureConfirm = Read-Host 'Enter the password again' -AsSecureString
    $passwordPointer = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $confirmPointer = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureConfirm)
    try {
      $candidate = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
      $confirmation = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPointer)
    } finally {
      [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
      [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPointer)
    }
    if ($candidate -notmatch '^[A-Za-z0-9!@%$_.-]{12,128}$') {
      Write-Host 'Use 12 to 128 characters from the allowed set shown in the prompt.' -ForegroundColor Yellow
      continue
    }
    if ($candidate -cne $confirmation) {
      Write-Host 'The passwords did not match. Try again.' -ForegroundColor Yellow
      continue
    }
    $adminPassword = $candidate
    $pendingSettings.Add("BOOTSTRAP_ADMIN_PASSWORD=$adminPassword")
    $candidate = $null
    $confirmation = $null
  }
}

if ([string]::IsNullOrWhiteSpace($settings['PROVIDER_KEY_ENCRYPTION'])) {
  $keyBytes = New-Object byte[] 32
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $random.GetBytes($keyBytes) } finally { $random.Dispose() }
  $encryptionKey = ([System.BitConverter]::ToString($keyBytes)).Replace('-', '').ToLowerInvariant()
  [System.Array]::Clear($keyBytes, 0, $keyBytes.Length)
  $pendingSettings.Add("PROVIDER_KEY_ENCRYPTION=$encryptionKey")
  $encryptionKey = $null
}

if ($pendingSettings.Count -gt 0) {
  if (-not (Test-Path -LiteralPath $envPath)) {
    [System.IO.File]::WriteAllText($envPath, "# Northplay local demo settings. Keep this file private.`r`n", [System.Text.Encoding]::ASCII)
  } elseif ($envText.Length -gt 0 -and -not $envText.EndsWith("`n")) {
    [System.IO.File]::AppendAllText($envPath, "`r`n", [System.Text.Encoding]::ASCII)
  }
  [System.IO.File]::AppendAllText($envPath, ($pendingSettings -join "`r`n") + "`r`n", [System.Text.Encoding]::ASCII)
  Write-Host 'Saved the local operator settings in .env. Keep that file private; the encryption key must stay the same for this demo database.' -ForegroundColor Green
}

$preferredPort = 3000
if ($settings['PORT'] -match '^\d{1,5}$') {
  $configuredPort = [int]$settings['PORT']
  if ($configuredPort -ge 1 -and $configuredPort -le 65515) { $preferredPort = $configuredPort }
}
function Test-LocalPortAvailable([int]$Port) {
  $probe = $null
  try {
    $probe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $probe.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($null -ne $probe) { $probe.Stop() }
  }
}
$selectedPort = $preferredPort
$lastPort = [Math]::Min(65535, $preferredPort + 20)
while ($selectedPort -le $lastPort -and -not (Test-LocalPortAvailable $selectedPort)) { $selectedPort += 1 }
if ($selectedPort -gt $lastPort) {
  Write-Host "No available local port was found between $preferredPort and $lastPort. Close another application and run the launcher again." -ForegroundColor Red
  exit 1
}
$env:PORT = [string]$selectedPort
if ($selectedPort -ne $preferredPort) {
  Write-Host "Port $preferredPort is already in use. Using port $selectedPort for this demo run." -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Starting the Northplay demo. Keep this window open.' -ForegroundColor Green
Write-Host "Open http://localhost:$selectedPort for the player lobby or http://localhost:$selectedPort/admin for the operator account."
Write-Host 'Press Ctrl+C in this window to stop the demo.'
Write-Host ''
npm run dev

param(
  [string]$Version = ''
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$packageJsonPath = Join-Path $root 'package.json'

if (-not $Version) {
  $package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
  $Version = [string]$package.version
}

if (-not $Version) {
  throw 'Release version is missing. Set package.json version or pass -Version.'
}

Push-Location $root
try {
  npm.cmd run companion:build-exe
  if ($LASTEXITCODE -ne 0) {
    throw "companion:build-exe failed with exit code $LASTEXITCODE."
  }
  npm.cmd run companion:build-installer
  if ($LASTEXITCODE -ne 0) {
    throw "companion:build-installer failed with exit code $LASTEXITCODE."
  }

  $installerPath = Join-Path $root 'dist\wzpro-companion-installer\WZPRO Companion Setup.exe'
  $exePath = Join-Path $root 'dist\wzpro-companion\WZPRO Companion.exe'
  $zipPath = Join-Path $root 'dist\wzpro-companion\WZPRO Companion.zip'
  $downloadsDir = Join-Path $root 'public\downloads'
  $publicInstallerPath = Join-Path $downloadsDir 'WZPRO-Companion-Setup.exe'
  $versionedDownloadsDir = Join-Path $downloadsDir ("wzpro-companion\v" + $Version)
  $versionedInstallerPath = Join-Path $versionedDownloadsDir 'WZPRO-Companion-Setup.exe'
  $releaseDir = Join-Path $root ("dist\releases\wzpro-companion-v" + $Version)
  $manifestPath = Join-Path $releaseDir 'release.json'
  $notesPath = Join-Path $releaseDir 'release-notes.md'

  New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null
  New-Item -ItemType Directory -Force -Path $versionedDownloadsDir | Out-Null
  New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
  Copy-Item -Force -LiteralPath $installerPath -Destination $publicInstallerPath
  Copy-Item -Force -LiteralPath $installerPath -Destination $versionedInstallerPath

  $files = @(
    @{ name = 'WZPRO Companion Setup.exe'; path = $installerPath; role = 'installer' },
    @{ name = 'WZPRO Companion.exe'; path = $exePath; role = 'launcher' },
    @{ name = 'WZPRO Companion.zip'; path = $zipPath; role = 'portable-package' },
    @{ name = 'WZPRO-Companion-Setup.exe'; path = $publicInstallerPath; role = 'public-download' },
    @{ name = 'WZPRO-Companion-Setup.exe'; path = $versionedInstallerPath; role = 'versioned-public-download' }
  )

  $items = foreach ($file in $files) {
    $item = Get-Item -LiteralPath $file.path
    $hash = Get-FileHash -LiteralPath $file.path -Algorithm SHA256
    [ordered]@{
      name = $file.name
      role = $file.role
      path = $item.FullName
      size = $item.Length
      sha256 = $hash.Hash
    }
  }

  $manifest = [ordered]@{
    product = 'WZPRO Companion'
    version = $Version
    channel = 'public-preview'
    createdAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    downloadUrl = "https://wzprometa.com/downloads/wzpro-companion/v$Version/WZPRO-Companion-Setup.exe"
    latestDownloadUrl = 'https://wzprometa.com/downloads/WZPRO-Companion-Setup.exe'
    documentationUrl = 'https://wzprometa.com/companion'
    files = $items
  }

  $manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -Path $manifestPath

  $notes = @(
    "# WZPRO Companion v$Version",
    "",
    "Initial public preview release.",
    "",
    "## Included",
    "",
    "- WZPRO account connection flow.",
    "- Language selection on first launch.",
    "- Free Access and Premium navigation.",
    "- Local Warzone end-of-game statistics import companion.",
    "- Inno Setup Windows installer.",
    "",
    "## Links",
    "",
    "- Download: https://wzprometa.com/downloads/WZPRO-Companion-Setup.exe",
    "- Documentation: https://wzprometa.com/companion",
    "",
    "## Installer SHA256",
    "",
    '```text',
    ($items | Where-Object { $_.role -eq 'installer' } | Select-Object -First 1).sha256,
    '```'
  )
  $notes | Set-Content -Encoding UTF8 -Path $notesPath

  Write-Output "Prepared WZPRO Companion v$Version release."
  Write-Output "Manifest: $manifestPath"
  Write-Output "Notes: $notesPath"
  Write-Output "Public installer: $publicInstallerPath"
} finally {
  Pop-Location
}

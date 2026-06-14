param(
  [string]$PackageDir = 'dist\wzpro-companion',
  [string]$OutputDir = 'dist\wzpro-companion-installer',
  [string]$InnoSetupPath = ''
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$packagePath = Join-Path $root $PackageDir
$fullOutput = Join-Path $root $OutputDir
$installerScript = Join-Path $root 'scripts\installer\WZPROCompanion.iss'
$packageJsonPath = Join-Path $root 'package.json'

if (-not (Test-Path (Join-Path $packagePath 'WZPRO Companion.exe'))) {
  throw "Companion package not found at $packagePath. Run npm run companion:build-exe first."
}

if (-not (Test-Path $installerScript)) {
  throw "Installer script not found: $installerScript"
}

$version = '0.1.0'
if (Test-Path $packageJsonPath) {
  $package = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
  if ($package.version) {
    $version = [string]$package.version
  }
}

$iscc = $InnoSetupPath
if (-not $iscc) {
  $command = Get-Command iscc.exe -ErrorAction SilentlyContinue
  if ($command) {
    $iscc = $command.Source
  }
}

if (-not $iscc) {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe"
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      $iscc = $candidate
      break
    }
  }
}

if (-not $iscc -or -not (Test-Path $iscc)) {
  throw "Inno Setup Compiler (ISCC.exe) not found. Install Inno Setup 6, then run npm run companion:build-installer."
}

New-Item -ItemType Directory -Force -Path $fullOutput | Out-Null
$env:WZPRO_COMPANION_VERSION = $version
$env:WZPRO_COMPANION_SOURCE = (Resolve-Path $packagePath).Path
$env:WZPRO_COMPANION_INSTALLER_OUTPUT = (Resolve-Path $fullOutput).Path

& $iscc $installerScript

$setupPath = Join-Path $fullOutput 'WZPRO Companion Setup.exe'
if (Test-Path $setupPath) {
  $hash = Get-FileHash $setupPath -Algorithm SHA256
  Write-Output "Built installer: $setupPath"
  Write-Output "SHA256: $($hash.Hash)"
} else {
  throw "Installer build finished but output was not found: $setupPath"
}

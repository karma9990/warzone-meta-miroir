param(
  [string]$OutputDir = 'dist\wzpro-companion',
  [string]$IconPath = 'scripts\wzpro-companion.ico'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$fullOutput = Join-Path $root $OutputDir
$sourcePath = Join-Path $root 'scripts\WZPROCompanionApp.cs'
$exePath = Join-Path $fullOutput 'WZPRO Companion.exe'
$resolvedIconPath = if ([System.IO.Path]::IsPathRooted($IconPath)) { $IconPath } else { Join-Path $root $IconPath }
$runtimeDir = Join-Path $fullOutput 'runtime'
$appDir = Join-Path $fullOutput 'app'
$zipPath = Join-Path $fullOutput 'WZPRO Companion.zip'
$nodeModulesSource = Join-Path $root 'node_modules'
$nodeModulesTarget = Join-Path $fullOutput 'node_modules'
$companionModules = @(
  'tesseract.js',
  'bmp-js',
  'idb-keyval',
  'is-url',
  'node-fetch',
  'opencollective-postinstall',
  'regenerator-runtime',
  'tesseract.js-core',
  'wasm-feature-detect',
  'zlibjs',
  'whatwg-url',
  'webidl-conversions',
  'tr46'
)

New-Item -ItemType Directory -Force -Path $fullOutput | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
New-Item -ItemType Directory -Force -Path $appDir | Out-Null

$cscCommand = Get-Command csc.exe -ErrorAction SilentlyContinue
$cscPath = if ($cscCommand) { $cscCommand.Source } else { '' }
if (-not $cscPath) {
  $frameworkCsc = Get-ChildItem "$env:WINDIR\Microsoft.NET\Framework64" -Recurse -Filter csc.exe -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if ($frameworkCsc) {
    $cscPath = $frameworkCsc.FullName
  }
}

if (-not $cscPath) {
  throw 'csc.exe not found. Install .NET SDK or Visual Studio Build Tools to build the companion launcher exe.'
}

$cscArgs = @('/nologo', '/target:winexe', "/out:$exePath", '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', '/reference:System.Net.Http.dll')
if (Test-Path $resolvedIconPath) {
  $cscArgs += "/win32icon:$resolvedIconPath"
  Write-Output "Embedding icon: $resolvedIconPath"
} else {
  Write-Warning "Icon not found at $resolvedIconPath - build continues with the default Windows exe icon."
}
$cscArgs += $sourcePath

& $cscPath @cscArgs

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  throw 'node.exe not found. Install Node.js before building the companion package.'
}

Copy-Item -Force -Path $nodeCommand.Source -Destination (Join-Path $runtimeDir 'node.exe')
Copy-Item -Force -Path (Join-Path $root 'scripts\wzpro-companion.mjs') -Destination (Join-Path $appDir 'wzpro-companion.mjs')
if (Test-Path $resolvedIconPath) {
  Copy-Item -Force -Path $resolvedIconPath -Destination (Join-Path $appDir 'wzpro-companion.ico')
}

if (-not (Test-Path $nodeModulesSource)) {
  throw 'node_modules not found. Run npm install before building the companion package.'
}

Write-Output "Copying Node dependencies. This can take a little while..."
if (Test-Path $nodeModulesTarget) {
  $resolvedTarget = (Resolve-Path $nodeModulesTarget).Path
  $resolvedOutput = (Resolve-Path $fullOutput).Path
  if (-not $resolvedTarget.StartsWith($resolvedOutput, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean node_modules outside the companion output directory: $resolvedTarget"
  }
  Remove-Item -Recurse -Force -LiteralPath $nodeModulesTarget
}
New-Item -ItemType Directory -Force -Path $nodeModulesTarget | Out-Null
foreach ($moduleName in $companionModules) {
  $moduleSource = Join-Path $nodeModulesSource $moduleName
  if (Test-Path $moduleSource) {
    Copy-Item -Recurse -Force -Path $moduleSource -Destination (Join-Path $nodeModulesTarget $moduleName)
  }
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Write-Output "Creating download package..."
Compress-Archive -Path (Join-Path $fullOutput '*') -DestinationPath $zipPath -Force

Write-Output "Built $exePath"
Write-Output "Packaged runtime: $runtimeDir"
Write-Output "Packaged engine: $appDir"
Write-Output "Packaged download: $zipPath"

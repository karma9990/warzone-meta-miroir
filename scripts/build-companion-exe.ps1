param(
  [string]$OutputDir = 'dist\wzpro-companion',
  [string]$IconPath = 'scripts\wzpro-companion.ico'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$fullOutput = Join-Path $root $OutputDir
# The companion app is split across partial-class files (WZPROCompanionApp*.cs); compile them all.
$sourceDir = Join-Path $root 'scripts'
$sourcePaths = @(Get-ChildItem -Path $sourceDir -Filter 'WZPROCompanionApp*.cs' | Sort-Object Name | ForEach-Object { $_.FullName })
if ($sourcePaths.Count -eq 0) { throw "No WZPROCompanionApp*.cs source files found in $sourceDir." }
$exePath = Join-Path $fullOutput 'WZPRO Companion.exe'
$resolvedIconPath = if ([System.IO.Path]::IsPathRooted($IconPath)) { $IconPath } else { Join-Path $root $IconPath }
$runtimeDir = Join-Path $fullOutput 'runtime'
$appDir = Join-Path $fullOutput 'app'
$zipPath = Join-Path $fullOutput 'WZPRO Companion.zip'
$nodeModulesSource = Join-Path $root 'node_modules'
$nodeModulesTarget = Join-Path $fullOutput 'node_modules'
$companionModules = @(
  'ffmpeg-static',
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

foreach ($dir in @($runtimeDir, $appDir)) {
  if (Test-Path $dir) {
    $resolvedDir = (Resolve-Path $dir).Path
    $resolvedOutput = (Resolve-Path $fullOutput).Path
    if (-not $resolvedDir.StartsWith($resolvedOutput, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to clean directory outside the companion output directory: $resolvedDir"
    }
    Remove-Item -Recurse -Force -LiteralPath $dir
  }
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

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

$cscArgs = @('/nologo', '/target:winexe', "/out:$exePath", '/reference:System.Windows.Forms.dll', '/reference:System.Drawing.dll', '/reference:System.Net.Http.dll', '/reference:System.Security.dll')
if (Test-Path $resolvedIconPath) {
  $cscArgs += "/win32icon:$resolvedIconPath"
  Write-Output "Embedding icon: $resolvedIconPath"
} else {
  Write-Warning "Icon not found at $resolvedIconPath - build continues with the default Windows exe icon."
}
$manifestPath = Join-Path $root 'scripts\wzpro-companion.manifest'
if (Test-Path $manifestPath) {
  $cscArgs += "/win32manifest:$manifestPath"
  Write-Output "Embedding manifest (requireAdministrator): $manifestPath"
} else {
  Write-Warning "Manifest not found at $manifestPath - exe will not request admin rights."
}
$cscArgs += $sourcePaths

& $cscPath @cscArgs
if ($LASTEXITCODE -ne 0) {
  throw "csc.exe failed with exit code $LASTEXITCODE."
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  throw 'node.exe not found. Install Node.js before building the companion package.'
}

Copy-Item -Force -Path $nodeCommand.Source -Destination (Join-Path $runtimeDir 'node.exe')
Copy-Item -Force -Path (Join-Path $root 'scripts\wzpro-companion.mjs') -Destination (Join-Path $appDir 'wzpro-companion.mjs')
$fontPath = Join-Path $root 'font\bisou-font\copyrightbolditalicstudio-bisouexpandedtrial.otf'
if (Test-Path $fontPath) {
  Copy-Item -Force -Path $fontPath -Destination (Join-Path $appDir 'bisou-expanded.otf')
}
if (Test-Path $resolvedIconPath) {
  Copy-Item -Force -Path $resolvedIconPath -Destination (Join-Path $appDir 'wzpro-companion.ico')
}
$brandLogoPath = Join-Path $root 'public\brand\WZ__1_-removebg-preview.png'
if (Test-Path $brandLogoPath) {
  Copy-Item -Force -Path $brandLogoPath -Destination (Join-Path $appDir 'wzpro-logo.png')
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
$tempZipPath = Join-Path ([System.IO.Path]::GetTempPath()) ('WZPRO Companion-' + [System.Guid]::NewGuid().ToString('N') + '.zip')
$packageItems = @(
  $exePath,
  $runtimeDir,
  $appDir,
  $nodeModulesTarget
)
try {
  Compress-Archive -Path $packageItems -DestinationPath $tempZipPath -Force
  Move-Item -Force -LiteralPath $tempZipPath -Destination $zipPath
} finally {
  if (Test-Path $tempZipPath) {
    Remove-Item -LiteralPath $tempZipPath -Force -ErrorAction SilentlyContinue
  }
}

Write-Output "Built $exePath"
Write-Output "Packaged runtime: $runtimeDir"
Write-Output "Packaged engine: $appDir"
Write-Output "Packaged download: $zipPath"

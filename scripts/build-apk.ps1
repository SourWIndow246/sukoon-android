$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskTools = Join-Path $root '.tools'
$taskJdk = Get-ChildItem -LiteralPath (Join-Path $taskTools 'java') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($taskJdk) { $env:JAVA_HOME = $taskJdk.FullName; $env:PATH = "$($taskJdk.FullName)\bin;$env:PATH" }
if (Test-Path -LiteralPath (Join-Path $taskTools 'android-sdk')) { $env:ANDROID_HOME = Join-Path $taskTools 'android-sdk' }
$env:GRADLE_USER_HOME = Join-Path $taskTools 'gradle-cache'
$env:NODE_ENV = 'production'
Push-Location (Join-Path $root 'android')
try {
 & .\gradlew.bat assembleRelease '-PreactNativeArchitectures=arm64-v8a' --no-daemon --console=plain
 if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
 $apk = Join-Path $root 'android\app\build\outputs\apk\release\app-release.apk'
 $outDir = Join-Path $root 'releases'
 New-Item -ItemType Directory -Force $outDir | Out-Null
 Copy-Item -LiteralPath $apk -Destination (Join-Path $outDir 'Sukoon-preview.apk')
 Get-Item -LiteralPath (Join-Path $outDir 'Sukoon-preview.apk') | Select-Object FullName,Length
} finally { Pop-Location }

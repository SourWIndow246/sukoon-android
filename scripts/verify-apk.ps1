$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskJdk = Get-ChildItem -LiteralPath (Join-Path $root '.tools/java') -Directory | Select-Object -First 1
if ($taskJdk) { $env:JAVA_HOME = $taskJdk.FullName }
$buildTools = Join-Path $root '.tools/android-sdk/build-tools/36.0.0'
$apk = Join-Path $root 'releases/Sukoon-preview.apk'
& (Join-Path $buildTools 'apksigner.bat') verify --verbose $apk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
& (Join-Path $buildTools 'aapt.exe') dump badging $apk
if ($LASTEXITCODE -ne 0) { throw 'APK metadata verification failed' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($apk)
try {
 $names = $archive.Entries.FullName
 foreach ($required in @('classes.dex', 'assets/index.android.bundle', 'lib/arm64-v8a/libhermes.so')) {
  if ($required -notin $names) { throw "Missing required APK entry: $required" }
 }
 Write-Output 'Verified embedded app bundle, Android classes, and arm64 Hermes runtime.'
} finally { $archive.Dispose() }
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $apk).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$apk.sha256", "$hash  Sukoon-preview.apk`n", [Text.UTF8Encoding]::new($false))
Get-Item -LiteralPath $apk | Select-Object FullName,Length
Write-Output "SHA256: $hash"

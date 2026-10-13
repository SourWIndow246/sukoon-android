$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskJdk = Get-ChildItem -LiteralPath (Join-Path $root '.tools/java') -Directory | Select-Object -First 1
if ($taskJdk) { $env:JAVA_HOME = $taskJdk.FullName }
$buildTools = Join-Path $root '.tools/android-sdk/build-tools/36.0.0'
$apk = Join-Path $root 'releases/Sukoon-preview.apk'
& (Join-Path $buildTools 'apksigner.bat') verify --verbose $apk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
$metadata = & (Join-Path $buildTools 'aapt.exe') dump badging $apk
if ($LASTEXITCODE -ne 0) { throw 'APK metadata verification failed' }
$metadata
if (-not ($metadata -match "uses-permission: name='android.permission.RECORD_AUDIO'")) { throw 'Voice chat microphone permission is missing' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($apk)
try {
 $names = $archive.Entries.FullName
 foreach ($required in @('classes.dex', 'assets/index.android.bundle', 'lib/arm64-v8a/libhermes.so')) {
  if ($required -notin $names) { throw "Missing required APK entry: $required" }
 }
 Write-Output 'Verified embedded app bundle, Android classes, and arm64 Hermes runtime.'
 $voiceClasses = @('expo/modules/speech/SpeechModule', 'expo/modules/speechrecognition/ExpoSpeechRecognitionModule')
 $foundClasses = @{}
 foreach ($entry in $archive.Entries | Where-Object { $_.FullName -match '^classes\d*\.dex$' }) {
  $stream = $entry.Open(); $memory = [IO.MemoryStream]::new()
  try { $stream.CopyTo($memory); $contents = [Text.Encoding]::UTF8.GetString($memory.ToArray()); foreach ($class in $voiceClasses) { if ($contents.Contains($class)) { $foundClasses[$class] = $true } } }
  finally { $stream.Dispose(); $memory.Dispose() }
 }
 foreach ($class in $voiceClasses) { if (-not $foundClasses[$class]) { throw "Missing native voice module: $class" } }
 if ($names -match '(^|/)\.env($|\.)') { throw 'An environment file was unexpectedly bundled' }
 # Check the actual configured server secrets without printing their values.
 $secretValues = @()
 $publicValues = @{}
 $environmentPath = Join-Path $root '.env'
 if (Test-Path -LiteralPath $environmentPath) {
  foreach ($line in [IO.File]::ReadAllLines($environmentPath)) {
   if ($line -match '^\s*(EXPO_PUBLIC_API_URL|EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_ANON_KEY)\s*=\s*(.+?)\s*$') {
    $publicValues[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
   }
   if ($line -match '^\s*(GEMINI_API_KEY|ANTHROPIC_API_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.+?)\s*$') {
    $secretValue = $Matches[2].Trim().Trim('"').Trim("'")
    if ($secretValue.Length -ge 12) { $secretValues += $secretValue }
   }
  }
 }
 foreach ($entry in $archive.Entries | Where-Object { $_.FullName -like 'assets/*' -and $_.Length -gt 0 }) {
  $stream = $entry.Open(); $memory = [IO.MemoryStream]::new()
  try {
   $stream.CopyTo($memory); $assetText = [Text.Encoding]::UTF8.GetString($memory.ToArray())
   if ($entry.FullName -eq 'assets/index.android.bundle') {
    foreach ($publicName in @('EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
     if (-not $publicValues[$publicName] -or -not $assetText.Contains($publicValues[$publicName])) { throw "Configured public setting is absent from the APK bundle: $publicName" }
    }
   }
   foreach ($secretValue in $secretValues) { if ($assetText.Contains($secretValue)) { throw 'A server secret was found in the APK assets' } }
  } finally { $stream.Dispose(); $memory.Dispose() }
 }
 Write-Output 'Verified configured server secrets are absent from APK assets.'
 Write-Output 'Verified configured API URL and public Supabase settings are embedded in the app bundle.'
 Write-Output 'Verified native speech recognition, speech playback, microphone permission, and absence of environment files.'
} finally { $archive.Dispose() }
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $apk).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$apk.sha256", "$hash  Sukoon-preview.apk`n", [Text.UTF8Encoding]::new($false))
Get-Item -LiteralPath $apk | Select-Object FullName,Length
Write-Output "SHA256: $hash"

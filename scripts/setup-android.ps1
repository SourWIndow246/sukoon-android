$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskTools = Join-Path $root '.tools'
New-Item -ItemType Directory -Force $taskTools | Out-Null
$jdkInfo = Invoke-RestMethod 'https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows'
$package = $jdkInfo[0].binary.package
$jdkZip = Join-Path $taskTools 'jdk17.zip'
if (!(Test-Path -LiteralPath $jdkZip)) { Invoke-WebRequest $package.link -OutFile $jdkZip }
if ((Get-FileHash -LiteralPath $jdkZip -Algorithm SHA256).Hash.ToLower() -ne $package.checksum.ToLower()) { throw 'JDK checksum mismatch' }
if (!(Test-Path -LiteralPath (Join-Path $taskTools 'java'))) { Expand-Archive -LiteralPath $jdkZip -DestinationPath (Join-Path $taskTools 'java') }
$taskJdk = (Get-ChildItem -LiteralPath (Join-Path $taskTools 'java') -Directory | Select-Object -First 1).FullName
$sdkZip = Join-Path $taskTools 'android-cli.zip'
if (!(Test-Path -LiteralPath $sdkZip)) { Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $sdkZip }
if ((Get-FileHash -LiteralPath $sdkZip -Algorithm SHA256).Hash.ToLower() -ne '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a') { throw 'Android command-line tools checksum mismatch' }
$sdkDir = Join-Path $taskTools 'android-sdk'
$cliDir = Join-Path $sdkDir 'cmdline-tools'
New-Item -ItemType Directory -Force $cliDir | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $cliDir 'latest'))) {
 Expand-Archive -LiteralPath $sdkZip -DestinationPath $cliDir
 $source = [IO.Path]::GetFullPath((Join-Path $cliDir 'cmdline-tools'))
 $destination = [IO.Path]::GetFullPath((Join-Path $cliDir 'latest'))
 if (!$source.StartsWith($taskTools+[IO.Path]::DirectorySeparatorChar) -or !$destination.StartsWith($taskTools+[IO.Path]::DirectorySeparatorChar)) { throw 'Unsafe tools path' }
 Move-Item -LiteralPath $source -Destination $destination
}
$env:JAVA_HOME = $taskJdk
$env:ANDROID_HOME = $sdkDir
$env:PATH = "$taskJdk\bin;$env:PATH"
$sdkManager = Join-Path $cliDir 'latest\bin\sdkmanager.bat'
# The user explicitly authorised SDK licence acceptance in this conversation.
(1..100 | ForEach-Object { 'y' }) | & $sdkManager --sdk_root=$sdkDir 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1'
if ($LASTEXITCODE -ne 0) { throw 'SDK installation failed' }
$sdkProperty = $sdkDir.Replace('\','/')
"sdk.dir=$sdkProperty" | Set-Content -LiteralPath (Join-Path $root 'android\local.properties')
Write-Output "Android build tools ready in $taskTools"

param([Parameter(Mandatory=$true)][string]$StagingDirectory, [switch]$Offline)
$ErrorActionPreference = 'Stop'
$mobile = Split-Path $PSScriptRoot -Parent
$stage = Get-Item -LiteralPath $StagingDirectory
$project = $stage.Name.ToLowerInvariant()
if ($project -notmatch '^serbisyogo-056-[a-z0-9]{6}$' -or
    (Test-Path (Join-Path $stage.FullName 'supabase/.temp/project-ref')) -or
    ((Get-Content (Join-Path $stage.FullName 'supabase/config.toml')) -notcontains "project_id = `"$project`"")) {
  throw 'Supply a disposable workspace from prepare-staging-056.mjs.'
}
$settings = @{}
foreach ($line in Get-Content (Join-Path $stage.FullName '.cache/local-integration.env')) {
  if ($line -match '^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)=(.*)$') {
    $settings[$matches[1]] = ConvertFrom-Json -InputObject $matches[2]
  }
}
if ($settings.NEXT_PUBLIC_SUPABASE_URL -notin 'http://127.0.0.1:54321','http://localhost:54321' -or
    $settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY -notmatch '^sb_publishable_[A-Za-z0-9_-]+$') {
  throw 'Expected the local API gateway and a publishable key.'
}
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_NO_TELEMETRY = '1'
$env:EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $settings.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
$env:EXPO_PUBLIC_SITE_URL = 'http://127.0.0.1:3000'
$env:EXPO_PUBLIC_DISABLE_RELEASE_FEED = '1'
$env:ANDROID_KEYSTORE_PATH = (Resolve-Path (Join-Path $mobile 'android/app/debug.keystore')).Path
Remove-Item Env:ANDROID_RELEASE_PASSWORD, Env:ANDROID_RELEASE_ALIAS -ErrorAction SilentlyContinue
$options = @()
if ($Offline) { $options += '--offline' }
Push-Location (Join-Path $mobile 'android')
try {
  & .\gradlew.bat :app:assembleDebug @options --max-workers=2 '-PreactNativeArchitectures=arm64-v8a,x86_64' -I (Join-Path $PSScriptRoot 'standalone-debug.gradle')
  if ($LASTEXITCODE) { throw "Gradle exited with $LASTEXITCODE." }
} finally { Pop-Location }

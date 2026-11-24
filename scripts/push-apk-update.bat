@echo off
setlocal
cd /d "%~dp0.." || exit /b 1
echo SerbisyoGo Android and website release tools
echo [1] Compile the configured Android release locally
echo [2] Validate the website package locally
echo [3] Show release instructions
choice /c 123 /n /m "Select an action: "
if errorlevel 4 exit /b 1
if errorlevel 3 goto instructions
if errorlevel 2 goto website
if errorlevel 1 goto android
exit /b 1

:android
if not exist "mobile\android\gradlew.bat" (
  echo The generated Android project is missing. See docs\android-apk-release.md.
  exit /b 1
)
cd /d "mobile\android" || exit /b 1
call gradlew.bat :app:assembleRelease
if errorlevel 1 exit /b 1
echo Local Gradle outputs are in app\build\outputs\apk\release. Verify their identity and signature before distribution.
exit /b 0

:website
call npm.cmd run deploy:cloudflare -- --dry-run
exit /b %errorlevel%

:instructions
echo Use the approved private signing host for the candidate and record its verified digest.
echo After release approval, use the protected publication workflow. Verify published release metadata before updating the public download.
echo See docs\android-apk-release.md and docs\deployment.md.
exit /b 0

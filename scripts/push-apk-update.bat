@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
if not exist "mobile\app.json" cd /d "%~dp0\.."

title SerbisyoGo - Android APK Update & Push Tool
color 0A

echo ===================================================
echo     SerbisyoGo - Android APK Update & Push Tool
echo ===================================================
echo.

:: Get current version from app.json
for /f "delims=" %%v in ('node -p "JSON.parse(require('fs').readFileSync('mobile/app.json')).expo.version"') do set VERSION=%%v
for /f "delims=" %%c in ('node -p "JSON.parse(require('fs').readFileSync('mobile/app.json')).expo.android.versionCode"') do set CODE=%%c

echo Current App Version: v%VERSION% (build %CODE%)
echo.
echo Select an action:
echo.
echo   [1] Build Release APK locally (Gradle)
echo   [2] Push Tag & Trigger GitHub Actions Cloud Release
echo   [3] Update Website & Deploy to Cloudflare
echo   [4] All-in-One: Build Locally, Push Git & Tag, Deploy Website
echo   [5] Exit
echo.
set /p ACTION="Enter option [1-5] (default is 1): "
if "%ACTION%"=="" set ACTION=1

if "%ACTION%"=="1" goto BUILD_LOCAL
if "%ACTION%"=="2" goto PUSH_GITHUB
if "%ACTION%"=="3" goto DEPLOY_WEB
if "%ACTION%"=="4" goto ALL_IN_ONE
if "%ACTION%"=="5" goto EXIT
goto EXIT

:BUILD_LOCAL
echo.
echo ---------------------------------------------------
echo Building standalone Release APK locally...
echo ---------------------------------------------------
cd /d "%~dp0\mobile\android" || cd /d "%~dp0\..\mobile\android"
call gradlew.bat assembleRelease
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Gradle build failed. Check Java JDK and Android SDK setup.
    pause
    goto EXIT
)
cd /d "%~dp0" || cd /d "%~dp0\.."
node scripts/prepare-apk-push.mjs
echo.
echo [SUCCESS] APK compiled successfully!
echo Location: mobile\builds\SerbisyoGo-%VERSION%.apk
if exist "mobile\builds" explorer "mobile\builds"
pause
goto EXIT

:PUSH_GITHUB
echo.
echo ---------------------------------------------------
echo Tagging and Pushing to GitHub (origin main & tag android-v%VERSION%)...
echo ---------------------------------------------------
cd /d "%~dp0" || cd /d "%~dp0\.."
git add .
git commit -m "chore(release): prepare Android v%VERSION% (build %CODE%)"
git push origin main
git tag -a "android-v%VERSION%" -m "Release SerbisyoGo Android v%VERSION%"
git push origin "android-v%VERSION%"
echo.
echo [SUCCESS] Pushed commit and tag android-v%VERSION% to GitHub!
echo.
echo GitHub Actions will now automatically build, sign, and publish the release.
echo Watch the build here:
echo https://github.com/Jawbear/SerbisyoGo/actions
echo.
pause
goto EXIT

:DEPLOY_WEB
echo.
echo ---------------------------------------------------
echo Updating website and deploying to Cloudflare Workers...
echo ---------------------------------------------------
cd /d "%~dp0" || cd /d "%~dp0\.."
node scripts/prepare-apk-push.mjs
call npm.cmd run build
call npx.cmd wrangler deploy --config wrangler.jsonc
echo.
echo [SUCCESS] Website updated with the latest APK release metadata!
echo Live site: https://serbisyogo.sg-team.workers.dev/download/
pause
goto EXIT

:ALL_IN_ONE
echo.
echo ---------------------------------------------------
echo Running All-in-One: Build, GitHub Push, and Deploy
echo ---------------------------------------------------
cd /d "%~dp0\mobile\android" || cd /d "%~dp0\..\mobile\android"
call gradlew.bat assembleRelease
cd /d "%~dp0" || cd /d "%~dp0\.."
node scripts/prepare-apk-push.mjs
git add .
git commit -m "chore(release): build and prepare Android v%VERSION%"
git push origin main
git tag -a "android-v%VERSION%" -m "Release SerbisyoGo Android v%VERSION%"
git push origin "android-v%VERSION%"
call npm.cmd run build
call npx.cmd wrangler deploy --config wrangler.jsonc
echo.
echo ===================================================
echo   ALL DONE! APK built, GitHub updated, site live!
echo ===================================================
pause
goto EXIT

:EXIT
exit /b 0

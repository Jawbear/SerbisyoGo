@echo off
cd /d "%~dp0\.."
echo ===================================================
echo   SerbisyoGo Cloudflare Live Deployment
echo ===================================================
echo.
echo Step 1: Logging in to Cloudflare...
call npx.cmd wrangler login
if %errorlevel% neq 0 (
    echo.
    echo Login failed or was cancelled.
    pause
    exit /b %errorlevel%
)
echo.
echo Step 2: Deploying to https://serbisyogo.sg-team.workers.dev...
call npx.cmd wrangler deploy --config wrangler.jsonc
if %errorlevel% neq 0 (
    echo.
    echo Deployment failed.
    pause
    exit /b %errorlevel%
)
echo.
echo ===================================================
echo   SUCCESS! The live site has been updated!
echo   Open: https://serbisyogo.sg-team.workers.dev/login/
echo ===================================================
pause

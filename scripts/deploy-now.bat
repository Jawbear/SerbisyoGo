@echo off
setlocal
cd /d "%~dp0.." || exit /b 1
call npm.cmd run deploy:cloudflare -- --dry-run
exit /b %errorlevel%

@echo off
cd /d "%~dp0"
echo Starting Sounds English to Me server at http://127.0.0.1:8787
echo Press Ctrl+C or close this window to stop the server.
echo.
start "" http://127.0.0.1:8787
python -m http.server 8787 --bind 127.0.0.1
pause


@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (echo Install Python 3.11+ with Tcl/Tk from https://www.python.org/downloads/windows/ & pause & exit /b 1)
set "PYTHONPATH=%CD%\src"
py -3 -m hospital_gateway
if errorlevel 1 (echo Application exited with an error. & pause)
endlocal

@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (echo Install Python 3.11+ first. & pause & exit /b 1)
py -3 -m pip install --upgrade pyinstaller
if errorlevel 1 (echo PyInstaller install failed. & pause & exit /b 1)
set "PYTHONPATH=%CD%\src"
py -3 -m PyInstaller --noconfirm --clean --windowed --name UniversalHospitalGateway --paths src src\hospital_gateway\main.py
if errorlevel 1 (echo Build failed. & pause & exit /b 1)
echo Built dist\UniversalHospitalGateway.exe
pause
endlocal

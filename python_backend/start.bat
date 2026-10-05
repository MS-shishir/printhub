@echo off
title PrintHub Studio - AI Hair Matting & Background Engine
color 0b

echo ========================================================
echo   PrintHub Studio - AI Hair Matting & Background Server
echo   BiRefNet-Portrait + ViTMatte + PyMatting Pipeline
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org
    pause
    exit /b 1
)

:: 2. Check / Create Virtual Environment
if not exist "venv" (
    echo [*] Creating virtual environment (venv)...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create venv!
        pause
        exit /b 1
    )
)

:: 3. Activate Virtual Environment
echo [*] Activating virtual environment...
call venv\Scripts\activate.bat

:: 4. Check dependencies
echo [*] Checking dependencies...
python -c "import fastapi, uvicorn, PIL" >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Installing required packages from requirements.txt...
    echo [*] This may take a few minutes on first run...
    pip install --upgrade pip
    pip install -r requirements.txt
    
    echo.
    echo [*] Note: If you have an NVIDIA GPU, you can enable 10x faster CUDA acceleration by running:
    echo     pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
    echo.
)

:: 5. Launch FastAPI Server
echo ========================================================
echo   Launching Server on http://localhost:8000
echo   PrintHub Studio will connect automatically!
echo ========================================================
echo.

venv\Scripts\python.exe server.py

pause

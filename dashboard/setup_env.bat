@echo off
echo Setting up Python virtual environment...

if not exist ".venv" (
    echo Creating virtual environment in .venv...
    python -m venv .venv
    if errorlevel 1 (
        echo Error: Failed to create virtual environment. Make sure Python is installed and in your PATH.
        exit /b 1
    )
) else (
    echo Virtual environment .venv already exists.
)

echo Activating virtual environment and upgrading pip...
call .venv\Scripts\activate
python -m pip install --upgrade pip

echo Installing requirements from requirements.txt...
pip install -r requirements.txt

echo Virtual environment setup complete!
echo To activate: call .venv\Scripts\activate

#!/bin/bash

# ==========================================
# Nexus Network Analysis Platform
# Build & Run Script (Git Bash / WSL compatible)
# ==========================================

# Exit on error
set -e

# Ensure we are in the project root directory
cd "$(dirname "$0")/.."

echo -e "\033[1;36m[Nexus] Initializing Build Environment...\033[0m"

# ------------------------------------------
# 1. Environment Check
# ------------------------------------------
if ! command -v python &> /dev/null; then
    # Try python3 fallback
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    else
        echo -e "\033[1;31m[Error] Python not found. Please install Python 3.10+.\033[0m"
        exit 1
    fi
else
    PYTHON_CMD="python"
fi

echo -e "\033[1;32m[OK]\033[0m Using Python: $($PYTHON_CMD --version)"

if ! command -v npm &> /dev/null; then
    echo -e "\033[1;31m[Error] NPM not found. Please install Node.js.\033[0m"
    exit 1
fi
echo -e "\033[1;32m[OK]\033[0m Using NPM: $(npm --version)"


# ------------------------------------------
# 2. Backend Setup
# ------------------------------------------
echo -e "\n\033[1;36m[Nexus] Checking Backend Dependencies...\033[0m"
$PYTHON_CMD -m pip install -r requirements.txt
echo -e "\033[1;32m[OK]\033[0m Dependencies installed."


# ------------------------------------------
# 3. Frontend Build
# ------------------------------------------
if [[ "$1" == "--skip-build" ]]; then
    echo -e "\n\033[1;33m[Nexus] Skipping Frontend Build (User Flag)...\033[0m"
else
    echo -e "\n\033[1;36m[Nexus] Building Frontend...\033[0m"
    
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo "    -> Installing NPM packages (First run)..."
        npm install
    fi
    
    echo "    -> Compiling React application..."
    npm run build
    
    cd ..
    echo -e "\033[1;32m[OK]\033[0m Frontend build complete."
fi


# ------------------------------------------
# 4. Launch Application
# ------------------------------------------
echo -e "\n\033[1;36m[Nexus] Launching Application...\033[0m"
$PYTHON_CMD run.py
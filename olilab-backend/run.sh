#!/bin/bash

# ==============================================================================
# OliLab Development Environment Runner
# ==============================================================================
# This script automates the setup and execution of the OliLab application,
# including the Python backend and the Node.js frontend.
#
# Usage:
# 1. Make the script executable: chmod +x run.sh
# 2. Run the script: ./run.sh
#
# It will:
#   - Check for necessary prerequisites (python3, npm).
#   - Set up the Python virtual environment and install dependencies.
#   - Check for the required backend .env file.
#   - Install frontend Node.js dependencies.
#   - Start both the Flask backend and Vite frontend servers concurrently.
#   - Gracefully shut down both servers when you press Ctrl+C.
# ==============================================================================


# Define colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting OliLab Development Environment...${NC}"

# Function to handle script interruption (Ctrl+C)
cleanup() {
    echo -e "\n\n${YELLOW}Shutting down servers...${NC}"
    # Kill the child processes using their stored PIDs
    if [ -n "$FLASK_PID" ]; then
        kill "$FLASK_PID" 2>/dev/null
        echo "Backend server stopped."
    fi
    if [ -n "$VITE_PID" ]; then
        kill "$VITE_PID" 2>/dev/null
        echo "Frontend server stopped."
    fi
    # Deactivate python venv if it's active
    if command -v deactivate >/dev/null 2>&1; then
        deactivate
    fi
    exit 0
}

# Set up a trap to call the cleanup function on script exit
trap cleanup SIGINT SIGTERM

# --- 1. Prerequisite Checks ---
echo "Checking for prerequisites (python3, npm)..."
if ! command -v python3 >/dev/null 2>&1; then
    echo -e "${RED}Error: python3 is not installed. Please install Python 3.7+ and try again.${NC}"
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js v16+ and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}Prerequisites met.${NC}"

# --- 2. Backend Setup ---
echo -e "\n${YELLOW}--- Setting up Backend (olilab-backend) ---${NC}"
cd olilab-backend || { echo -e "${RED}Error: 'olilab-backend' directory not found in the current location.${NC}"; exit 1; }

# Critical check for the .env file
if [ ! -f .env ]; then
    echo -e "${RED}CRITICAL ERROR: Backend '.env' file is missing.${NC}"
    echo -e "${YELLOW}Please create a '.env' file inside the 'olilab-backend' directory with your DATABASE_URL and API_KEY.${NC}"
    echo -e "${YELLOW}See the README.md for instructions.${NC}"
    cd ..
    exit 1
fi

# Set up Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment in 'venv'..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create Python virtual environment.${NC}"
        cd ..
        exit 1
    fi
fi

# Activate virtual environment
echo "Activating Python virtual environment..."
source venv/bin/activate

# Install/update Python dependencies quietly
echo "Installing/updating Python dependencies from requirements.txt..."
pip install -r requirements.txt > /dev/null

echo -e "${GREEN}Backend setup complete.${NC}"

# --- 3. Frontend Setup ---
cd ..
echo -e "\n${YELLOW}--- Setting up Frontend ---${NC}"

# Install Node modules if the node_modules directory doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Node modules not found. Running 'npm install' (this may take a moment)..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install npm dependencies.${NC}"
        exit 1
    fi
else
    echo "Node modules already installed."
fi
echo -e "${GREEN}Frontend setup complete.${NC}"


# --- 4. Start Servers ---
echo -e "\n${YELLOW}--- Starting Servers ---${NC}"

# Start Backend Server in the background
cd olilab-backend || exit
echo "Starting Flask backend server on http://localhost:5000..."
flask run --host=0.0.0.0 &
FLASK_PID=$!
cd ..

# Start Frontend Server in the background
echo "Starting Vite frontend server (check terminal for URL, usually http://localhost:5173)..."
npm run dev &
VITE_PID=$!

echo -e "\n${GREEN}✅ Both servers are running in the background.${NC}"
echo -e "${GREEN}Backend logs will appear from the Flask process."
echo -e "${GREEN}Frontend logs will appear from the Vite process."
echo -e "\n${YELLOW}Press Ctrl+C in this terminal to stop both servers.${NC}\n"

# The 'wait' command blocks the script from exiting, allowing the background jobs to run
# and their output to be displayed. The 'trap' will handle the cleanup.
wait
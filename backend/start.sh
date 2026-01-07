#!/bin/bash
# Start the FastAPI backend server

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with your OPENAI_API_KEY"
    echo "Example: OPENAI_API_KEY=your_key_here"
    echo ""
fi

# Start uvicorn server
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

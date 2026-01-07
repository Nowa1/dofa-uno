# Dofa.uno Setup Guide

Complete setup instructions for the Dofa.uno task management application.

## Prerequisites

- Node.js (v16 or higher)
- Python 3.8+ (tested with Python 3.14)
- OpenAI API Key

## Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   ```

4. **Start the backend server:**
   ```bash
   python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   
   The backend will be available at: `http://localhost:8000`

## Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The frontend will be available at: `http://localhost:5173`

## Testing the Integration

1. **Verify backend is running:**
   - Open `http://localhost:8000/health` in your browser
   - You should see: `{"status":"healthy","openai_configured":true}`

2. **Test the application:**
   - Open `http://localhost:5173` in your browser
   - Enter a brain dump in the textarea, for example:
     ```
     I need to call mom about dinner plans. 
     Fix the login bug on the website. 
     I'm so tired today. 
     Write the quarterly report for the team.
     Buy groceries for the week.
     ```
   - Click "Clear My Mind"
   - The AI will parse your text and display organized tasks in two categories:
     - **Quick Wins** (< 15 minutes)
     - **Deep Work** (≥ 15 minutes)

## Features

### Brain Dump Processing
- Extracts actionable tasks from unstructured text
- Removes emotional statements and non-actionable content
- Automatically categorizes tasks by complexity
- Assigns priority levels (1-5)

### Task Management
- Click tasks to mark them as complete
- Visual distinction between quick wins and deep work
- Real-time task counter
- Completion tracking

### AI System Prompt
The backend uses a sophisticated system prompt that:
- Identifies actionable vs. non-actionable statements
- Classifies task complexity (quick_win vs. deep_work)
- Removes emotional fluff
- Generates clear, concise task titles
- Assigns priority based on urgency indicators

## API Endpoints

### POST /api/parse_dump
Parse brain dump text into structured tasks.

**Request:**
```json
{
  "text": "Your unstructured brain dump text here..."
}
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "task_1",
      "title": "Task title",
      "description": "Optional description",
      "tag": "quick_win",
      "status": "todo",
      "priority": 2
    }
  ]
}
```

### GET /health
Check backend health and configuration.

## Troubleshooting

### Backend Issues

**Error: "OpenAI API key not configured"**
- Make sure you created a `.env` file in the `backend` directory
- Verify your OpenAI API key is correct
- Restart the backend server after adding the key

**Error: "Module not found"**
- Run `pip install -r requirements.txt` again
- Make sure you're using Python 3.8 or higher

### Frontend Issues

**Error: "Failed to connect to the server"**
- Verify the backend is running on `http://localhost:8000`
- Check the browser console for CORS errors
- Make sure both frontend and backend are running

**Tasks not displaying:**
- Check the browser console for errors
- Verify the backend returned a valid response
- Try refreshing the page

## Architecture

```
dofa.uno/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template
│   └── README.md           # Backend documentation
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx  # Main UI component
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── README.md
└── SETUP.md                # This file
```

## Next Steps

After completing the setup:
1. Test the brain dump feature with various inputs
2. Verify task categorization is working correctly
3. Check that task completion toggling works
4. Monitor the backend logs for any errors
5. Customize the system prompt if needed (in `backend/main.py`)

## Support

For issues or questions:
- Check the backend logs in Terminal 4
- Check the frontend console in your browser's DevTools
- Verify all environment variables are set correctly
- Ensure both servers are running simultaneously

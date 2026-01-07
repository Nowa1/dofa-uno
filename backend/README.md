# Dofa.uno Backend

FastAPI backend for parsing brain dumps into structured tasks using OpenAI.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start the server:**
   ```bash
   # Option 1: Using the start script
   chmod +x start.sh
   ./start.sh
   
   # Option 2: Using uvicorn directly
   python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### POST /api/parse_dump
Parse unstructured text into structured tasks.

**Request:**
```json
{
  "text": "I need to call mom, finish the report, buy groceries..."
}
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "task_1",
      "title": "Call mom",
      "description": null,
      "tag": "quick_win",
      "status": "todo",
      "priority": 2
    }
  ]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "openai_configured": true
}
```

## Task Tags

- **quick_win**: Tasks that take less than 15 minutes
- **deep_work**: Complex tasks that require more than 15 minutes

## System Prompt

The AI is configured to:
- Extract only actionable tasks
- Remove emotional fluff and non-actionable statements
- Classify tasks as quick wins or deep work
- Assign priority levels (1-5)
- Generate clear, concise task titles

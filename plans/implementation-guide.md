# Nemesis MVP - Implementation Guide

## Quick Start Commands

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy openai python-dotenv pydantic
touch .env
# Add: OPENAI_API_KEY=your_key_here
python main.py
```

### Frontend Setup
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss postcss autoprefixer
npm install zustand framer-motion lucide-react
npx tailwindcss init -p
npm run dev
```

---

## Phase 1: Backend Foundation

### Step 1.1: Project Structure
```bash
cd backend
mkdir -p database api services utils
touch main.py
touch database/{__init__.py,models.py,database.py}
touch api/{__init__.py,routes.py,schemas.py}
touch services/{__init__.py,ai_service.py,task_service.py}
touch utils/{__init__.py,helpers.py}
touch .env
touch requirements.txt
```

### Step 1.2: requirements.txt
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
openai==1.10.0
python-dotenv==1.0.0
pydantic==2.5.3
pydantic-settings==2.1.0
```

### Step 1.3: .env
```env
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=sqlite:///./database/nemesis.db
CORS_ORIGINS=http://localhost:5173
DEBUG=True
```

### Step 1.4: database/database.py
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database/nemesis.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
```

### Step 1.5: database/models.py
```python
from sqlalchemy import Column, String, Integer, DateTime, Enum as SQLEnum, Text
from sqlalchemy.sql import func
from database.database import Base
import enum
import uuid

class TaskType(str, enum.Enum):
    QUICK_WIN = "quick_win"
    DEEP_WORK = "deep_work"

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class MascotState(str, enum.Enum):
    IDLE = "idle"
    FOCUS = "focus"
    PANIC = "panic"
    TRIUMPH = "triumph"

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(500), nullable=False)
    type = Column(SQLEnum(TaskType), nullable=False)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING)
    estimated_time = Column(Integer, nullable=False)  # minutes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    raw_input = Column(Text, nullable=True)

class UserState(Base):
    __tablename__ = "user_state"
    
    id = Column(Integer, primary_key=True, default=1)
    mascot_state = Column(SQLEnum(MascotState), default=MascotState.IDLE)
    streak = Column(Integer, default=0)
    total_completed = Column(Integer, default=0)
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
```

### Step 1.6: api/schemas.py
```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from database.models import TaskType, TaskStatus, MascotState

class BrainDumpRequest(BaseModel):
    raw_text: str = Field(..., min_length=1, max_length=5000)

class TaskResponse(BaseModel):
    id: str
    title: str
    type: TaskType
    status: TaskStatus
    estimated_time: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class BrainDumpResponse(BaseModel):
    tasks: List[TaskResponse]
    message: str

class TaskUpdateRequest(BaseModel):
    status: Optional[TaskStatus] = None

class UserStateResponse(BaseModel):
    mascot_state: MascotState
    streak: int
    total_completed: int
    
    class Config:
        from_attributes = True

class TasksResponse(BaseModel):
    tasks: List[TaskResponse]
    user_state: UserStateResponse

class ChatInterventionRequest(BaseModel):
    task_id: str
    context: str = "feeling overwhelmed"

class ChatInterventionResponse(BaseModel):
    message: str
    suggestions: Optional[List[str]] = None
```

### Step 1.7: services/ai_service.py
```python
import openai
import os
import json
from typing import List, Dict
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

TASK_PARSER_PROMPT = """You are a task parser for people with ADHD. Parse this brain dump into structured tasks.

Rules:
- Extract clear, actionable tasks only
- Estimate time in minutes (be realistic)
- Classify as "quick_win" if <15 minutes, "deep_work" if >=15 minutes
- Ignore non-actionable thoughts or venting
- Be encouraging and supportive
- Return ONLY valid JSON, no markdown or explanations

Expected JSON format:
{
  "tasks": [
    {
      "title": "Clear task description",
      "type": "quick_win",
      "estimated_time": 10
    }
  ]
}

Brain dump: {raw_text}"""

INTERVENTION_PROMPT = """You are a supportive coach for someone with ADHD who is feeling {context} about a task.

Task: {task_title}
Estimated time: {estimated_time} minutes

Provide:
1. A brief, encouraging message (2-3 sentences)
2. 3 concrete suggestions to make the task easier

Return ONLY valid JSON:
{
  "message": "Your encouraging message here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}"""

class AIService:
    @staticmethod
    async def parse_brain_dump(raw_text: str) -> List[Dict]:
        """Parse unstructured text into structured tasks using OpenAI"""
        try:
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful task parser. Return only valid JSON."
                    },
                    {
                        "role": "user",
                        "content": TASK_PARSER_PROMPT.format(raw_text=raw_text)
                    }
                ],
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get("tasks", [])
            
        except Exception as e:
            print(f"AI parsing error: {e}")
            # Fallback: create a single task from the input
            return [{
                "title": raw_text[:100],
                "type": "deep_work",
                "estimated_time": 30
            }]
    
    @staticmethod
    async def get_intervention(task_title: str, estimated_time: int, context: str) -> Dict:
        """Get AI intervention for task overwhelm"""
        try:
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a supportive ADHD coach. Return only valid JSON."
                    },
                    {
                        "role": "user",
                        "content": INTERVENTION_PROMPT.format(
                            context=context,
                            task_title=task_title,
                            estimated_time=estimated_time
                        )
                    }
                ],
                temperature=0.8,
                max_tokens=300,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            print(f"AI intervention error: {e}")
            return {
                "message": "Take a deep breath. You've got this!",
                "suggestions": [
                    "Break it into smaller steps",
                    "Set a 15-minute timer",
                    "Start with the easiest part"
                ]
            }

ai_service = AIService()
```

### Step 1.8: services/task_service.py
```python
from sqlalchemy.orm import Session
from database.models import Task, UserState, TaskStatus, MascotState
from typing import List
from datetime import datetime

class TaskService:
    @staticmethod
    def get_all_tasks(db: Session) -> List[Task]:
        """Get all tasks ordered by creation date"""
        return db.query(Task).order_by(Task.created_at.desc()).all()
    
    @staticmethod
    def create_task(db: Session, title: str, task_type: str, estimated_time: int, raw_input: str = None) -> Task:
        """Create a new task"""
        task = Task(
            title=title,
            type=task_type,
            estimated_time=estimated_time,
            raw_input=raw_input
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def update_task_status(db: Session, task_id: str, status: TaskStatus) -> Task:
        """Update task status and handle streak logic"""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None
        
        task.status = status
        
        # If completing task, update user state
        if status == TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
            user_state = TaskService.get_or_create_user_state(db)
            user_state.streak += 1
            user_state.total_completed += 1
            user_state.last_activity = datetime.utcnow()
        
        db.commit()
        db.refresh(task)
        return task
    
    @staticmethod
    def delete_task(db: Session, task_id: str) -> bool:
        """Delete a task"""
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return False
        db.delete(task)
        db.commit()
        return True
    
    @staticmethod
    def get_or_create_user_state(db: Session) -> UserState:
        """Get or create the single user state record"""
        user_state = db.query(UserState).filter(UserState.id == 1).first()
        if not user_state:
            user_state = UserState(id=1)
            db.add(user_state)
            db.commit()
            db.refresh(user_state)
        return user_state

task_service = TaskService()
```

### Step 1.9: api/routes.py
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.database import get_db
from api.schemas import (
    BrainDumpRequest, BrainDumpResponse, TaskResponse,
    TaskUpdateRequest, TasksResponse, UserStateResponse,
    ChatInterventionRequest, ChatInterventionResponse
)
from services.ai_service import ai_service
from services.task_service import task_service
from database.models import Task

router = APIRouter(prefix="/api", tags=["tasks"])

@router.post("/parse_dump", response_model=BrainDumpResponse)
async def parse_dump(request: BrainDumpRequest, db: Session = Depends(get_db)):
    """Parse brain dump text into structured tasks"""
    try:
        # Use AI to parse tasks
        parsed_tasks = await ai_service.parse_brain_dump(request.raw_text)
        
        # Create tasks in database
        created_tasks = []
        for task_data in parsed_tasks:
            task = task_service.create_task(
                db=db,
                title=task_data["title"],
                task_type=task_data["type"],
                estimated_time=task_data["estimated_time"],
                raw_input=request.raw_text
            )
            created_tasks.append(task)
        
        return BrainDumpResponse(
            tasks=[TaskResponse.model_validate(t) for t in created_tasks],
            message=f"I've organized your thoughts into {len(created_tasks)} task{'s' if len(created_tasks) != 1 else ''}!"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks", response_model=TasksResponse)
def get_tasks(db: Session = Depends(get_db)):
    """Get all tasks and user state"""
    tasks = task_service.get_all_tasks(db)
    user_state = task_service.get_or_create_user_state(db)
    
    return TasksResponse(
        tasks=[TaskResponse.model_validate(t) for t in tasks],
        user_state=UserStateResponse.model_validate(user_state)
    )

@router.patch("/tasks/{task_id}", response_model=dict)
def update_task(task_id: str, request: TaskUpdateRequest, db: Session = Depends(get_db)):
    """Update task status"""
    task = task_service.update_task_status(db, task_id, request.status)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    user_state = task_service.get_or_create_user_state(db)
    
    return {
        "task": TaskResponse.model_validate(task),
        "streak_updated": request.status.value == "completed",
        "new_streak": user_state.streak
    }

@router.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    """Delete a task"""
    success = task_service.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

@router.post("/chat_intervention", response_model=ChatInterventionResponse)
async def chat_intervention(request: ChatInterventionRequest, db: Session = Depends(get_db)):
    """Get AI intervention for task overwhelm"""
    task = db.query(Task).filter(Task.id == request.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = await ai_service.get_intervention(
        task_title=task.title,
        estimated_time=task.estimated_time,
        context=request.context
    )
    
    return ChatInterventionResponse(**result)
```

### Step 1.10: main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.database import init_db
from api.routes import router
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Nemesis API",
    description="ADHD-friendly task management API",
    version="1.0.0"
)

# CORS configuration
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)

@app.on_event("startup")
def on_startup():
    """Initialize database on startup"""
    init_db()
    print("✅ Database initialized")

@app.get("/")
def root():
    return {"message": "Nemesis API is running", "status": "healthy"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

---

## Phase 2: Frontend Foundation

### Step 2.1: Project Structure
```bash
cd frontend
mkdir -p src/{components,store,services,hooks,utils,styles}
```

### Step 2.2: tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-tertiary': '#334155',
        'accent-green': '#10b981',
        'accent-blue': '#3b82f6',
        'accent-red': '#ef4444',
        'accent-gold': '#fbbf24',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
      },
      animation: {
        'breathe': 'breathe 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
```

### Step 2.3: src/styles/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-bg-primary text-text-primary;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  #root {
    @apply min-h-screen;
  }
}

@layer components {
  .btn-primary {
    @apply px-6 py-3 bg-accent-blue text-white rounded-lg font-semibold
           hover:bg-blue-600 active:scale-95 transition-all duration-200
           focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2
           focus:ring-offset-bg-primary;
  }
  
  .btn-success {
    @apply px-6 py-3 bg-accent-green text-white rounded-lg font-semibold
           hover:bg-green-600 active:scale-95 transition-all duration-200;
  }
  
  .btn-danger {
    @apply px-6 py-3 bg-accent-red text-white rounded-lg font-semibold
           hover:bg-red-600 active:scale-95 transition-all duration-200;
  }
  
  .card {
    @apply bg-bg-tertiary rounded-xl p-6 shadow-lg;
  }
  
  .input-primary {
    @apply w-full px-4 py-3 bg-bg-secondary text-text-primary rounded-lg
           border-2 border-transparent focus:border-accent-blue
           focus:outline-none transition-colors duration-200
           placeholder:text-text-muted;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1e293b;
}

::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Step 2.4: .env
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Step 2.5: vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})
```

---

## Phase 3: Core Implementation Files

### src/services/api.js
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || error.message || 'Request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  async getTasks() {
    return this.request('/api/tasks');
  }
  
  async parseDump(rawText) {
    return this.request('/api/parse_dump', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText })
    });
  }
  
  async updateTask(taskId, updates) {
    return this.request(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }
  
  async deleteTask(taskId) {
    return this.request(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }
  
  async getIntervention(taskId, context = 'feeling overwhelmed') {
    return this.request('/api/chat_intervention', {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, context })
    });
  }
}

export default new ApiService();
```

### src/store/useStore.js
```javascript
import { create } from 'zustand';
import api from '../services/api';

const useStore = create((set, get) => ({
  // State
  tasks: [],
  currentTask: null,
  mascotState: 'idle',
  streak: 0,
  totalCompleted: 0,
  isLoading: false,
  error: null,
  isFocusMode: false,
  
  // Computed
  quickWins: () => get().tasks.filter(t => 
    t.type === 'quick_win' && t.status !== 'completed'
  ),
  deepWork: () => get().tasks.filter(t => 
    t.type === 'deep_work' && t.status !== 'completed'
  ),
  completedTasks: () => get().tasks.filter(t => 
    t.status === 'completed'
  ),
  
  // Actions
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getTasks();
      set({ 
        tasks: data.tasks,
        streak: data.user_state.streak,
        totalCompleted: data.user_state.total_completed,
        mascotState: data.user_state.mascot_state,
        isLoading: false
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  parseBrainDump: async (rawText) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.parseDump(rawText);
      set(state => ({ 
        tasks: [...data.tasks, ...state.tasks],
        isLoading: false
      }));
      return data.tasks;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return null;
    }
  },
  
  startFocus: async (task) => {
    try {
      await api.updateTask(task.id, { status: 'in_progress' });
      set(state => ({ 
        currentTask: task,
        isFocusMode: true,
        mascotState: 'focus',
        tasks: state.tasks.map(t => 
          t.id === task.id ? { ...t, status: 'in_progress' } : t
        )
      }));
    } catch (error) {
      set({ error: error.message });
    }
  },
  
  completeTask: async (taskId) => {
    try {
      const data = await api.updateTask(taskId, { status: 'completed' });
      set(state => ({
        tasks: state.tasks.map(t => 
          t.id === taskId ? { ...t, status: 'completed' } : t
        ),
        streak: data.new_streak,
        totalCompleted: state.totalCompleted + 1,
        mascotState: 'triumph',
        isFocusMode: false,
        currentTask: null
      }));
      
      setTimeout(() => set({ mascotState: 'idle' }), 3000);
    } catch (error) {
      set({ error: error.message });
    }
  },
  
  exitFocus: async () => {
    const { currentTask } = get();
    if (currentTask) {
      try {
        await api.updateTask(currentTask.id, { status: 'pending' });
        set(state => ({
          tasks: state.tasks.map(t => 
            t.id === currentTask.id ? { ...t, status: 'pending' } : t
          ),
          isFocusMode: false,
          currentTask: null,
          mascotState: 'panic'
        }));
        
        setTimeout(() => set({ mascotState: 'idle' }), 3000);
      } catch (error) {
        set({ error: error.message });
      }
    }
  },
  
  deleteTask: async (taskId) => {
    try {
      await api.deleteTask(taskId);
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
      }));
    } catch (error) {
      set({ error: error.message });
    }
  },
  
  clearError: () => set({ error: null })
}));

export default useStore;
```

---

## Testing the Setup

### Backend Test
```bash
# Terminal 1
cd backend
source venv/bin/activate
python main.py

# Should see:
# ✅ Database initialized
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Test API with curl
```bash
# Health check
curl http://localhost:8000/health

# Parse brain dump
curl -X POST http://localhost:8000/api/parse_dump \
  -H "Content-Type: application/json" \
  -d '{"raw_text": "I need to call mom and finish the report"}'

# Get tasks
curl http://localhost:8000/api/tasks
```

### Frontend Test
```bash
# Terminal 2
cd frontend
npm run dev

# Should see:
# VITE v5.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

---

## Next Steps

After completing the foundation setup:

1. **Implement UI Components** (see component-architecture.md)
2. **Add Framer Motion animations**
3. **Build Focus Mode overlay**
4. **Create Mascot Buddy**
5. **Add gamification effects**
6. **Test complete user flow**
7. **Polish and optimize**

---

## Troubleshooting

### Backend Issues

**Database not creating:**
```python
# Run this in Python shell
from database.database import init_db
init_db()
```

**OpenAI API errors:**
- Check API key in .env
- Verify account has credits
- Check rate limits

**CORS errors:**
- Verify CORS_ORIGINS in .env matches frontend URL
- Check browser console for specific error

### Frontend Issues

**Tailwind not working:**
```bash
# Reinstall and rebuild
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**API connection failed:**
- Verify backend is running on port 8000
- Check VITE_API_BASE_URL in .env
- Check browser network tab for errors

**State not updating:**
- Check Zustand devtools
- Verify API responses in network tab
- Check console for errors

---

## Development Tips

1. **Use browser DevTools** - React DevTools and Network tab are essential
2. **Test API endpoints first** - Verify backend works before building UI
3. **Start with dummy data** - Build UI with mock data, then connect API
4. **Commit often** - Small, frequent commits make debugging easier
5. **Test on mobile** - Use responsive design mode in browser
6. **Handle errors gracefully** - Always show user-friendly messages
7. **Keep animations
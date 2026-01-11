from fastapi import FastAPI, HTTPException, Depends, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import openai
import os
import json
import uuid
from dotenv import load_dotenv

# Import database and gamification modules
from database import (
    get_db, init_db, get_or_create_user,
    Task as DBTask, UserProfile, Achievement as DBAchievement, DailyStat
)
from gamification import (
    calculate_xp, calculate_level, check_level_up, update_streak,
    check_achievements, get_xp_progress, ACHIEVEMENTS
)
# Import authentication module
from auth import (
    get_password_hash, authenticate_user, create_access_token,
    get_current_user, set_auth_cookie, clear_auth_cookie,
    get_google_oauth_url, exchange_google_code, get_google_user_info,
    get_or_create_oauth_user, FRONTEND_URL
)

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Get allowed origins from environment variable or use defaults
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:5178"
]

# Configure CORS - must be before routes
# IMPORTANT: allow_credentials=True is required for cookie-based authentication
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,  # Required for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# OpenAI API key from environment
openai.api_key = os.getenv("OPENAI_API_KEY")

# Startup event to initialize database
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("Initializing database...")
    init_db()
    print("Database initialized successfully!")

# Pydantic Models for API

# Auth Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    oauth_provider: Optional[str]
    total_xp: int
    current_level: int
    current_streak: int

class AuthResponse(BaseModel):
    user: UserResponse
    message: str

class DumpRequest(BaseModel):
    text: str

class InterventionRequest(BaseModel):
    task_title: str
    task_description: Optional[str] = None

class InterventionResponse(BaseModel):
    message: str

class Task(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    tag: str  # 'quick_win' or 'deep_work'
    status: str = "todo"
    priority: Optional[int] = None
    xp_value: Optional[int] = 0
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

class ParseResponse(BaseModel):
    tasks: List[Task]

class TasksResponse(BaseModel):
    tasks: List[Task]
    count: int

class CompleteTaskResponse(BaseModel):
    task: Task
    xp_earned: int
    level_up: bool
    new_level: Optional[int] = None
    unlocked_achievements: List[dict]
    streak_info: dict

class ProfileResponse(BaseModel):
    id: int
    total_xp: int
    current_level: int
    current_streak: int
    longest_streak: int
    xp_progress: dict

class AchievementResponse(BaseModel):
    key: str
    name: str
    description: str
    icon: str
    unlocked: bool
    unlocked_at: Optional[str] = None
    progress: Optional[dict] = None

class AchievementsResponse(BaseModel):
    achievements: List[AchievementResponse]
    count: int

class BacklogResponse(BaseModel):
    tasks: List[Task]
    count: int
    page: int
    limit: int
    total_pages: int

class StatsResponse(BaseModel):
    period: str
    total_tasks: int
    quick_wins: int
    deep_work: int
    total_xp: int
    daily_breakdown: List[dict]
    completion_rate: float
    avg_tasks_per_day: float

# System prompt for task parsing
SYSTEM_PROMPT = """You are a task extraction AI. Your job is to parse unstructured text (brain dumps, notes, thoughts) and extract actionable tasks.

RULES:
1. Extract ONLY actionable tasks - ignore emotional statements, complaints, or non-actionable thoughts
2. For each task, determine if it's a 'quick_win' (<15 minutes) or 'deep_work' (complex, >15 minutes)
3. Remove emotional fluff like "I am tired", "I feel overwhelmed", etc.
4. Create clear, concise task titles
5. Add brief descriptions if the original text provides context
6. Assign priority (1-5, where 1 is highest) based on urgency indicators in the text
7. Generate a unique ID for each task (use format: task_1, task_2, etc.)

OUTPUT FORMAT:
Return a valid JSON array of tasks. Each task must have:
- id: string (e.g., "task_1")
- title: string (clear, actionable task title)
- description: string or null (brief context if available)
- tag: "quick_win" or "deep_work"
- status: "todo" (always set to "todo")
- priority: number 1-5 or null

EXAMPLES:

Input: "I need to reply to John's email about the project. Also fix that bug in the login page. I'm so tired today. Maybe I should refactor the entire codebase sometime."

Output:
[
  {
    "id": "task_1",
    "title": "Reply to John's email about the project",
    "description": "Respond to project-related email from John",
    "tag": "quick_win",
    "status": "todo",
    "priority": 2
  },
  {
    "id": "task_2",
    "title": "Fix bug in login page",
    "description": null,
    "tag": "quick_win",
    "status": "todo",
    "priority": 1
  },
  {
    "id": "task_3",
    "title": "Refactor codebase",
    "description": "Consider refactoring the entire codebase",
    "tag": "deep_work",
    "status": "todo",
    "priority": 3
  }
]

Now parse the user's input and return ONLY the JSON array, no other text."""

# Helper function to convert DB task to Pydantic model
def db_task_to_pydantic(db_task: DBTask) -> Task:
    """Convert database Task to Pydantic Task model"""
    return Task(
        id=db_task.id,
        title=db_task.title,
        description=db_task.description,
        tag=db_task.tag,
        status=db_task.status,
        priority=db_task.priority,
        xp_value=db_task.xp_value,
        created_at=db_task.created_at.isoformat() if db_task.created_at else None,
        completed_at=db_task.completed_at.isoformat() if db_task.completed_at else None
    )

# API Endpoints

@app.get("/")
async def root():
    return {"message": "Dofa.uno API is running"}


# Authentication Endpoints

@app.post("/api/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    """
    Register a new user with email and password.
    Creates user account and sets authentication cookie.
    """
    # Check if user already exists
    existing_user = db.query(UserProfile).filter(UserProfile.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(request.password)
    new_user = UserProfile(
        email=request.email,
        hashed_password=hashed_password,
        full_name=request.full_name,
        is_active=True,
        email_verified=False,
        total_xp=0,
        current_level=1,
        current_streak=0,
        longest_streak=0
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": new_user.id})
    
    # Set cookie
    set_auth_cookie(response, access_token)
    
    return AuthResponse(
        user=UserResponse(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            oauth_provider=new_user.oauth_provider,
            total_xp=new_user.total_xp,
            current_level=new_user.current_level,
            current_streak=new_user.current_streak
        ),
        message="Registration successful"
    )


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """
    Login with email and password.
    Sets authentication cookie on success.
    """
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    # Set cookie
    set_auth_cookie(response, access_token)
    
    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            oauth_provider=user.oauth_provider,
            total_xp=user.total_xp,
            current_level=user.current_level,
            current_streak=user.current_streak
        ),
        message="Login successful"
    )


@app.post("/api/auth/logout")
async def logout(response: Response):
    """
    Logout user by clearing authentication cookie.
    """
    clear_auth_cookie(response)
    return {"message": "Logged out successfully"}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: UserProfile = Depends(get_current_user)):
    """
    Get current authenticated user information.
    Protected endpoint - requires authentication.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        oauth_provider=current_user.oauth_provider,
        total_xp=current_user.total_xp,
        current_level=current_user.current_level,
        current_streak=current_user.current_streak
    )


@app.get("/api/auth/google")
async def google_login(request: Request):
    """
    Initiate Google OAuth flow.
    Redirects to Google consent screen.
    """
    # Build redirect URI
    redirect_uri = f"{request.base_url}api/auth/google/callback"
    
    # Get Google OAuth URL
    auth_url = get_google_oauth_url(str(redirect_uri))
    
    return RedirectResponse(url=auth_url)


@app.get("/api/auth/google/callback")
async def google_callback(code: str, request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Handle Google OAuth callback.
    Exchanges code for tokens, gets user info, creates/updates user, and sets auth cookie.
    """
    try:
        # Build redirect URI
        redirect_uri = f"{request.base_url}api/auth/google/callback"
        
        # Exchange code for tokens
        token_data = await exchange_google_code(code, str(redirect_uri))
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        # Get user info from Google
        user_info = await get_google_user_info(access_token)
        
        # Extract user data
        email = user_info.get("email")
        google_id = user_info.get("id")
        full_name = user_info.get("name")
        email_verified = user_info.get("verified_email", False)
        
        if not email or not google_id:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        
        # Get or create user
        user = get_or_create_oauth_user(
            db=db,
            email=email,
            oauth_provider="google",
            oauth_id=google_id,
            full_name=full_name,
            email_verified=email_verified
        )
        
        # Create access token for our app
        app_token = create_access_token(data={"sub": user.id})
        
        # Set cookie
        set_auth_cookie(response, app_token)
        
        # Redirect to frontend
        return RedirectResponse(url=FRONTEND_URL)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth error: {str(e)}")


@app.post("/api/parse_dump", response_model=ParseResponse)
async def parse_dump(
    request: DumpRequest,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parse unstructured text and extract structured tasks using OpenAI.
    Now saves tasks to database.
    Protected endpoint - requires authentication.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    try:
        # Call OpenAI API
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.text}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        # Extract the response content
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        try:
            tasks_data = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            tasks_data = json.loads(content)
        
        # Validate that we got a list
        if not isinstance(tasks_data, list):
            raise ValueError("Expected a list of tasks")
        
        # Use authenticated user
        user = current_user
        
        # Validate and save each task to database
        validated_tasks = []
        for i, task in enumerate(tasks_data):
            # Generate unique ID using UUID to avoid conflicts
            task_id = f"task_{uuid.uuid4().hex[:12]}"
            task_title = task.get("title", "Untitled Task")
            task_tag = task.get("tag", "quick_win") if task.get("tag") in ["quick_win", "deep_work"] else "quick_win"
            task_priority = task.get("priority")
            
            # Create database task
            db_task = DBTask(
                id=task_id,
                user_id=user.id,
                title=task_title,
                description=task.get("description"),
                tag=task_tag,
                status="todo",
                priority=task_priority,
                xp_value=0,  # XP calculated on completion
                is_deleted=False,
                created_at=datetime.now(timezone.utc)
            )
            
            db.add(db_task)
            
            # Create response task
            validated_task = Task(
                id=task_id,
                title=task_title,
                description=task.get("description"),
                tag=task_tag,
                status="todo",
                priority=task_priority,
                xp_value=0
            )
            validated_tasks.append(validated_task)
        
        # Commit all tasks
        db.commit()
        
        return ParseResponse(tasks=validated_tasks)
    
    except openai.APIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error parsing tasks: {str(e)}")

@app.get("/api/tasks", response_model=TasksResponse)
async def get_tasks(
    status: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get tasks filtered by status.
    Protected endpoint - requires authentication.
    
    Query params:
    - status: 'todo', 'done', or 'all' (default: 'todo')
    """
    query = db.query(DBTask).filter(
        DBTask.user_id == current_user.id,
        DBTask.is_deleted == False
    )
    
    if status == "done":
        query = query.filter(DBTask.status == "done")
    elif status == "all":
        pass  # No status filter
    else:  # Default to 'todo'
        query = query.filter(DBTask.status == "todo")
    
    db_tasks = query.order_by(DBTask.created_at.desc()).all()
    tasks = [db_task_to_pydantic(t) for t in db_tasks]
    
    return TasksResponse(tasks=tasks, count=len(tasks))

@app.post("/api/tasks/{task_id}/complete", response_model=CompleteTaskResponse)
async def complete_task(
    task_id: str,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a task as complete and award XP, update streaks, check achievements.
    Protected endpoint - requires authentication.
    """
    # Get task (ensure it belongs to current user)
    db_task = db.query(DBTask).filter(
        DBTask.id == task_id,
        DBTask.user_id == current_user.id,
        DBTask.is_deleted == False
    ).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if db_task.status == "done":
        raise HTTPException(status_code=400, detail="Task already completed")
    
    try:
        # Use current authenticated user
        user = current_user
        
        # Calculate XP for this task
        xp_earned = calculate_xp(db_task)
        db_task.xp_value = xp_earned
        
        # Update task status
        db_task.status = "done"
        db_task.completed_at = datetime.now(timezone.utc)
        
        # Store old XP for level check
        old_xp = user.total_xp
        
        # Award XP to user
        user.total_xp += xp_earned
        
        # Check for level up
        new_level = check_level_up(old_xp, user.total_xp)
        level_up = new_level is not None
        if level_up:
            user.current_level = new_level
        
        # Update streak
        streak_info = update_streak(user, db_task.completed_at)
        
        # Update daily stats
        update_daily_stats(db, user, db_task)
        
        # Get all user tasks for achievement checking
        all_tasks = db.query(DBTask).filter(DBTask.user_id == user.id).all()
        
        # Check for achievements
        unlocked_achievements = check_achievements(db, user, all_tasks)
        
        # Commit all changes
        db.commit()
        db.refresh(db_task)
        db.refresh(user)
        
        return CompleteTaskResponse(
            task=db_task_to_pydantic(db_task),
            xp_earned=xp_earned,
            level_up=level_up,
            new_level=new_level,
            unlocked_achievements=unlocked_achievements,
            streak_info=streak_info
        )
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error completing task: {str(e)}")

@app.get("/api/backlog", response_model=BacklogResponse)
async def get_backlog(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get completed tasks (backlog) with pagination.
    Protected endpoint - requires authentication.
    
    Query params:
    - page: Page number (default: 1)
    - limit: Items per page (default: 20)
    - search: Search term for title/description (optional)
    """
    query = db.query(DBTask).filter(
        DBTask.user_id == current_user.id,
        DBTask.status == "done",
        DBTask.is_deleted == False
    )
    
    # Apply search filter if provided
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (DBTask.title.ilike(search_term)) | (DBTask.description.ilike(search_term))
        )
    
    # Get total count
    total_count = query.count()
    total_pages = (total_count + limit - 1) // limit  # Ceiling division
    
    # Apply pagination
    offset = (page - 1) * limit
    db_tasks = query.order_by(DBTask.completed_at.desc()).offset(offset).limit(limit).all()
    
    tasks = [db_task_to_pydantic(t) for t in db_tasks]
    
    return BacklogResponse(
        tasks=tasks,
        count=len(tasks),
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@app.get("/api/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user profile with XP, level, and streak information.
    Protected endpoint - requires authentication.
    """
    user = current_user
    xp_progress = get_xp_progress(user)
    
    return ProfileResponse(
        id=user.id,
        total_xp=user.total_xp,
        current_level=user.current_level,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        xp_progress=xp_progress
    )

@app.get("/api/achievements", response_model=AchievementsResponse)
async def get_achievements(
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all achievements (locked and unlocked) with progress for the user.
    Protected endpoint - requires authentication.
    """
    user = current_user
    
    # Get unlocked achievements
    db_achievements = db.query(DBAchievement).filter(
        DBAchievement.user_id == user.id
    ).all()
    unlocked_keys = {ach.achievement_key: ach for ach in db_achievements}
    
    # Get user stats for progress calculation
    all_tasks = db.query(DBTask).filter(DBTask.user_id == user.id).all()
    completed_tasks = [t for t in all_tasks if t.status == "done" and not t.is_deleted]
    total_completed = len(completed_tasks)
    quick_wins = len([t for t in completed_tasks if t.tag == "quick_win"])
    deep_work = len([t for t in completed_tasks if t.tag == "deep_work"])
    
    # Get today's completed tasks
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_tasks = []
    for t in completed_tasks:
        if t.completed_at:
            completed_at = t.completed_at
            if completed_at.tzinfo is None:
                completed_at = completed_at.replace(tzinfo=timezone.utc)
            if completed_at >= today:
                today_tasks.append(t)
    
    # Build progress data for each achievement
    progress_map = {
        "first_task": {"current": total_completed, "required": 1},
        "quick_win_5": {"current": quick_wins, "required": 5},
        "deep_work_3": {"current": deep_work, "required": 3},
        "streak_3": {"current": user.current_streak, "required": 3},
        "streak_7": {"current": user.current_streak, "required": 7},
        "streak_30": {"current": user.current_streak, "required": 30},
        "level_5": {"current": user.current_level, "required": 5},
        "level_10": {"current": user.current_level, "required": 10},
        "level_20": {"current": user.current_level, "required": 20},
        "tasks_10": {"current": total_completed, "required": 10},
        "tasks_50": {"current": total_completed, "required": 50},
        "tasks_100": {"current": total_completed, "required": 100},
        "daily_5": {"current": len(today_tasks), "required": 5},
    }
    
    # Build response with all achievements
    achievements = []
    for key, ach_data in ACHIEVEMENTS.items():
        unlocked_ach = unlocked_keys.get(key)
        achievements.append(AchievementResponse(
            key=key,
            name=ach_data["name"],
            description=ach_data["description"],
            icon=ach_data["icon"],
            unlocked=unlocked_ach is not None,
            unlocked_at=unlocked_ach.unlocked_at.isoformat() if unlocked_ach else None,
            progress=progress_map.get(key)
        ))
    
    return AchievementsResponse(achievements=achievements, count=len(achievements))

@app.get("/api/stats", response_model=StatsResponse)
async def get_stats(
    period: str = "week",
    current_user: UserProfile = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get aggregated statistics for a time period.
    Protected endpoint - requires authentication.
    
    Query params:
    - period: 'week', 'month', 'all' (default: 'week')
    """
    user = current_user
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:  # 'all'
        start_date = datetime.min.replace(tzinfo=timezone.utc)
    
    # Query completed tasks in period
    completed_tasks = db.query(DBTask).filter(
        DBTask.user_id == user.id,
        DBTask.status == "done",
        DBTask.is_deleted == False,
        DBTask.completed_at >= start_date
    ).all()
    
    # Calculate stats
    total_tasks = len(completed_tasks)
    quick_wins = len([t for t in completed_tasks if t.tag == "quick_win"])
    deep_work = len([t for t in completed_tasks if t.tag == "deep_work"])
    total_xp = sum(t.xp_value for t in completed_tasks)
    
    # Daily breakdown
    daily_breakdown = {}
    for task in completed_tasks:
        if task.completed_at:
            date_key = task.completed_at.date().isoformat()
            if date_key not in daily_breakdown:
                daily_breakdown[date_key] = {
                    "date": date_key,
                    "tasks": 0,
                    "quick_wins": 0,
                    "deep_work": 0,
                    "xp": 0
                }
            daily_breakdown[date_key]["tasks"] += 1
            daily_breakdown[date_key]["xp"] += task.xp_value
            if task.tag == "quick_win":
                daily_breakdown[date_key]["quick_wins"] += 1
            else:
                daily_breakdown[date_key]["deep_work"] += 1
    
    daily_breakdown_list = sorted(daily_breakdown.values(), key=lambda x: x["date"])
    
    # Calculate averages
    days_in_period = (now - start_date).days or 1
    avg_tasks_per_day = total_tasks / days_in_period if days_in_period > 0 else 0
    
    # Completion rate (completed vs created in period)
    created_tasks = db.query(DBTask).filter(
        DBTask.user_id == user.id,
        DBTask.is_deleted == False,
        DBTask.created_at >= start_date
    ).count()
    completion_rate = (total_tasks / created_tasks * 100) if created_tasks > 0 else 0
    
    return {
        "period": period,
        "total_tasks": total_tasks,
        "quick_wins": quick_wins,
        "deep_work": deep_work,
        "total_xp": total_xp,
        "current_streak": user.current_streak,
        "longest_streak": user.longest_streak,
        "daily_breakdown": daily_breakdown_list,
        "completion_rate": round(completion_rate, 1),
        "avg_tasks_per_day": round(avg_tasks_per_day, 1)
    }

def update_daily_stats(db: Session, user: UserProfile, task: DBTask):
    """Update daily statistics when a task is completed"""
    if not task.completed_at:
        return
    
    # Get date at midnight UTC
    date = task.completed_at.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get or create daily stat
    daily_stat = db.query(DailyStat).filter(
        DailyStat.user_id == user.id,
        DailyStat.date == date
    ).first()
    
    if not daily_stat:
        daily_stat = DailyStat(
            user_id=user.id,
            date=date,
            tasks_completed=0,
            quick_wins=0,
            deep_work=0,
            xp_earned=0,
            streak_count=user.current_streak
        )
        db.add(daily_stat)
    
    # Update stats
    daily_stat.tasks_completed += 1
    daily_stat.xp_earned += task.xp_value
    daily_stat.streak_count = user.current_streak
    
    if task.tag == "quick_win":
        daily_stat.quick_wins += 1
    else:
        daily_stat.deep_work += 1

@app.post("/api/chat_intervention", response_model=InterventionResponse)
async def chat_intervention(
    request: InterventionRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Provide compassionate body-double support when user is stuck on a task.
    AI acts as a supportive companion suggesting smaller, actionable steps.
    Protected endpoint - requires authentication.
    """
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    try:
        # Create a compassionate body-double prompt
        system_prompt = """You are a compassionate body-double assistant helping someone with ADHD who is stuck on a task.

Your role is to:
1. Be warm, understanding, and non-judgmental
2. Break down the task into the SMALLEST possible first step
3. Suggest something so simple it feels almost silly (e.g., "Just open the file", "Just write one word")
4. Use encouraging, friendly language
5. Keep your response SHORT (1-3 sentences max)
6. Focus on the immediate next micro-action, not the whole task

Examples of good responses:
- "Hey, no worries! Let's start super small - just open the file. That's it. Nothing else yet."
- "I get it! How about we just write the first word? Literally just one word. We'll figure out the rest after."
- "Totally normal to feel stuck! Let's just create a blank document. Don't even think about filling it yet."

Be their supportive friend who helps them take the tiniest step forward."""

        user_message = f"I'm stuck on this task: {request.task_title}"
        if request.task_description:
            user_message += f"\nContext: {request.task_description}"

        # Call OpenAI API
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.8,
            max_tokens=150
        )
        
        # Extract the response content
        message = response.choices[0].message.content.strip()
        
        return InterventionResponse(message=message)
    
    except openai.APIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating intervention: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "openai_configured": bool(openai.api_key)
    }

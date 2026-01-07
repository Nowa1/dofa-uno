# Backlog, Gamification & Statistics Architecture

## Executive Summary

This document outlines the comprehensive architecture for adding **persistence**, **backlog management**, **gamification**, and **statistics** features to the dofa.uno ADHD task management app. The design prioritizes ADHD-friendly principles: celebrating wins, avoiding overwhelm, and providing clear visual feedback.

**Key Additions:**
- SQLite database for persistent task storage
- Backlog system for completed tasks with timestamps
- XP/Level system with achievements and streaks
- Statistics dashboard with time-based analytics
- Backward-compatible API design

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Data Models & Schema](#data-models--schema)
3. [Backend API Design](#backend-api-design)
4. [Frontend Architecture](#frontend-architecture)
5. [Gamification System](#gamification-system)
6. [Statistics & Analytics](#statistics--analytics)
7. [Implementation Strategy](#implementation-strategy)
8. [Technical Considerations](#technical-considerations)
9. [ADHD-Friendly Design Principles](#adhd-friendly-design-principles)

---

## Current State Analysis

### Existing Implementation

**Backend:**
- FastAPI with OpenAI integration
- No database (stateless)
- Two endpoints: `/api/parse_dump`, `/api/chat_intervention`
- Task model: `id`, `title`, `description`, `tag`, `status`, `priority`

**Frontend:**
- React with local state management
- Tasks stored in component state (lost on refresh)
- Status toggle: todo ↔ done
- Mascot states: idle, focus, panic, triumph
- NeuroTunnel focus mode

### Key Constraints

1. **No Database:** Tasks are ephemeral
2. **No User System:** Single-user MVP
3. **Simple State:** Only todo/done status
4. **No History:** Completed tasks disappear
5. **No Metrics:** No tracking of progress over time

---

## Data Models & Schema

### Database Choice: SQLite

**Rationale:**
- Zero configuration, file-based
- Perfect for single-user MVP
- Easy to migrate to PostgreSQL later
- Built-in Python support via SQLAlchemy

### Core Models

#### 1. UserProfile
```python
class UserProfile(Base):
    id = Column(Integer, primary_key=True, default=1)
    total_xp = Column(Integer, default=0)
    current_level = Column(Integer, default=1)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
```

#### 2. Task (Enhanced)
```python
class Task(Base):
    id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"))
    title = Column(String(500), nullable=False)
    description = Column(String(2000))
    tag = Column(String(50))  # 'quick_win' or 'deep_work'
    status = Column(String(50), default="todo")
    priority = Column(Integer)
    estimated_minutes = Column(Integer)
    xp_value = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    is_archived = Column(Boolean, default=False)
```

#### 3. Achievement
```python
class Achievement(Base):
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"))
    achievement_type = Column(String(100))
    achievement_name = Column(String(200))
    description = Column(String(500))
    unlocked_at = Column(DateTime, default=datetime.utcnow)
```

#### 4. DailyStat
```python
class DailyStat(Base):
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"))
    stat_date = Column(Date, unique=True)
    tasks_completed = Column(Integer, default=0)
    quick_wins_completed = Column(Integer, default=0)
    deep_work_completed = Column(Integer, default=0)
    xp_earned = Column(Integer, default=0)
    streak_maintained = Column(Boolean, default=False)
```

---

## Backend API Design

### New Endpoints

#### Task Management
- **POST `/api/parse_dump`** - Enhanced to save to database
- **GET `/api/tasks`** - Get all tasks with filtering
- **PATCH `/api/tasks/{id}`** - Update task status (awards XP)
- **DELETE `/api/tasks/{id}`** - Soft delete (archive)

#### Backlog
- **GET `/api/backlog`** - Get completed tasks with pagination/search

#### Gamification
- **GET `/api/profile`** - Get user XP, level, streak
- **GET `/api/achievements`** - Get unlocked and available achievements

#### Statistics
- **GET `/api/stats/summary`** - Get aggregated statistics
- **GET `/api/stats/chart`** - Get chart data for visualizations

### Key API Behaviors

**Task Completion Flow:**
1. Client sends `PATCH /api/tasks/{id}` with `status: "done"`
2. Server updates task, awards XP
3. Server checks for level up
4. Server updates streak
5. Server checks for new achievements
6. Server returns: task, xp_awarded, level_up, new_achievements, streak_updated

---

## Frontend Architecture

### State Management

**Strategy:** Local state + Backend sync (no Zustand needed for MVP)

**Pattern:**
1. Fetch from backend on mount
2. Update local state optimistically
3. Sync to backend
4. Refresh on critical operations

### New Components

1. **BacklogView.jsx** - Display completed tasks with search
2. **StatsPanel.jsx** - Statistics dashboard with charts
3. **GamificationHUD.jsx** - Fixed HUD showing level/XP/streak
4. **XPBar.jsx** - Animated progress bar
5. **AchievementToast.jsx** - Toast notifications for achievements
6. **LevelUpModal.jsx** - Fullscreen celebration modal
7. **StatsChart.jsx** - Chart visualizations

### Enhanced Dashboard

```jsx
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('tasks'); // tasks, backlog, stats
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchTasks();
    fetchProfile();
  }, []);

  const handleTaskComplete = async (taskId) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'done' })
    });
    
    const data = await response.json();
    
    // Update UI
    setTasks(tasks.filter(t => t.id !== taskId));
    fetchProfile();
    
    // Show celebrations
    if (data.level_up) showLevelUpModal(data.new_level);
    if (data.new_achievements) showAchievementToasts(data.new_achievements);
  };

  return (
    <>
      <GamificationHUD profile={profile} />
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'tasks' && <TaskView tasks={tasks} onComplete={handleTaskComplete} />}
      {activeTab === 'backlog' && <BacklogView />}
      {activeTab === 'stats' && <StatsPanel profile={profile} />}
    </>
  );
};
```

---

## Gamification System

### XP Calculation

**Base Values:**
- Quick Win: **10 XP**
- Deep Work: **25 XP**

**Multipliers:**
- Priority 1-2: **1.5x**
- Streak bonus (every 7 days): **+5 XP per task**
- Perfect day (10+ tasks): **+50 XP bonus**

**Level Progression:**
```javascript
// XP required for level N
xpForLevel(N) = 100 * (N ^ 1.5)

// Examples:
Level 1→2: 100 XP
Level 2→3: 283 XP
Level 5→6: 1,118 XP
Level 10→11: 3,162 XP
```

### Streak Logic

**Rules:**
- Increments when completing ≥1 task per day
- Breaks if no tasks for >24 hours
- Based on `last_activity_date`

**Implementation:**
```python
def update_streak(user, today):
    if user.last_activity_date:
        days_diff = (today - user.last_activity_date.date()).days
        if days_diff == 1:
            user.current_streak += 1
        elif days_diff > 1:
            user.current_streak = 1
    else:
        user.current_streak = 1
    
    user.longest_streak = max(user.longest_streak, user.current_streak)
```

### Achievements

| Achievement | Condition | XP Bonus |
|------------|-----------|----------|
| First Steps | Complete 1 task | +25 |
| Getting Started | 3-day streak | +50 |
| Week Warrior | 7-day streak | +100 |
| Monthly Master | 30-day streak | +500 |
| Quick Draw | 10 quick wins | +75 |
| Deep Diver | 10 deep work | +150 |
| Rising Star | Level 5 | +200 |
| Task Master | Level 10 | +500 |
| Half Century | 50 tasks | +250 |
| Centurion | 100 tasks | +1000 |
| Perfect Day | 10 tasks/day | +100 |
| Early Bird | Task before 9 AM | +25 |
| Night Owl | Task after 10 PM | +25 |

### Visual Rewards

**Task Completion:**
- Confetti animation
- Sound effect
- +XP floating number
- Task card fade-out

**Level Up:**
- Fullscreen modal with confetti
- Celebration sound
- Mascot triumph animation

**Achievement Unlock:**
- Toast notification (top-right)
- Achievement icon animation
- Sound effect

**Streak Milestones:**
- Flame icon grows
- Color shifts (orange → red → gold)
- Particle effects

---

## Statistics & Analytics

### Metrics Tracked

**Daily:**
- Tasks completed (total, quick_win, deep_work)
- XP earned
- Streak maintained

**Aggregate:**
- Total tasks completed
- Completion rate (% of days with tasks)
- Average tasks per day
- Most productive day
- Task type distribution

### Visualizations

**1. Task Completion Chart**
- Line/bar chart showing tasks per day
- Color-coded by type (quick_win vs deep_work)
- Period: week, month, year

**2. XP Progress Chart**
- Area chart showing XP earned over time
- Highlights level-up milestones

**3. Streak Visualization**
- Calendar heatmap showing active days
- Highlights current and longest streaks

**4. Task Type Distribution**
- Pie/donut chart showing quick_win vs deep_work ratio

---

## Implementation Strategy

### Phase 1: Database & Persistence

**Goal:** Add SQLite database and basic persistence

**Tasks:**
1. Create `database.py` with SQLAlchemy setup
2. Create models: UserProfile, Task, Achievement, DailyStat
3. Add database initialization to `main.py`
4. Update `/api/parse_dump` to save tasks to DB
5. Create `/api/tasks` GET endpoint
6. Update frontend to fetch tasks on mount

**Testing:**
- Tasks persist across page refreshes
- New tasks don't overwrite old tasks

**Duration:** 1-2 days

---

### Phase 2: Backlog & Task Management

**Goal:** Implement backlog viewing and task CRUD

**Tasks:**
1. Create `/api/backlog` endpoint with pagination
2. Create `/api/tasks/{id}` PATCH endpoint
3. Create `/api/tasks/{id}` DELETE endpoint (soft delete)
4. Build `BacklogView.jsx` component
5. Add search and filter functionality
6. Add tab navigation to Dashboard

**Testing:**
- Completed tasks move to backlog
- Backlog is searchable and filterable
- Tasks can be archived

**Duration:** 1-2 days

---

### Phase 3: Gamification Core

**Goal:** Implement XP, levels, and streaks

**Tasks:**
1. Add XP calculation logic to Task model
2. Update `/api/tasks/{id}` PATCH to award XP
3. Implement level-up logic
4. Implement streak tracking
5. Create `/api/profile` endpoint
6. Build `GamificationHUD.jsx` component
7. Build `XPBar.jsx` component
8. Build `LevelUpModal.jsx` component

**Testing:**
- XP awarded on task completion
- Level ups trigger correctly
- Streaks increment/break properly
- Visual celebrations work

**Duration:** 2-3 days

---

### Phase 4: Achievements

**Goal:** Implement achievement system

**Tasks:**
1. Create `achievement_service.py` with definitions
2. Implement achievement checking logic
3. Create `/api/achievements` endpoint
4. Build `AchievementToast.jsx` component
5. Add achievement display to profile
6. Trigger achievement checks on task completion

**Testing:**
- Achievements unlock at correct milestones
- Toast notifications appear
- Achievements persist

**Duration:** 1-2 days

---

### Phase 5: Statistics Dashboard

**Goal:** Build statistics and analytics

**Tasks:**
1. Implement daily stats tracking
2. Create `/api/stats/summary` endpoint
3. Create `/api/stats/chart` endpoint
4. Build `StatsPanel.jsx` component
5. Build `StatsChart.jsx` component
6. Add chart library (recharts or chart.js)
7. Implement time period filtering

**Testing:**
- Stats calculate correctly
- Charts render properly
- Data updates in real-time

**Duration:** 2-3 days

---

### Phase 6: Polish & Optimization

**Goal:** Refine UX and fix bugs

**Tasks:**
1. Add loading states
2. Improve error handling
3. Add animations and transitions
4. Optimize database queries
5. Add data migration script
6. Write documentation
7. Performance testing

**Duration:** 1-2 days

---

## Technical Considerations

### Database Performance

**Indexing:**
```python
# Add indexes for common queries
Index('idx_task_status', Task.status)
Index('idx_task_completed_at', Task.completed_at)
Index('idx_daily_stat_date', DailyStat.stat_date)
```

**Query Optimization:**
- Use eager loading for relationships
- Limit backlog queries with pagination
- Cache profile data in frontend

### Data Migration

**Strategy:**
- No existing data to migrate (fresh start)
- Database auto-creates on first run
- Default user profile created automatically

**Future Migration Path:**
```python
# If moving to PostgreSQL later
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dofa_uno.db")
# Just change URL, SQLAlchemy handles the rest
```

### Error Handling

**Backend:**
```python
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "Something went wrong. Your data is safe."}
    )
```

**Frontend:**
```jsx
try {
  await apiCall();
} catch (error) {
  showErrorToast("Oops! That didn't work. Try again?");
  // Don't lose user's work
}
```

### Edge Cases

1. **Streak breaks during server downtime**
   - Solution: Grace period of 36 hours

2. **Multiple tasks completed simultaneously**
   - Solution: Batch XP awards, single level-up check

3. **Achievement unlocked twice**
   - Solution: Check existing achievements before creating

4. **Browser refresh during level-up animation**
   - Solution: Store level-up state in localStorage temporarily

5. **Task completed at midnight**
   - Solution: Use server time, not client time

---

## ADHD-Friendly Design Principles

### 1. Celebrate Every Win

**Implementation:**
- Immediate visual feedback on task completion
- Sound effects for dopamine hit
- Confetti animations
- XP numbers float up
- Mascot celebrates

**Why:** People with ADHD need frequent positive reinforcement

---

### 2. Avoid Overwhelm

**Implementation:**
- Hide backlog by default (separate tab)
- Limit visible tasks to active ones
- Progressive disclosure of stats
- Simple, clean UI
- No clutter

**Why:** Too much information causes paralysis

---

### 3. Make Progress Visible

**Implementation:**
- XP bar always visible
- Streak counter prominent
- Stats show trends, not just numbers
- Visual charts over tables
- Achievement badges

**Why:** Visible progress motivates continued effort

---

### 4. Reduce Friction

**Implementation:**
- One-click task completion
- Auto-save everything
- No confirmation dialogs (use undo instead)
- Fast animations (200-300ms)
- Keyboard shortcuts

**Why:** Every extra step is a chance to lose focus

---

### 5. Gamify Without Pressure

**Implementation:**
- No penalties for missed days
- Streak breaks don't lose XP
- Achievements are additive, not competitive
- No timers on tasks (except in focus mode)
- Celebrate attempts, not just completions

**Why:** Pressure and shame are counterproductive for ADHD

---

### 6. Provide Structure

**Implementation:**
- Clear task categories (quick_win vs deep_work)
- Consistent layout
- Predictable navigation
- Visual hierarchy
- Color coding

**Why:** External structure compensates for executive dysfunction

---

### 7. Enable Hyperfocus

**Implementation:**
- NeuroTunnel focus mode removes all distractions
- No notifications during focus
- Immersive, calming visuals
- Optional background sounds
- Easy exit (ESC key)

**Why:** Support flow states when they happen

---

## API Response Examples

### Task Completion Response

```json
{
  "task": {
    "id": "task_123",
    "title": "Reply to emails",
    "status": "done",
    "xp_value": 10,
    "completed_at": "2026-01-07T14:30:00Z"
  },
  "xp_awarded": 10,
  "level_up": false,
  "new_level": 3,
  "new_achievements": [],
  "streak_updated": true,
  "current_streak": 5
}
```

### Profile Response

```json
{
  "id": 1,
  "total_xp": 450,
  "current_level": 3,
  "current_streak": 5,
  "longest_streak": 12,
  "xp_for_next_level": 283,
  "xp_progress_percentage": 58.7,
  "last_activity_date": "2026-01-07T14:30:00Z"
}
```

### Stats Summary Response

```json
{
  "total_tasks_completed": 45,
  "total_quick_wins": 30,
  "total_deep_work": 15,
  "completion_rate_7d": 85.7,
  "completion_rate_30d": 73.3,
  "average_tasks_per_day": 3.2,
  "most_productive_day": "2026-01-05",
  "daily_stats": [
    {
      "stat_date": "2026-01-07",
      "tasks_completed": 4,
      "quick_wins_completed": 3,
      "deep_work_completed": 1,
      "xp_earned": 55,
      "streak_maintained": true
    }
  ]
}
```

---

## Dependencies to Add

### Backend

```txt
# requirements.txt additions
sqlalchemy==2.0.23
alembic==1.13.1  # For future migrations
```

### Frontend

```json
{
  "dependencies": {
    "recharts": "^2.10.3",
    "react-confetti": "^6.1.0",
    "react-use": "^17.4.2"
  }
}
```

---

## File Structure After Implementation

```
backend/
├── main.py (enhanced)
├── database.py (new)
├── models.py (new)
├── schemas.py (new)
├── services/
│   └── achievement_service.py (new)
└── dofa_uno.db (generated)

frontend/src/
├── App.jsx (enhanced)
├── components/
│   ├── Dashboard.jsx (enhanced)
│   ├── BacklogView.jsx (new)
│   ├── StatsPanel.jsx (new)
│   ├── StatsChart.jsx (new)
│   ├── GamificationHUD.jsx (new)
│   ├── XPBar.jsx (new)
│   ├── AchievementToast.jsx (new)
│   ├── LevelUpModal.jsx (new)
│   ├── Mascot.jsx (existing)
│   └── NeuroTunnel.jsx (existing)
└── utils/
    └── api.js (new)
```

---

## Success Criteria

### Phase 1 Complete When:
- ✅ Tasks persist across refreshes
- ✅ Database file created
- ✅ No data loss on page reload

### Phase 2 Complete When:
- ✅ Backlog view shows completed tasks
- ✅ Search and filter work
- ✅ Tasks can be archived

### Phase 3 Complete When:
- ✅ XP awarded on completion
- ✅ Level ups trigger
- ✅ Streaks track correctly
- ✅ HUD displays live data

### Phase 4 Complete When:
- ✅ Achievements unlock
- ✅ Toasts appear
- ✅ All 13 achievements work

### Phase 5 Complete When:
- ✅ Stats calculate correctly
- ✅ Charts render
- ✅ Time periods filter

### Phase 6 Complete When:
- ✅ No critical bugs
- ✅ Smooth animations
- ✅ Fast load times
- ✅ Documentation complete

---

## Conclusion

This architecture provides a comprehensive roadmap for adding persistence, backlog, gamification, and statistics to dofa.uno while maintaining ADHD-friendly design principles. The phased approach allows for incremental development and testing, ensuring each feature works before moving to the next.

**Key Design Decisions:**
1. **SQLite** for simplicity and zero config
2. **Local state + backend sync** to avoid complexity
3. **Exponential XP curve** for long-term engagement
4. **Soft deletes** to preserve data
5. **Celebration-first** gamification without pressure
6. **Progressive disclosure** to avoid overwhelm

**Next Steps:**
1. Review and approve this architecture
2. Begin Phase 1 implementation
3. Test each phase before proceeding
4. Iterate based on user feedback

The system is designed to grow with the user, celebrating every small win while providing meaningful long-term progression tracking.

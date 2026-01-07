from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from database import Task, UserProfile, Achievement
import math

# Achievement Definitions
ACHIEVEMENTS = {
    "first_task": {
        "key": "first_task",
        "name": "First Steps",
        "description": "Complete your first task",
        "icon": "🎯"
    },
    "quick_win_5": {
        "key": "quick_win_5",
        "name": "Quick Starter",
        "description": "Complete 5 quick wins",
        "icon": "⚡"
    },
    "deep_work_3": {
        "key": "deep_work_3",
        "name": "Deep Diver",
        "description": "Complete 3 deep work sessions",
        "icon": "🧠"
    },
    "streak_3": {
        "key": "streak_3",
        "name": "Building Momentum",
        "description": "Maintain a 3-day streak",
        "icon": "🔥"
    },
    "streak_7": {
        "key": "streak_7",
        "name": "Week Warrior",
        "description": "Maintain a 7-day streak",
        "icon": "💪"
    },
    "streak_30": {
        "key": "streak_30",
        "name": "Unstoppable",
        "description": "Maintain a 30-day streak",
        "icon": "🏆"
    },
    "level_5": {
        "key": "level_5",
        "name": "Rising Star",
        "description": "Reach level 5",
        "icon": "⭐"
    },
    "level_10": {
        "key": "level_10",
        "name": "Expert",
        "description": "Reach level 10",
        "icon": "💎"
    },
    "level_20": {
        "key": "level_20",
        "name": "Master",
        "description": "Reach level 20",
        "icon": "👑"
    },
    "tasks_10": {
        "key": "tasks_10",
        "name": "Getting Started",
        "description": "Complete 10 tasks",
        "icon": "📝"
    },
    "tasks_50": {
        "key": "tasks_50",
        "name": "Productive",
        "description": "Complete 50 tasks",
        "icon": "🚀"
    },
    "tasks_100": {
        "key": "tasks_100",
        "name": "Centurion",
        "description": "Complete 100 tasks",
        "icon": "💯"
    },
    "daily_5": {
        "key": "daily_5",
        "name": "Power Day",
        "description": "Complete 5 tasks in one day",
        "icon": "⚡"
    }
}


def calculate_xp(task: Task) -> int:
    """
    Calculate XP value for a task based on tag and priority.
    
    Base XP:
    - quick_win: 10 XP
    - deep_work: 25 XP
    
    Priority multiplier (for priority 1-2):
    - Priority 1: 1.5x
    - Priority 2: 1.5x
    - Priority 3+: 1.0x
    
    Args:
        task: Task object with tag and priority
        
    Returns:
        int: XP value for the task
    """
    # Base XP by tag
    base_xp = 25 if task.tag == "deep_work" else 10
    
    # Priority multiplier
    multiplier = 1.5 if task.priority and task.priority <= 2 else 1.0
    
    return int(base_xp * multiplier)


def calculate_level(total_xp: int) -> int:
    """
    Calculate level based on total XP using formula: 100 * (level ^ 1.5)
    
    Level 1: 0 XP
    Level 2: 100 * (2 ^ 1.5) ≈ 283 XP
    Level 3: 100 * (3 ^ 1.5) ≈ 520 XP
    Level 4: 100 * (4 ^ 1.5) = 800 XP
    Level 5: 100 * (5 ^ 1.5) ≈ 1118 XP
    
    Args:
        total_xp: Total XP accumulated
        
    Returns:
        int: Current level
    """
    if total_xp <= 0:
        return 1
    
    # Solve for level: total_xp = 100 * (level ^ 1.5)
    # level = (total_xp / 100) ^ (1 / 1.5)
    level = math.pow(total_xp / 100, 1 / 1.5)
    return max(1, int(level))


def calculate_xp_for_level(level: int) -> int:
    """
    Calculate total XP required to reach a specific level.
    
    Args:
        level: Target level
        
    Returns:
        int: Total XP required
    """
    if level <= 1:
        return 0
    return int(100 * math.pow(level, 1.5))


def check_level_up(old_xp: int, new_xp: int) -> Optional[int]:
    """
    Check if user leveled up and return new level if so.
    
    Args:
        old_xp: XP before task completion
        new_xp: XP after task completion
        
    Returns:
        Optional[int]: New level if leveled up, None otherwise
    """
    old_level = calculate_level(old_xp)
    new_level = calculate_level(new_xp)
    
    if new_level > old_level:
        return new_level
    return None


def update_streak(user_profile: UserProfile, completion_date: datetime) -> Dict:
    """
    Update user's streak based on task completion date.
    
    Streak logic:
    - If last_task_date is None: start streak at 1
    - If last_task_date is today: maintain current streak
    - If last_task_date is yesterday: increment streak
    - If last_task_date is 2+ days ago: reset streak to 1
    
    Args:
        user_profile: UserProfile object
        completion_date: DateTime of task completion (UTC)
        
    Returns:
        Dict with streak info: current_streak, longest_streak, is_new_record
    """
    # Ensure completion_date is timezone-aware
    if completion_date.tzinfo is None:
        completion_date = completion_date.replace(tzinfo=timezone.utc)
    
    # Get date at midnight UTC for comparison
    completion_day = completion_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if user_profile.last_task_date is None:
        # First task ever
        user_profile.current_streak = 1
        user_profile.last_task_date = completion_date
    else:
        # Ensure last_task_date is timezone-aware
        last_date = user_profile.last_task_date
        if last_date.tzinfo is None:
            last_date = last_date.replace(tzinfo=timezone.utc)
        
        last_day = last_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_diff = (completion_day - last_day).days
        
        if day_diff == 0:
            # Same day - maintain streak
            pass
        elif day_diff == 1:
            # Next day - increment streak
            user_profile.current_streak += 1
            user_profile.last_task_date = completion_date
        else:
            # Streak broken - reset to 1
            user_profile.current_streak = 1
            user_profile.last_task_date = completion_date
    
    # Update longest streak if current is higher
    is_new_record = False
    if user_profile.current_streak > user_profile.longest_streak:
        user_profile.longest_streak = user_profile.current_streak
        is_new_record = True
    
    return {
        "current_streak": user_profile.current_streak,
        "longest_streak": user_profile.longest_streak,
        "is_new_record": is_new_record
    }


def check_achievements(db, user_profile: UserProfile, tasks: List[Task]) -> List[Dict]:
    """
    Check for newly unlocked achievements based on user stats and tasks.
    
    Args:
        db: Database session
        user_profile: UserProfile object
        tasks: List of all user's tasks
        
    Returns:
        List[Dict]: List of newly unlocked achievements
    """
    newly_unlocked = []
    
    # Get already unlocked achievements
    existing_achievements = db.query(Achievement).filter(
        Achievement.user_id == user_profile.id
    ).all()
    existing_keys = {ach.achievement_key for ach in existing_achievements}
    
    # Count completed tasks
    completed_tasks = [t for t in tasks if t.status == "done" and not t.is_deleted]
    total_completed = len(completed_tasks)
    quick_wins = len([t for t in completed_tasks if t.tag == "quick_win"])
    deep_work = len([t for t in completed_tasks if t.tag == "deep_work"])
    
    # Get today's completed tasks for daily achievement
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_tasks = []
    for t in completed_tasks:
        if t.completed_at:
            # Ensure completed_at is timezone-aware
            completed_at = t.completed_at
            if completed_at.tzinfo is None:
                completed_at = completed_at.replace(tzinfo=timezone.utc)
            if completed_at >= today:
                today_tasks.append(t)
    
    # Check each achievement
    achievements_to_check = [
        ("first_task", total_completed >= 1),
        ("quick_win_5", quick_wins >= 5),
        ("deep_work_3", deep_work >= 3),
        ("streak_3", user_profile.current_streak >= 3),
        ("streak_7", user_profile.current_streak >= 7),
        ("streak_30", user_profile.current_streak >= 30),
        ("level_5", user_profile.current_level >= 5),
        ("level_10", user_profile.current_level >= 10),
        ("level_20", user_profile.current_level >= 20),
        ("tasks_10", total_completed >= 10),
        ("tasks_50", total_completed >= 50),
        ("tasks_100", total_completed >= 100),
        ("daily_5", len(today_tasks) >= 5),
    ]
    
    for achievement_key, condition in achievements_to_check:
        if condition and achievement_key not in existing_keys:
            # Unlock achievement
            new_achievement = Achievement(
                user_id=user_profile.id,
                achievement_key=achievement_key,
                unlocked_at=datetime.now(timezone.utc)
            )
            db.add(new_achievement)
            
            # Add to newly unlocked list
            achievement_data = ACHIEVEMENTS[achievement_key].copy()
            achievement_data["unlocked_at"] = new_achievement.unlocked_at.isoformat()
            newly_unlocked.append(achievement_data)
    
    if newly_unlocked:
        db.commit()
    
    return newly_unlocked


def get_xp_progress(user_profile: UserProfile) -> Dict:
    """
    Calculate XP progress for current level.
    
    Args:
        user_profile: UserProfile object
        
    Returns:
        Dict with current_level, total_xp, current_level_xp, next_level_xp, 
        xp_needed, progress_percentage
    """
    current_level = user_profile.current_level
    total_xp = user_profile.total_xp
    
    current_level_xp = calculate_xp_for_level(current_level)
    next_level_xp = calculate_xp_for_level(current_level + 1)
    
    xp_in_current_level = total_xp - current_level_xp
    xp_needed_for_next = next_level_xp - current_level_xp
    
    progress_percentage = (xp_in_current_level / xp_needed_for_next * 100) if xp_needed_for_next > 0 else 0
    
    return {
        "current_level": current_level,
        "total_xp": total_xp,
        "current_level_xp": current_level_xp,
        "next_level_xp": next_level_xp,
        "xp_in_current_level": xp_in_current_level,
        "xp_needed": next_level_xp - total_xp,
        "progress_percentage": round(progress_percentage, 1)
    }

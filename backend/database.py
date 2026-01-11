from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone
import os

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dofa.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models

class UserProfile(Base):
    """User profile with gamification stats"""
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Authentication fields
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=True)  # Null for OAuth users
    oauth_provider = Column(String, nullable=True)   # 'google' or None
    oauth_id = Column(String, nullable=True)         # Google user ID
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    full_name = Column(String, nullable=True)
    
    # Gamification fields
    total_xp = Column(Integer, default=0, nullable=False)
    current_level = Column(Integer, default=1, nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_task_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    tasks = relationship("Task", back_populates="user")
    achievements = relationship("Achievement", back_populates="user")
    daily_stats = relationship("DailyStat", back_populates="user")


class Task(Base):
    """Enhanced task model with persistence and gamification"""
    __tablename__ = "tasks"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), default=1, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    tag = Column(String, nullable=False)  # 'quick_win' or 'deep_work'
    status = Column(String, default="todo", nullable=False, index=True)  # 'todo' or 'done'
    priority = Column(Integer, nullable=True)
    xp_value = Column(Integer, default=0, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Relationships
    user = relationship("UserProfile", back_populates="tasks")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_task_status_deleted', 'status', 'is_deleted'),
        Index('idx_task_completed_deleted', 'completed_at', 'is_deleted'),
    )


class Achievement(Base):
    """User achievements"""
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False, index=True)
    achievement_key = Column(String, nullable=False)  # Unique key for achievement type
    unlocked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    user = relationship("UserProfile", back_populates="achievements")
    
    # Indexes
    __table_args__ = (
        Index('idx_achievement_user_key', 'user_id', 'achievement_key', unique=True),
    )


class DailyStat(Base):
    """Daily statistics for tracking progress"""
    __tablename__ = "daily_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)  # Date at midnight UTC
    tasks_completed = Column(Integer, default=0, nullable=False)
    quick_wins = Column(Integer, default=0, nullable=False)
    deep_work = Column(Integer, default=0, nullable=False)
    xp_earned = Column(Integer, default=0, nullable=False)
    streak_count = Column(Integer, default=0, nullable=False)
    
    # Relationships
    user = relationship("UserProfile", back_populates="daily_stats")
    
    # Indexes
    __table_args__ = (
        Index('idx_daily_stat_user_date', 'user_id', 'date', unique=True),
    )


# Database helper functions

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create tables and default user profile"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create default user profile if it doesn't exist
    db = SessionLocal()
    try:
        user = db.query(UserProfile).filter(UserProfile.id == 1).first()
        if not user:
            user = UserProfile(
                id=1,
                total_xp=0,
                current_level=1,
                current_streak=0,
                longest_streak=0
            )
            db.add(user)
            db.commit()
            print("✓ Created default user profile")
        else:
            print("✓ Default user profile already exists")
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()


def get_or_create_user(db, user_id: int = 1):
    """Get or create user profile"""
    user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    if not user:
        user = UserProfile(
            id=user_id,
            total_xp=0,
            current_level=1,
            current_streak=0,
            longest_streak=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

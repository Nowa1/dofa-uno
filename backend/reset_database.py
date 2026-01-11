#!/usr/bin/env python3
"""
Database Reset Script for Railway Production

This script safely resets the database by:
1. Dropping all existing tables
2. Recreating tables with the current schema from database.py
3. Creating a default user profile

IMPORTANT: This will DELETE ALL DATA in the database!
Only run this on Railway when you need to reset the schema.

Usage:
    python reset_database.py
"""

import sys
import os
from sqlalchemy import create_engine, text, inspect
from datetime import datetime, timezone

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import Base, UserProfile, Task, Achievement, DailyStat, DATABASE_URL


def confirm_reset():
    """Ask for confirmation before proceeding"""
    print("=" * 60)
    print("⚠️  DATABASE RESET SCRIPT")
    print("=" * 60)
    print(f"\nDatabase URL: {DATABASE_URL}")
    print("\n⚠️  WARNING: This will DELETE ALL DATA in the database!")
    print("This action cannot be undone.\n")
    
    response = input("Type 'RESET' to confirm: ")
    return response.strip() == "RESET"


def drop_all_tables(engine):
    """Drop all existing tables"""
    print("\n📋 Dropping all existing tables...")
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if not existing_tables:
        print("   No existing tables found.")
        return
    
    print(f"   Found {len(existing_tables)} tables: {', '.join(existing_tables)}")
    
    with engine.connect() as conn:
        # Disable foreign key constraints for SQLite
        if "sqlite" in DATABASE_URL:
            conn.execute(text("PRAGMA foreign_keys = OFF"))
            conn.commit()
        
        # Drop each table
        for table_name in existing_tables:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table_name}"))
                print(f"   ✓ Dropped table: {table_name}")
            except Exception as e:
                print(f"   ✗ Error dropping table {table_name}: {e}")
        
        conn.commit()
        
        # Re-enable foreign key constraints for SQLite
        if "sqlite" in DATABASE_URL:
            conn.execute(text("PRAGMA foreign_keys = ON"))
            conn.commit()
    
    print("   ✓ All tables dropped successfully")


def create_all_tables(engine):
    """Create all tables from the current schema"""
    print("\n🏗️  Creating tables with new schema...")
    
    try:
        Base.metadata.create_all(bind=engine)
        
        # Verify tables were created
        inspector = inspect(engine)
        created_tables = inspector.get_table_names()
        
        print(f"   ✓ Created {len(created_tables)} tables:")
        for table_name in created_tables:
            print(f"      - {table_name}")
        
        return True
    except Exception as e:
        print(f"   ✗ Error creating tables: {e}")
        return False


def create_default_user(engine):
    """Create a default user profile"""
    print("\n👤 Creating default user profile...")
    
    from sqlalchemy.orm import sessionmaker
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if default user already exists
        user = db.query(UserProfile).filter(UserProfile.id == 1).first()
        
        if user:
            print("   ℹ️  Default user already exists")
        else:
            # Create default user
            user = UserProfile(
                id=1,
                email="default@dofa.uno",
                hashed_password=None,
                oauth_provider=None,
                oauth_id=None,
                is_active=True,
                email_verified=False,
                full_name="Default User",
                total_xp=0,
                current_level=1,
                current_streak=0,
                longest_streak=0,
                last_task_date=None,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(user)
            db.commit()
            print("   ✓ Default user profile created (ID: 1)")
        
        return True
    except Exception as e:
        print(f"   ✗ Error creating default user: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def verify_schema(engine):
    """Verify the database schema"""
    print("\n🔍 Verifying database schema...")
    
    inspector = inspect(engine)
    
    expected_tables = ['user_profiles', 'tasks', 'achievements', 'daily_stats']
    existing_tables = inspector.get_table_names()
    
    all_present = True
    for table in expected_tables:
        if table in existing_tables:
            columns = [col['name'] for col in inspector.get_columns(table)]
            print(f"   ✓ Table '{table}' exists with {len(columns)} columns")
        else:
            print(f"   ✗ Table '{table}' is missing!")
            all_present = False
    
    return all_present


def main():
    """Main execution function"""
    print("\n🚀 Starting database reset process...\n")
    
    # Confirm before proceeding
    if not confirm_reset():
        print("\n❌ Reset cancelled. No changes were made.")
        sys.exit(0)
    
    try:
        # Create engine
        print(f"\n🔌 Connecting to database...")
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
        )
        print("   ✓ Connected successfully")
        
        # Step 1: Drop all tables
        drop_all_tables(engine)
        
        # Step 2: Create all tables
        if not create_all_tables(engine):
            print("\n❌ Failed to create tables. Aborting.")
            sys.exit(1)
        
        # Step 3: Create default user
        if not create_default_user(engine):
            print("\n⚠️  Warning: Failed to create default user")
        
        # Step 4: Verify schema
        if verify_schema(engine):
            print("\n✅ Database reset completed successfully!")
            print("\n📊 Summary:")
            print("   - All old tables dropped")
            print("   - New tables created with current schema")
            print("   - Default user profile created")
            print("\n🎉 Your database is now ready to use!")
        else:
            print("\n⚠️  Database reset completed with warnings")
            print("   Some expected tables may be missing. Please check the logs.")
        
    except Exception as e:
        print(f"\n❌ Fatal error during database reset: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

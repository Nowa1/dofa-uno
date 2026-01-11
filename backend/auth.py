"""
Authentication module for dofa.uno
Handles password hashing, JWT tokens, and OAuth
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import httpx

from database import get_db, UserProfile

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30  # Cookie на 30 днів
COOKIE_NAME = "dofa_session"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# OAuth2 scheme (optional, for documentation)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


# Password hashing functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


# JWT token functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    # Convert 'sub' to string if it's an integer (JWT standard requires string)
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# Cookie management
def set_auth_cookie(response: Response, token: str):
    """Set authentication cookie in response"""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,  # Захист від XSS
        secure=os.getenv("ENVIRONMENT") == "production",  # HTTPS only in production
        samesite="lax",  # CSRF захист
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # seconds
        path="/"
    )


def clear_auth_cookie(response: Response):
    """Clear authentication cookie"""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        samesite="lax"
    )


# User authentication
def authenticate_user(db: Session, email: str, password: str) -> Optional[UserProfile]:
    """Authenticate user with email and password"""
    user = db.query(UserProfile).filter(UserProfile.email == email).first()
    if not user:
        return None
    if not user.hashed_password:
        # OAuth user trying to login with password
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(request: Request, db: Session = Depends(get_db)) -> UserProfile:
    """
    Dependency to get current authenticated user from cookie.
    Raises 401 if not authenticated.
    """
    # Get token from cookie
    token = request.cookies.get(COOKIE_NAME)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Decode token
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user ID from token (convert from string to int)
    user_id_str = payload.get("sub")
    
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert string user_id to integer
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[UserProfile]:
    """
    Optional dependency to get current user.
    Returns None if not authenticated instead of raising exception.
    """
    try:
        return get_current_user(request, db)
    except HTTPException:
        return None


# Google OAuth functions
def get_google_oauth_url(redirect_uri: str) -> str:
    """Generate Google OAuth authorization URL"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth not configured"
        )
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"


async def exchange_google_code(code: str, redirect_uri: str) -> dict:
    """Exchange Google authorization code for tokens"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth not configured"
        )
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to exchange authorization code"
            )
        
        return response.json()


async def get_google_user_info(access_token: str) -> dict:
    """Get user info from Google using access token"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to get user info from Google"
            )
        
        return response.json()


def get_or_create_oauth_user(
    db: Session,
    email: str,
    oauth_provider: str,
    oauth_id: str,
    full_name: Optional[str] = None,
    email_verified: bool = False
) -> UserProfile:
    """Get or create user from OAuth provider"""
    # Try to find existing user by OAuth ID
    user = db.query(UserProfile).filter(
        UserProfile.oauth_provider == oauth_provider,
        UserProfile.oauth_id == oauth_id
    ).first()
    
    if user:
        # Update user info if changed
        if full_name and user.full_name != full_name:
            user.full_name = full_name
        if email_verified and not user.email_verified:
            user.email_verified = email_verified
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user
    
    # Try to find existing user by email
    user = db.query(UserProfile).filter(UserProfile.email == email).first()
    
    if user:
        # Link OAuth to existing account
        user.oauth_provider = oauth_provider
        user.oauth_id = oauth_id
        if email_verified:
            user.email_verified = email_verified
        if full_name and not user.full_name:
            user.full_name = full_name
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user
    
    # Create new user
    user = UserProfile(
        email=email,
        oauth_provider=oauth_provider,
        oauth_id=oauth_id,
        full_name=full_name,
        email_verified=email_verified,
        is_active=True,
        total_xp=0,
        current_level=1,
        current_streak=0,
        longest_streak=0
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.auth import LoginRequest, TokenResponse, VerifyTokenRequest, UserResponse
from services.auth_service import AuthService
from routes.dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", status_code=status.HTTP_200_OK)
def request_magic_link(request: LoginRequest, db: Session = Depends(get_db)):
    """Request a magic link to be sent to email"""
    user = AuthService.get_or_create_user(db, request.email)
    token = AuthService.create_magic_link(db, user)
    
    email_sent = AuthService.send_magic_link_email(request.email, token)
    
    return {
        "message": "If the email exists, a login link has been sent.",
        "email_sent": email_sent,
    }


@router.post("/verify", response_model=TokenResponse)
def verify_magic_link(request: VerifyTokenRequest, db: Session = Depends(get_db)):
    """Verify magic link token and return JWT"""
    user = AuthService.verify_magic_token(db, request.token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    
    access_token, expires_at = AuthService.create_jwt_token(user.id)
    
    return TokenResponse(
        access_token=access_token,
        expires_at=expires_at,
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info"""
    return current_user


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh JWT token"""
    access_token, expires_at = AuthService.create_jwt_token(current_user.id)
    
    return TokenResponse(
        access_token=access_token,
        expires_at=expires_at,
    )

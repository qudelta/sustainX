import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt, JWTError
from sqlalchemy.orm import Session

from config import get_settings
from models.user import User

settings = get_settings()


class AuthService:
    TOKEN_EXPIRY_MINUTES = 15
    
    @staticmethod
    def generate_magic_token() -> str:
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def get_or_create_user(db: Session, email: str) -> User:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email)
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    
    @staticmethod
    def create_magic_link(db: Session, user: User) -> str:
        token = AuthService.generate_magic_token()
        user.magic_token = token
        user.magic_token_expires = datetime.utcnow() + timedelta(minutes=AuthService.TOKEN_EXPIRY_MINUTES)
        db.commit()
        return token
    
    @staticmethod
    def verify_magic_token(db: Session, token: str) -> Optional[User]:
        user = db.query(User).filter(
            User.magic_token == token,
            User.magic_token_expires > datetime.utcnow()
        ).first()
        
        if user:
            # Clear the token after use
            user.magic_token = None
            user.magic_token_expires = None
            db.commit()
        
        return user
    
    @staticmethod
    def create_jwt_token(user_id: str) -> tuple[str, datetime]:
        expires = datetime.utcnow() + timedelta(hours=settings.jwt_expiry_hours)
        payload = {
            "sub": user_id,
            "exp": expires,
            "iat": datetime.utcnow(),
        }
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return token, expires
    
    @staticmethod
    def verify_jwt_token(token: str) -> Optional[str]:
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            return payload.get("sub")
        except JWTError:
            return None
    
    @staticmethod
    def send_magic_link_email(email: str, token: str) -> bool:
        magic_link = f"{settings.frontend_url}/auth/verify?token={token}"
        
        msg = MIMEMultipart()
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>" if settings.smtp_from_name else settings.smtp_from_email
        msg["To"] = email
        msg["Subject"] = f"Sign in to {settings.app_name}"
        
        body = f"""
        <html>
        <body>
            <h2>Sign in to {settings.app_name}</h2>
            <p>Click the link below to sign in. This link expires in {AuthService.TOKEN_EXPIRY_MINUTES} minutes.</p>
            <p><a href="{magic_link}" style="padding: 10px 20px; background: #228be6; color: white; text-decoration: none; border-radius: 4px;">Sign In</a></p>
            <p>Or copy this link: {magic_link}</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, "html"))
        
        try:
            if settings.smtp_use_tls:
                server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
            
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            
            server.sendmail(settings.smtp_from_email, email, msg.as_string())
            server.quit()
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            # In development, print the magic link to console
            print(f"[DEV] Magic link for {email}: {magic_link}")
            return False

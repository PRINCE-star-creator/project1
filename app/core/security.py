from datetime import datetime, timedelta, timezone
import hashlib, hmac
import bcrypt
from jose import jwt
from .config import settings

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        pwd_bytes = password.encode('utf-8')[:72]
        return bcrypt.checkpw(pwd_bytes, hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(sub: str, role: str, student_id: str | None = None, minutes: int = 60):
    payload = {"sub": sub, "role": role, "student_id": student_id, "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

def decode_token(token: str):
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


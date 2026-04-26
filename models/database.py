from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./nerum.db")

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

try:
    if "postgresql" in SQLALCHEMY_DATABASE_URL:
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
    else:
        engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("✅ Database connected successfully!")
except Exception as e:
    print(f"❌ PostgreSQL connection failed: {e}")
    print("⚠️ Falling back to SQLite...")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./nerum.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    print("✅ SQLite fallback connected!")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    plan = Column(String, default="free")
    token_limit = Column(Integer, default=1000)
    tokens_used = Column(Integer, default=0)
    # ✅ Email verification
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    name = Column(String, default="Untitled Workflow")
    description = Column(Text, default="")
    trigger = Column(String, default="")
    action = Column(String, default="")
    config = Column(Text, default="{}")
    is_active = Column(Boolean, default=True)
    runs = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_run = Column(DateTime, nullable=True)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)

# ✅ Email verification tokens table
class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)

Base.metadata.create_all(bind=engine)
print("✅ All tables created/verified!")
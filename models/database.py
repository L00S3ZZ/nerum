from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./nerum.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    plan = Column(String, default="free")
    token_limit = Column(Integer, default=10000)
    tokens_used = Column(Integer, default=0)

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    name = Column(String, default="Untitled Workflow")
    description = Column(Text, default="")
    trigger = Column(String, default="")        # e.g. "form_submit", "schedule", "manual"
    action = Column(String, default="")         # e.g. "send_whatsapp", "send_gmail"
    config = Column(Text, default="{}")         # JSON string — stores action config
    is_active = Column(Boolean, default=True)
    runs = Column(Integer, default=0)           # how many times it has run
    created_at = Column(DateTime, default=datetime.utcnow)
    last_run = Column(DateTime, nullable=True)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)

Base.metadata.create_all(bind=engine)
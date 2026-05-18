from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text, text, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import uuid

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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    plan = Column(String, default="free")
    token_limit = Column(Integer, default=1000)
    tokens_used = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    two_fa_enabled = Column(Boolean, default=False)
    terms_accepted = Column(Boolean, default=False)
    terms_accepted_at = Column(DateTime, nullable=True)
    terms_version = Column(String, default="1.0")

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

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)

class LoginHistory(Base):
    __tablename__ = "login_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    email = Column(String, index=True)
    ip_address = Column(String)
    device = Column(String)
    logged_in_at = Column(DateTime, default=datetime.utcnow)

class OTPCode(Base):
    __tablename__ = "otp_codes"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    code = Column(String)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    workflow_id = Column(Integer, index=True)
    workflow_name = Column(String)
    action = Column(String)
    status = Column(String, default="success")
    details = Column(Text, default="")
    ran_at = Column(DateTime, default=datetime.utcnow)

class DashboardList(Base):
    __tablename__ = "dashboard_lists"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    workflow_id = Column(Integer, index=True)
    name = Column(String)
    business_type = Column(String)
    message_template = Column(Text)
    condition_field = Column(String)
    condition_value = Column(String)
    schedule_time = Column(String)
    schedule_type = Column(String, default="daily")
    is_active = Column(Boolean, default=True)
    whatsapp_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=False)
    telegram_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_run = Column(DateTime, nullable=True)

class DashboardRecord(Base):
    __tablename__ = "dashboard_records"
    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, index=True)
    user_id = Column(Integer, index=True)
    name = Column(String)
    phone = Column(String)
    email = Column(String, nullable=True)
    fields = Column(Text, default="{}")
    status = Column(String, default="pending")
    last_message_sent = Column(DateTime, nullable=True)
    message_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# ✅ Embeddable Chatbot
class Chatbot(Base):
    __tablename__ = "chatbots"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    business_description = Column(Text, nullable=False)
    language = Column(String, default="both")  # english / tamil / both
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AIAgentConversation(Base):
    __tablename__ = "ai_agent_conversations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    conversation_id = Column(String, unique=True, index=True, nullable=False)
    messages = Column(Text, default="[]")
    workflow_created = Column(Boolean, default=False)
    workflow_id = Column(Integer, nullable=True)
    preview = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserIntegration(Base):
    __tablename__ = "user_integrations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    integration_type = Column(String)
    encrypted_credentials = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

# Register chatbot-builder tables (user_chatbots, chatbot_conversations)
from models.chatbot_model import UserChatbot, ChatbotConversation  # noqa: E402,F401

Base.metadata.create_all(bind=engine)
print("✅ All tables created/verified!")

# Migration: backfill new user_chatbots columns for existing installs
try:
    import sqlalchemy as _sa
    _insp = _sa.inspect(engine)
    if "user_chatbots" in _insp.get_table_names():
        _existing = {c["name"] for c in _insp.get_columns("user_chatbots")}
        _chatbot_migrations = [
            ("input_placeholder", "VARCHAR"),
            ("bot_status", "VARCHAR"),
            ("bot_initials", "VARCHAR"),
            ("header_color", "VARCHAR"),
            ("user_bubble_color", "VARCHAR"),
            ("bot_bubble_bg", "VARCHAR"),
            ("bot_bubble_text", "VARCHAR"),
            ("chat_bg", "VARCHAR"),
            ("send_button_color", "VARCHAR"),
            ("font_family", "VARCHAR"),
            ("font_size", "INTEGER"),
            ("corner_radius", "INTEGER"),
            ("bubble_shape", "VARCHAR"),
            ("header_style", "VARCHAR"),
            ("chat_width", "INTEGER"),
            ("chat_height", "INTEGER"),
            ("logo_data_url", "TEXT"),
            ("logo_shape", "VARCHAR"),
            ("logo_in_header", "BOOLEAN"),
            ("logo_in_messages", "BOOLEAN"),
            ("logo_in_launcher", "BOOLEAN"),
            ("logo_header_size", "INTEGER"),
            ("logo_msg_size", "INTEGER"),
            ("launcher_size", "INTEGER"),
            ("launcher_color", "VARCHAR"),
            ("launcher_shape", "VARCHAR"),
            ("launcher_position", "VARCHAR"),
            ("launcher_animation", "VARCHAR"),
            ("greeting_text", "VARCHAR"),
            ("show_badge", "BOOLEAN"),
            ("language", "VARCHAR"),
            ("auto_open", "BOOLEAN"),
            ("auto_open_delay", "INTEGER"),
            ("sound_enabled", "BOOLEAN"),
            ("typing_indicator", "BOOLEAN"),
            ("show_timestamps", "BOOLEAN"),
            ("allow_upload", "BOOLEAN"),
            ("collect_email", "BOOLEAN"),
            ("show_quick_replies", "BOOLEAN"),
            ("show_branding", "BOOLEAN"),
            ("business_hours_only", "BOOLEAN"),
            ("offline_message", "VARCHAR"),
            ("response_delay", "FLOAT"),
            ("input_mode", "VARCHAR"),
            ("flow_json", "TEXT"),
        ]
        with engine.connect() as _conn:
            for _col, _typ in _chatbot_migrations:
                if _col not in _existing:
                    try:
                        _conn.execute(text(f"ALTER TABLE user_chatbots ADD COLUMN {_col} {_typ}"))
                    except Exception as _e:
                        print(f"chatbot col {_col}: {_e}")
            _conn.commit()
except Exception as _e:
    print(f"Chatbot migration note: {_e}")

# ✅ Migrations
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR DEFAULT '1.0'"))
        conn.commit()
        print("✅ Migration complete!")
except Exception as e:
    print(f"Migration note: {e}")
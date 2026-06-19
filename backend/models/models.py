"""Consolidated ORM models.

Column names mirror the existing V1 Supabase schema EXACTLY so live data keeps
working. New V2-only columns (failed_attempts, locked_until, google_id,
avatar_url, otp purpose) are added via additive migrations in core.database.
"""
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from core.database import Base


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
    two_fa_enabled = Column(Boolean, default=False)
    terms_accepted = Column(Boolean, default=False)
    terms_accepted_at = Column(DateTime, nullable=True)
    terms_version = Column(String, default="1.0")
    created_at = Column(DateTime, default=datetime.utcnow)
    # ── V2 additions (migrated in) ──
    failed_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    google_id = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)


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
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserIntegration(Base):
    __tablename__ = "user_integrations"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    integration_type = Column(String)  # provider key: whatsapp/gmail/telegram/...
    encrypted_credentials = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)


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
    purpose = Column(String, default="verify")  # verify | 2fa  (V2 addition)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AgentRun(Base):
    __tablename__ = "agent_runs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    session_id = Column(String, index=True)
    goal = Column(Text)
    status = Column(String, default="running")  # running | complete | error
    steps_count = Column(Integer, default=0)
    result_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class AgentStep(Base):
    __tablename__ = "agent_steps"
    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("agent_runs.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    tool_name = Column(String)
    tool_input = Column(JSON)
    tool_result = Column(JSON)
    success = Column(Boolean, default=True)
    executed_at = Column(DateTime, default=datetime.utcnow)


class AgentMessage(Base):
    """One conversation turn (user ask or assistant reply) for a session.

    Read back at the start of each run to give the Commander prior context;
    written at the end of a run (the goal + the final answer). Tool steps are
    NOT stored here — see AgentStep for the per-tool execution log.
    """
    __tablename__ = "agent_messages"
    id = Column(Integer, primary_key=True)
    session_id = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserDbConnection(Base):
    """A user's external database the agent may query. Credentials are AES-256-GCM
    encrypted (core.encryption) exactly like UserIntegration. The LLM only ever
    sees `id`, `name`, and `db_type` — never the decrypted credentials."""
    __tablename__ = "user_db_connections"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String, nullable=False)              # user label, e.g. "Prod Postgres"
    db_type = Column(String, nullable=False)           # postgresql | mysql | mongodb
    encrypted_credentials = Column(Text, nullable=False)  # encrypt_data({host,port,user,password,database,...})
    allow_write = Column(Boolean, default=False)       # INSERT/UPDATE gate  (default OFF)
    allow_delete = Column(Boolean, default=False)      # DELETE/DROP/TRUNCATE gate (separate, default OFF)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

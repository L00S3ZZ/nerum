from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from datetime import datetime
import uuid

from models.database import Base, engine

# ai_agent_conversations
#   id              : String UUID PK
#   user_id         : Integer FK -> users.id
#   conversation_id : unique string identifier (UUID from client)
#   messages        : Text containing JSON list [{"role": str, "content": str}]
#   workflow_created: Boolean
#   workflow_id     : Integer FK -> workflows.id (nullable)
#   preview         : first user message (truncated to 60 chars)
#   created_at      : DateTime
#   updated_at      : DateTime
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

Base.metadata.create_all(bind=engine)
print("✅ ai_agent_conversations table ready!")

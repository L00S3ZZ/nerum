from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from models.database import Base
from datetime import datetime

class UserChatbot(Base):
    __tablename__ = "user_chatbots"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    embed_id = Column(String, unique=True, index=True)
    bot_name = Column(String)
    company_name = Column(String)
    logo_url = Column(String, nullable=True)
    brand_color = Column(String, default="#f472b6")
    welcome_message = Column(String, default="Hi! How can I help you?")
    bot_type = Column(String, default="nonai")  # nonai / ai
    ai_engine = Column(String, nullable=True)  # claude / gpt / gemini
    encrypted_api_key = Column(Text, nullable=True)
    knowledge_type = Column(String, nullable=True)  # url / pdf / qa
    knowledge_content = Column(Text, nullable=True)
    qa_pairs = Column(Text, nullable=True)  # JSON string
    chat_count = Column(Integer, default=0)
    monthly_chat_count = Column(Integer, default=0)
    chat_limit = Column(Integer, default=50)
    token_limit = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    conversations = relationship("ChatbotConversation", back_populates="chatbot")

class ChatbotConversation(Base):
    __tablename__ = "chatbot_conversations"
    id = Column(Integer, primary_key=True)
    chatbot_id = Column(Integer, ForeignKey("user_chatbots.id"))
    visitor_id = Column(String)
    role = Column(String)  # user / assistant
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    chatbot = relationship("UserChatbot", back_populates="conversations")

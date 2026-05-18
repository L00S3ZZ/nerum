from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Float
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
    brand_color = Column(String, default="#C50022")
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
    # ── Extended customization (added) ──
    input_placeholder = Column(String, default="Type a message...")
    bot_status = Column(String, default="Online now")
    bot_initials = Column(String, default="A")
    header_color = Column(String, nullable=True)
    user_bubble_color = Column(String, nullable=True)
    bot_bubble_bg = Column(String, nullable=True)
    bot_bubble_text = Column(String, nullable=True)
    chat_bg = Column(String, nullable=True)
    send_button_color = Column(String, nullable=True)
    font_family = Column(String, default="System")
    font_size = Column(Integer, default=13)
    corner_radius = Column(Integer, default=14)
    bubble_shape = Column(String, default="rounded")
    header_style = Column(String, default="solid")
    chat_width = Column(Integer, default=320)
    chat_height = Column(Integer, default=480)
    logo_data_url = Column(Text, nullable=True)
    logo_shape = Column(String, default="circle")
    logo_in_header = Column(Boolean, default=True)
    logo_in_messages = Column(Boolean, default=True)
    logo_in_launcher = Column(Boolean, default=True)
    logo_header_size = Column(Integer, default=32)
    logo_msg_size = Column(Integer, default=22)
    launcher_size = Column(Integer, default=52)
    launcher_color = Column(String, nullable=True)
    launcher_shape = Column(String, default="circle")
    launcher_position = Column(String, default="Bottom Right")
    launcher_animation = Column(String, default="Bounce")
    greeting_text = Column(String, default="Need help?")
    show_badge = Column(Boolean, default=True)
    language = Column(String, default="en")
    auto_open = Column(Boolean, default=False)
    auto_open_delay = Column(Integer, default=3)
    sound_enabled = Column(Boolean, default=False)
    typing_indicator = Column(Boolean, default=True)
    show_timestamps = Column(Boolean, default=False)
    allow_upload = Column(Boolean, default=False)
    collect_email = Column(Boolean, default=False)
    show_quick_replies = Column(Boolean, default=True)
    show_branding = Column(Boolean, default=True)
    business_hours_only = Column(Boolean, default=False)
    offline_message = Column(String, nullable=True)
    response_delay = Column(Float, default=1.0)
    input_mode = Column(String, default="typing")
    flow_json = Column(Text, nullable=True)

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

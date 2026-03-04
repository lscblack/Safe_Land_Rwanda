"""
Chat Session & Message models for the RAG Land Assistant.
"""

import uuid
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from data.database.database import Base


def _gen_token() -> str:
    return str(uuid.uuid4())


class ChatSession(Base):
    """
    A conversation session.  Optionally scoped to a specific UPI so the bot
    always has parcel context available for every message in that thread.
    """
    __tablename__ = "chat_sessions"

    id          = Column(Integer, primary_key=True, index=True, autoincrement=True)
    token       = Column(String, unique=True, index=True, nullable=False, default=_gen_token)

    # optional: link to an authenticated user
    user_id     = Column(Integer, nullable=True, index=True)

    # optional: lock session to a specific parcel UPI
    upi         = Column(String, nullable=True, index=True)

    # human-readable title the frontend can display
    title       = Column(String, nullable=True)

    # Parcel data extracted from an uploaded PDF certificate for this session
    pdf_context = Column(JSONB, nullable=True)

    is_active   = Column(Boolean, default=True)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages    = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
        lazy="noload",   # always use selectinload() explicitly in routes
    )


class ChatMessage(Base):
    """
    Individual turn in a conversation.
    role: 'user' | 'assistant' | 'system'
    """
    __tablename__ = "chat_messages"

    id          = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id  = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)

    role        = Column(String, nullable=False)      # user / assistant / system
    content     = Column(Text, nullable=False)

    # raw context snapshot injected for this turn (for auditability / fine-tuning later)
    context_snapshot = Column(JSONB, nullable=True)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    session     = relationship("ChatSession", back_populates="messages", lazy="noload")

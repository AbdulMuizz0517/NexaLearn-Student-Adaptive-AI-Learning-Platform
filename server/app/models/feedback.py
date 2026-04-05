"""
Feedback model for student feedback to admin
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="general")  # general, bug, suggestion, content
    is_read = Column(Boolean, default=False)
    admin_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to user
    user = relationship("User", backref="feedbacks")

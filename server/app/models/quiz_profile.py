from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class QuizProfile(Base):
    __tablename__ = "quiz_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    topic = Column(String, nullable=False, index=True)
    difficulty = Column(String, nullable=False)
    score = Column(Float, nullable=False, default=0)
    total_questions = Column(Integer, nullable=False, default=10)

    strengths_json = Column(Text, nullable=True)
    weaknesses_json = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")

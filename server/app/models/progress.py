"""
Progress Tracking Models - Track user progress through learning paths
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class TopicProgress(Base):
    """Track progress for each topic/chapter in a learning path"""
    __tablename__ = "topic_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    learning_path_id = Column(Integer, ForeignKey("learning_paths.id"), nullable=False)
    chapter_index = Column(Integer, nullable=False)  # Which chapter (0-indexed)
    chapter_title = Column(String, nullable=False)
    
    # Level completion (1, 2, 3)
    level1_completed = Column(Boolean, default=False)  # MCQs / Fill in blanks
    level2_completed = Column(Boolean, default=False)  # Complete missing code
    level3_completed = Column(Boolean, default=False)  # Write full code
    
    # Quiz for this chapter
    chapter_quiz_score = Column(Float, nullable=True)
    chapter_quiz_passed = Column(Boolean, default=False)  # >= 50%
    
    # Unlock status
    is_unlocked = Column(Boolean, default=False)  # Only first chapter unlocked by default
    
    # Resources
    resources_generated = Column(Boolean, default=False)
    resources_data = Column(JSON, nullable=True)  # Cached YouTube videos, notes
    
    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    learning_path = relationship("LearningPath")


class ExerciseResult(Base):
    """Store results of individual exercises"""
    __tablename__ = "exercise_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_progress_id = Column(Integer, ForeignKey("topic_progress.id"), nullable=False)
    
    level = Column(Integer, nullable=False)  # 1, 2, or 3
    exercise_type = Column(String, nullable=False)  # mcq, fill_blank, complete_code, write_code
    
    # Exercise data
    question = Column(Text, nullable=True)
    user_answer = Column(Text, nullable=True)
    correct_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    ai_feedback = Column(Text, nullable=True)  # For code exercises
    score = Column(Float, nullable=True)  # For partial credit
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    topic_progress = relationship("TopicProgress")


class ChapterQuizResult(Base):
    """Store chapter quiz results (after completing 3 levels)"""
    __tablename__ = "chapter_quiz_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_progress_id = Column(Integer, ForeignKey("topic_progress.id"), nullable=False)
    
    score = Column(Float, nullable=False)
    total_questions = Column(Integer, default=5)
    passed = Column(Boolean, nullable=False)  # >= 50%
    
    # Store the quiz for review
    quiz_data = Column(JSON, nullable=True)
    answers = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    topic_progress = relationship("TopicProgress")

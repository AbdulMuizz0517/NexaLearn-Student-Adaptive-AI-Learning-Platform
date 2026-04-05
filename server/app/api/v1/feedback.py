"""
Feedback API for students to submit feedback
"""

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.feedback import Feedback

router = APIRouter()


# ==================== SCHEMAS ====================

class FeedbackCreate(BaseModel):
    user_id: int
    subject: str
    message: str
    category: str = "general"  # general, bug, suggestion, content


class FeedbackUpdate(BaseModel):
    subject: Optional[str] = None
    message: Optional[str] = None


# ==================== ENDPOINTS ====================

@router.post("/submit")
def submit_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    """Student submits feedback"""
    # Verify user exists
    user = db.query(User).filter(User.id == feedback.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_feedback = Feedback(
        user_id=feedback.user_id,
        subject=feedback.subject,
        message=feedback.message,
        category=feedback.category,
        is_read=False,
        created_at=datetime.utcnow()
    )
    
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    
    return {
        "message": "Feedback submitted successfully",
        "feedback_id": new_feedback.id
    }


@router.get("/my-feedback/{user_id}")
def get_my_feedback(user_id: int, db: Session = Depends(get_db)):
    """Get all feedback submitted by a user"""
    feedbacks = db.query(Feedback).filter(
        Feedback.user_id == user_id
    ).order_by(Feedback.created_at.desc()).all()
    
    return {
        "feedback": [
            {
                "id": fb.id,
                "subject": fb.subject,
                "message": fb.message,
                "category": fb.category,
                "is_read": fb.is_read,
                "admin_response": fb.admin_response,
                "created_at": fb.created_at.isoformat() if fb.created_at else None
            }
            for fb in feedbacks
        ]
    }


@router.delete("/{feedback_id}")
def delete_feedback(feedback_id: int, user_id: int, db: Session = Depends(get_db)):
    """Delete user's own feedback"""
    feedback = db.query(Feedback).filter(
        Feedback.id == feedback_id,
        Feedback.user_id == user_id
    ).first()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    db.delete(feedback)
    db.commit()
    
    return {"message": "Feedback deleted"}

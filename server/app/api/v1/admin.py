"""
Admin API endpoints for managing students, viewing progress, and feedback
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, Integer

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.progress import TopicProgress, ExerciseResult, ChapterQuizResult
from app.models.feedback import Feedback
from app.models.curriculum import LearningPath

import asyncio

def run_async(coro):
    """Run async function synchronously"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result(timeout=90)
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)

router = APIRouter()


# ==================== SCHEMAS ====================

class AdminLogin(BaseModel):
    email: str
    password: str


class StudentOverview(BaseModel):
    id: int
    full_name: str
    email: str
    is_active: bool
    total_chapters: int
    completed_chapters: int
    average_score: float
    is_struggling: bool
    struggling_topics: List[str]


class FeedbackResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    subject: str
    message: str
    category: str
    is_read: bool
    admin_response: Optional[str]
    created_at: datetime


class FeedbackReply(BaseModel):
    feedback_id: int
    response: str


# ==================== ADMIN CREDENTIALS ====================
ADMIN_EMAIL = "nexalearnadmin@gmail.com"
ADMIN_PASSWORD = "NexaLearn1234"


# ==================== HELPER FUNCTIONS ====================

def ensure_admin_exists(db: Session):
    """Create admin user if it doesn't exist"""
    admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if not admin:
        admin = User(
            full_name="NexaLearn Admin",
            email=ADMIN_EMAIL,
            hashed_password=get_password_hash(ADMIN_PASSWORD),
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"✅ Admin user created: {ADMIN_EMAIL}")
    return admin


def get_student_struggling_topics(db: Session, user_id: int) -> List[str]:
    """Identify topics where student is struggling (failed multiple times)"""
    struggling_topics = []
    
    # Get exercise results with multiple failures
    failed_exercises = db.query(
        ExerciseResult.topic_progress_id,
        func.count(ExerciseResult.id).label('attempts'),
        func.sum(func.cast(ExerciseResult.is_correct == False, Integer)).label('failures')
    ).filter(
        ExerciseResult.user_id == user_id
    ).group_by(ExerciseResult.topic_progress_id).all()
    
    for result in failed_exercises:
        if result.failures and result.attempts:
            failure_rate = result.failures / result.attempts
            if failure_rate > 0.5 and result.attempts >= 3:  # More than 50% failure with 3+ attempts
                progress = db.query(TopicProgress).filter(TopicProgress.id == result.topic_progress_id).first()
                if progress:
                    struggling_topics.append(f"{progress.chapter_title} (Level {result[2] if len(result) > 2 else 'N/A'})")
    
    # Check chapter quiz failures
    quiz_failures = db.query(ChapterQuizResult).filter(
        ChapterQuizResult.user_id == user_id,
        ChapterQuizResult.passed == False
    ).all()
    
    for quiz in quiz_failures:
        progress = db.query(TopicProgress).filter(TopicProgress.id == quiz.topic_progress_id).first()
        if progress:
            topic_name = f"{progress.chapter_title} Quiz"
            if topic_name not in struggling_topics:
                struggling_topics.append(topic_name)
    
    return struggling_topics


# ==================== ENDPOINTS ====================

@router.post("/login")
def admin_login(credentials: AdminLogin, db: Session = Depends(get_db)):
    """Admin login - creates admin if doesn't exist"""
    ensure_admin_exists(db)
    
    if credentials.email != ADMIN_EMAIL:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    if credentials.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    
    from app.core.security import create_access_token
    token = create_access_token(admin.id)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": admin.id,
            "email": admin.email,
            "full_name": admin.full_name,
            "role": "admin"
        }
    }


@router.get("/students")
def get_all_students(db: Session = Depends(get_db)):
    """Get all students with their progress overview"""
    ensure_admin_exists(db)
    
    students = db.query(User).filter(User.role == "student").all()
    
    student_list = []
    for student in students:
        # Get progress stats
        progress_list = db.query(TopicProgress).filter(TopicProgress.user_id == student.id).all()
        
        total_chapters = len(progress_list)
        completed_chapters = sum(1 for p in progress_list if p.chapter_quiz_passed)
        
        # Calculate average quiz score
        quiz_results = db.query(ChapterQuizResult).filter(ChapterQuizResult.user_id == student.id).all()
        avg_score = sum(q.score for q in quiz_results) / len(quiz_results) if quiz_results else 0
        
        # Check if struggling
        struggling_topics = get_student_struggling_topics(db, student.id)
        is_struggling = len(struggling_topics) > 0
        
        student_list.append({
            "id": student.id,
            "full_name": student.full_name or "Unknown",
            "email": student.email,
            "is_active": student.is_active,
            "created_at": student.created_at.isoformat() if hasattr(student, 'created_at') and student.created_at else None,
            "total_chapters": total_chapters,
            "completed_chapters": completed_chapters,
            "average_score": round(avg_score, 1),
            "is_struggling": is_struggling,
            "struggling_topics": struggling_topics
        })
    
    # Sort by struggling first (flagged students on top)
    student_list.sort(key=lambda x: (not x["is_struggling"], -len(x["struggling_topics"])))
    
    return {
        "total_students": len(student_list),
        "struggling_count": sum(1 for s in student_list if s["is_struggling"]),
        "students": student_list
    }


class UserStatusUpdate(BaseModel):
    is_active: bool


@router.patch("/users/{user_id}/status")
def update_user_status(user_id: int, status: UserStatusUpdate, db: Session = Depends(get_db)):
    """Update user active status (suspend/activate)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow suspending admin
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot modify admin status")
    
    user.is_active = status.is_active
    db.commit()
    
    return {
        "message": f"User {'activated' if status.is_active else 'suspended'} successfully",
        "user_id": user_id,
        "is_active": status.is_active
    }


@router.get("/student/{student_id}/progress")
def get_student_detail(student_id: int, db: Session = Depends(get_db)):
    """Get detailed progress for a specific student"""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get all learning paths and progress
    progress_list = db.query(TopicProgress).filter(TopicProgress.user_id == student_id).all()
    
    chapters = []
    for p in progress_list:
        # Get exercise results for this chapter
        exercise_results = db.query(ExerciseResult).filter(
            ExerciseResult.user_id == student_id,
            ExerciseResult.topic_progress_id == p.id
        ).all()
        
        level_stats = {1: {"correct": 0, "total": 0}, 2: {"correct": 0, "total": 0}, 3: {"correct": 0, "total": 0}}
        for ex in exercise_results:
            if ex.level in level_stats:
                level_stats[ex.level]["total"] += 1
                if ex.is_correct:
                    level_stats[ex.level]["correct"] += 1
        
        chapters.append({
            "id": p.id,
            "chapter_title": p.chapter_title,
            "chapter_index": p.chapter_index,
            "is_unlocked": p.is_unlocked,
            "level1_completed": p.level1_completed,
            "level2_completed": p.level2_completed,
            "level3_completed": p.level3_completed,
            "chapter_quiz_score": p.chapter_quiz_score,
            "chapter_quiz_passed": p.chapter_quiz_passed,
            "level_stats": level_stats
        })
    
    struggling_topics = get_student_struggling_topics(db, student_id)
    
    return {
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "email": student.email
        },
        "is_struggling": len(struggling_topics) > 0,
        "struggling_topics": struggling_topics,
        "chapters": chapters
    }


@router.get("/flagged-students")
def get_flagged_students(db: Session = Depends(get_db)):
    """Get students who are struggling and need attention"""
    students = db.query(User).filter(User.role == "student").all()
    
    flagged = []
    for student in students:
        struggling_topics = get_student_struggling_topics(db, student.id)
        if struggling_topics:
            flagged.append({
                "id": student.id,
                "full_name": student.full_name or "Unknown",
                "email": student.email,
                "struggling_topics": struggling_topics,
                "severity": "high" if len(struggling_topics) >= 3 else "medium" if len(struggling_topics) >= 2 else "low"
            })
    
    # Sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    flagged.sort(key=lambda x: severity_order[x["severity"]])
    
    return {
        "total_flagged": len(flagged),
        "flagged_students": flagged
    }


@router.get("/feedback")
def get_all_feedback(db: Session = Depends(get_db), unread_only: bool = False):
    """Get all feedback from students"""
    query = db.query(Feedback)
    if unread_only:
        query = query.filter(Feedback.is_read == False)
    
    feedbacks = query.order_by(Feedback.created_at.desc()).all()
    
    result = []
    for fb in feedbacks:
        user = db.query(User).filter(User.id == fb.user_id).first()
        result.append({
            "id": fb.id,
            "user_id": fb.user_id,
            "user_name": user.full_name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "subject": fb.subject,
            "message": fb.message,
            "category": fb.category,
            "is_read": fb.is_read,
            "admin_response": fb.admin_response,
            "created_at": fb.created_at.isoformat() if fb.created_at else None
        })
    
    return {
        "total": len(result),
        "unread_count": sum(1 for f in result if not f["is_read"]),
        "feedback": result
    }


@router.post("/feedback/{feedback_id}/reply")
def reply_to_feedback(feedback_id: int, reply: FeedbackReply, db: Session = Depends(get_db)):
    """Admin replies to feedback"""
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    feedback.admin_response = reply.response
    feedback.is_read = True
    feedback.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Reply sent successfully"}


@router.post("/feedback/{feedback_id}/mark-read")
def mark_feedback_read(feedback_id: int, db: Session = Depends(get_db)):
    """Mark feedback as read"""
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    feedback.is_read = True
    db.commit()
    
    return {"message": "Marked as read"}


@router.get("/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    """Get overall platform statistics"""
    total_students = db.query(User).filter(User.role == "student").count()
    total_paths = db.query(LearningPath).count()
    
    # Active students (have at least one progress entry)
    active_students = db.query(func.distinct(TopicProgress.user_id)).count()
    
    # Completed paths
    completed_chapters = db.query(TopicProgress).filter(TopicProgress.chapter_quiz_passed == True).count()
    
    # Average quiz score / completion rate
    quiz_results = db.query(ChapterQuizResult).all()
    avg_score = sum(q.score for q in quiz_results) / len(quiz_results) if quiz_results else 0
    
    # Feedback stats
    total_feedback = db.query(Feedback).count()
    unread_feedback = db.query(Feedback).filter(Feedback.is_read == False).count()
    
    # Struggling students
    students = db.query(User).filter(User.role == "student").all()
    struggling_count = 0
    for student in students:
        if get_student_struggling_topics(db, student.id):
            struggling_count += 1
    
    return {
        "total_students": total_students,
        "active_students": active_students,
        "total_paths": total_paths,
        "total_learning_paths": total_paths,
        "completed_chapters": completed_chapters,
        "average_quiz_score": round(avg_score, 1),
        "average_completion_rate": round(avg_score, 1),
        "struggling_students": struggling_count,
        "total_feedback": total_feedback,
        "unread_feedback": unread_feedback
    }


@router.get("/reports/overview")
def get_reports_overview(db: Session = Depends(get_db)):
    """Aggregated reporting payload for the admin reporting dashboard."""
    students = db.query(User).filter(User.role == "student").all()

    student_rows = []
    for student in students:
        progress_rows = db.query(TopicProgress).filter(TopicProgress.user_id == student.id).all()
        quiz_rows = db.query(ChapterQuizResult).filter(ChapterQuizResult.user_id == student.id).all()
        avg_score = round(sum(q.score for q in quiz_rows) / len(quiz_rows), 1) if quiz_rows else 0.0

        total_chapters = len(progress_rows)
        completed_chapters = sum(1 for p in progress_rows if p.chapter_quiz_passed)
        completion_rate = round((completed_chapters / total_chapters) * 100, 1) if total_chapters else 0.0

        struggling_topics = get_student_struggling_topics(db, student.id)

        student_rows.append({
            "id": student.id,
            "full_name": student.full_name or "Unknown",
            "email": student.email,
            "average_score": avg_score,
            "completion_rate": completion_rate,
            "completed_chapters": completed_chapters,
            "total_chapters": total_chapters,
            "is_struggling": len(struggling_topics) > 0,
            "struggling_topics": struggling_topics,
        })

    top_performers = sorted(
        student_rows,
        key=lambda s: (s["average_score"], s["completion_rate"]),
        reverse=True,
    )[:5]

    at_risk_students = [
        s for s in student_rows
        if s["is_struggling"] or (s["average_score"] < 50 and s["total_chapters"] > 0)
    ]

    # Last 6 months activity based on exercise submissions.
    now = datetime.utcnow()
    monthly_activity = []
    for offset in range(5, -1, -1):
        month = now.month - offset
        year = now.year
        while month <= 0:
            month += 12
            year -= 1

        submissions = db.query(ExerciseResult).filter(
            func.extract("year", ExerciseResult.created_at) == year,
            func.extract("month", ExerciseResult.created_at) == month,
        ).count()

        monthly_activity.append({
            "label": f"{year}-{month:02d}",
            "submissions": submissions,
        })

    total_students = len(student_rows)
    active_students = sum(1 for s in student_rows if s["total_chapters"] > 0)
    struggling_count = sum(1 for s in student_rows if s["is_struggling"])

    return {
        "summary": {
            "total_students": total_students,
            "active_students": active_students,
            "struggling_students": struggling_count,
            "average_score": round(sum(s["average_score"] for s in student_rows) / total_students, 1) if total_students else 0.0,
        },
        "top_performers": top_performers,
        "at_risk_students": at_risk_students,
        "monthly_activity": monthly_activity,
        "students": student_rows,
    }


@router.get("/student/{student_id}/report")
def get_student_report(student_id: int, db: Session = Depends(get_db)):
    """Generate a comprehensive AI-powered report for a student"""
    from app.services.ai_service import generate_student_report

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Gather all progress data
    progress_list = db.query(TopicProgress).filter(TopicProgress.user_id == student_id).all()

    if not progress_list:
        return {
            "student": {"id": student.id, "full_name": student.full_name, "email": student.email},
            "report": {
                "overall_grade": "N/A",
                "summary": "No learning activity yet.",
                "strengths": [],
                "weaknesses": [],
                "recommendations": ["Start a learning path to begin."]
            }
        }

    # Build chapters data
    chapters_data = []
    exercise_lines = []
    for p in progress_list:
        exercise_results = db.query(ExerciseResult).filter(
            ExerciseResult.user_id == student_id,
            ExerciseResult.topic_progress_id == p.id
        ).all()

        level_stats = {1: {"correct": 0, "total": 0}, 2: {"correct": 0, "total": 0}, 3: {"correct": 0, "total": 0}}
        for ex in exercise_results:
            if ex.level in level_stats:
                level_stats[ex.level]["total"] += 1
                if ex.is_correct:
                    level_stats[ex.level]["correct"] += 1

        chapters_data.append({
            "chapter": p.chapter_title,
            "level1_completed": p.level1_completed,
            "level2_completed": p.level2_completed,
            "level3_completed": p.level3_completed,
            "quiz_score": p.chapter_quiz_score,
            "quiz_passed": p.chapter_quiz_passed,
            "level_stats": level_stats
        })

        for lvl in [1, 2, 3]:
            s = level_stats[lvl]
            if s["total"] > 0:
                exercise_lines.append(
                    f"{p.chapter_title} Level {lvl}: {s['correct']}/{s['total']} correct ({round(s['correct']/s['total']*100)}%)"
                )

    exercise_summary = "\n".join(exercise_lines) if exercise_lines else "No exercises attempted yet."

    # Get learning path topic
    path = db.query(LearningPath).filter(LearningPath.id == progress_list[0].learning_path_id).first()
    topic = path.topic if path else "programming"

    # Generate AI report
    report = run_async(generate_student_report(
        student_name=student.full_name or student.email,
        topic=topic,
        chapters_data=chapters_data,
        exercise_summary=exercise_summary,
        language=topic
    ))

    struggling_topics = get_student_struggling_topics(db, student_id)

    return {
        "student": {
            "id": student.id,
            "full_name": student.full_name or "Unknown",
            "email": student.email
        },
        "struggling_topics": struggling_topics,
        "report": report
    }


@router.post("/student/{student_id}/remediation")
def trigger_student_remediation(student_id: int, db: Session = Depends(get_db)):
    """Generate a remediation plan for a flagged student."""
    from app.services.ai_service import generate_remediation

    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    struggling_topics = get_student_struggling_topics(db, student_id)
    if not struggling_topics:
        return {
            "student_id": student_id,
            "message": "Student is not currently flagged for remediation",
            "remediation": {
                "remediation_plan": [],
                "practice_strategy": "Continue current learning plan",
                "motivation": "Keep up the consistent progress"
            }
        }

    progress_list = db.query(TopicProgress).filter(TopicProgress.user_id == student_id).all()
    path = db.query(LearningPath).filter(LearningPath.id == progress_list[0].learning_path_id).first() if progress_list else None
    topic = path.topic if path else "programming"

    quiz_results = db.query(ChapterQuizResult).filter(ChapterQuizResult.user_id == student_id).all()
    avg_score = sum(q.score for q in quiz_results) / len(quiz_results) if quiz_results else 0.0

    weak_areas = struggling_topics[:5]
    remediation = run_async(generate_remediation(topic=topic, weak_areas=weak_areas, score=avg_score))

    return {
        "student_id": student.id,
        "student_name": student.full_name or student.email,
        "topic": topic,
        "current_score": round(avg_score, 1),
        "weak_areas": weak_areas,
        "remediation": remediation,
    }


@router.put("/feedback/{feedback_id}/read")
def mark_feedback_read(feedback_id: int, db: Session = Depends(get_db)):
    """Mark a feedback item as read/reviewed by admin."""
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    fb.is_read = True
    db.commit()
    return {"message": "Feedback marked as read"}


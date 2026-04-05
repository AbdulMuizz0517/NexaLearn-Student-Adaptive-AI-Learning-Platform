import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.quiz import QuizResult
from app.models.curriculum import LearningPath
from app.models.quiz_profile import QuizProfile
from app.schemas.quiz_schema import AdaptiveQuizSubmission, QuizResponse
from app.services.llm_service import generate_quiz_json, generate_learning_path_json
from app.services.ai_service import generate_quiz_profile_summary, normalize_topic

router = APIRouter()


def run_async(coro):
    """Run async function synchronously."""
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


@router.get("/generate/{topic}", response_model=QuizResponse)
def get_quiz(topic: str, difficulty: str = "beginner", user_id: int = 0, question_count: int = 10, db: Session = Depends(get_db)):
    """Generate a dynamic quiz for supported languages using Qwen."""
    canonical_topic = normalize_topic(topic)
    allowed_topics = ["python", "java", "c++", "javascript", "c#", "rust"]
    if canonical_topic not in allowed_topics:
        raise HTTPException(status_code=400, detail=f"Unsupported topic '{topic}'")

    latest_profile = None
    if user_id:
        latest_profile = db.query(QuizProfile).filter(
            QuizProfile.user_id == user_id,
            QuizProfile.topic == canonical_topic
        ).order_by(QuizProfile.created_at.desc()).first()

    profile_context = ""
    if latest_profile:
        strengths = json.loads(latest_profile.strengths_json) if latest_profile.strengths_json else []
        weaknesses = json.loads(latest_profile.weaknesses_json) if latest_profile.weaknesses_json else []
        profile_context = (
            f"Summary: {latest_profile.summary or ''}. "
            f"Strengths: {', '.join(strengths[:3])}. "
            f"Weaknesses: {', '.join(weaknesses[:3])}. "
            f"Recommendation: {latest_profile.recommendation or ''}."
        )

    quiz_data = generate_quiz_json(
        canonical_topic,
        difficulty=difficulty,
        user_id=user_id,
        question_count=question_count,
        profile_context=profile_context,
    )
    if not quiz_data:
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

    return quiz_data


@router.post("/submit")
def submit_quiz_result(submission: AdaptiveQuizSubmission, db: Session = Depends(get_db)):
    """
    Submit quiz results and generate a learning path based on the score.
    Uses per-question outcomes to build adaptive profile for this learner.
    """
    canonical_topic = normalize_topic(submission.topic)
    total_questions = len(submission.answers)
    if total_questions < 1:
        raise HTTPException(status_code=400, detail="Quiz answers are required")

    correct_count = sum(1 for a in submission.answers if a.is_correct)
    score = round((correct_count / total_questions) * 100, 1)

    # 1. Save quiz result
    result = QuizResult(
        user_id=submission.user_id,
        topic=canonical_topic,
        score=score,
        total_questions=total_questions,
    )
    db.add(result)
    db.commit()

    # 2. Determine difficulty based on score
    if score <= 40:
        difficulty = "beginner"
    elif score <= 70:
        difficulty = "intermediate"
    else:
        difficulty = "advanced"

    # 3. Build personalized adaptive profile and store it per user/topic.
    attempts_payload = [a.dict() for a in submission.answers]
    profile = run_async(generate_quiz_profile_summary(
        topic=canonical_topic,
        difficulty=difficulty,
        score=score,
        attempts=attempts_payload,
    ))

    strengths = profile.get("strengths", []) if isinstance(profile.get("strengths", []), list) else []
    weaknesses = profile.get("weaknesses", []) if isinstance(profile.get("weaknesses", []), list) else []
    summary = profile.get("summary", "")
    recommendation = profile.get("recommendation", "")

    new_profile = QuizProfile(
        user_id=submission.user_id,
        topic=canonical_topic,
        difficulty=difficulty,
        score=score,
        total_questions=total_questions,
        strengths_json=json.dumps(strengths),
        weaknesses_json=json.dumps(weaknesses),
        summary=summary,
        recommendation=recommendation,
    )
    db.add(new_profile)
    db.commit()

    profile_context = (
        f"Learner summary: {summary}. "
        f"Strengths: {', '.join(strengths[:3])}. "
        f"Weaknesses: {', '.join(weaknesses[:3])}. "
        f"Recommendation: {recommendation}."
    )

    # 4. Generate learning path based on quiz score + learner profile
    path_json = generate_learning_path_json(
        canonical_topic,
        score,
        difficulty,
        user_id=submission.user_id,
        profile_context=profile_context,
    )

    # 5. Fallback if AI fails
    if not path_json:
        path_json = {
            "title": f"{canonical_topic.title()} Learning Path ({difficulty.title()})",
            "difficulty": difficulty,
            "chapters": [
                {"title": "Introduction", "subchapters": ["Basics", "Setup", "Getting Started"]},
                {"title": "Core Concepts", "subchapters": ["Fundamentals", "Key Principles", "Practice"]},
                {"title": "Building Skills", "subchapters": ["Projects", "Exercises", "Challenges"]},
                {"title": "Mastery", "subchapters": ["Advanced Topics", "Best Practices", "Review"]},
            ],
            "adaptive_profile_summary": summary,
            "adaptive_focus_areas": weaknesses[:3],
        }

    # 6. Save learning path to database
    new_path = LearningPath(
        user_id=submission.user_id,
        topic=canonical_topic,
        generated_content=path_json
    )
    db.add(new_path)
    db.commit()
    db.refresh(new_path)

    return {
        "message": "Quiz completed! Learning path generated.",
        "passed": score >= 50,
        "score": score,
        "correct": correct_count,
        "total_questions": total_questions,
        "topic": canonical_topic,
        "difficulty": difficulty,
        "profile_summary": summary,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendation": recommendation,
        "path_id": new_path.id,
        "path": path_json
    }

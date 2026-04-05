"""
Progress API - Track user progress through learning paths with levels
"""

from typing import List, Optional, Any
from datetime import datetime
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.curriculum import LearningPath
from app.models.progress import TopicProgress, ExerciseResult, ChapterQuizResult
from app.models.quiz import QuizResult
from app.models.quiz_profile import QuizProfile
from app.models.user import User
from app.services.ai_service import (
    generate_level1_exercises,
    generate_level2_exercises,
    generate_level3_exercises,
    generate_chapter_quiz,
    generate_topic_resources,
    evaluate_code_submission,
    generate_adaptive_path_update,
    generate_dynamic_recommendations,
    normalize_topic,
)
from app.services.runtime_eval_service import evaluate_code_runtime
import asyncio

router = APIRouter()


# ==================== SCHEMAS ====================

class InitProgressRequest(BaseModel):
    user_id: int
    learning_path_id: int


class ExerciseSubmission(BaseModel):
    user_id: int
    topic_progress_id: int
    level: int
    exercise_id: int
    exercise_type: str
    question: str
    user_answer: str
    correct_answer: Optional[str] = None


class CodeSubmission(BaseModel):
    user_id: int
    topic_progress_id: int
    code: str
    exercise: dict  # The full exercise object


class ChapterQuizSubmission(BaseModel):
    user_id: int
    topic_progress_id: int
    answers: List[dict]  # [{question_id, selected_answer}]
    quiz_data: dict


class SingleExerciseItem(BaseModel):
    exercise_id: int
    exercise_type: str
    question: str
    user_answer: str
    correct_answer: Optional[str] = None
    exercise_payload: Optional[dict] = None


class BatchExerciseSubmission(BaseModel):
    user_id: int
    topic_progress_id: int
    level: int
    topic: str
    chapter: str
    submissions: List[SingleExerciseItem]


class ProgressResponse(BaseModel):
    id: int
    chapter_index: int
    chapter_title: str
    level1_completed: bool
    level2_completed: bool
    level3_completed: bool
    chapter_quiz_passed: bool
    is_unlocked: bool
    
    class Config:
        from_attributes = True


# ==================== HELPER ====================

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


# ==================== ENDPOINTS ====================

@router.post("/init")
def initialize_progress(request: InitProgressRequest, db: Session = Depends(get_db)):
    """
    Initialize progress tracking for a learning path.
    Creates TopicProgress entries for each chapter.
    First chapter is unlocked by default.
    """
    # Check if progress already exists
    existing = db.query(TopicProgress).filter(
        TopicProgress.user_id == request.user_id,
        TopicProgress.learning_path_id == request.learning_path_id
    ).first()
    
    if existing:
        # Return existing progress
        progress = db.query(TopicProgress).filter(
            TopicProgress.user_id == request.user_id,
            TopicProgress.learning_path_id == request.learning_path_id
        ).order_by(TopicProgress.chapter_index).all()
        return {"message": "Progress already exists", "progress": progress}
    
    # Get learning path
    path = db.query(LearningPath).filter(LearningPath.id == request.learning_path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")
    
    chapters = path.generated_content.get("chapters", [])
    progress_list = []
    
    for i, chapter in enumerate(chapters):
        progress = TopicProgress(
            user_id=request.user_id,
            learning_path_id=request.learning_path_id,
            chapter_index=i,
            chapter_title=chapter.get("title", f"Chapter {i+1}"),
            is_unlocked=(i == 0),  # Only first chapter unlocked
            started_at=datetime.utcnow() if i == 0 else None
        )
        db.add(progress)
        progress_list.append(progress)
    
    db.commit()
    
    # Refresh to get IDs
    for p in progress_list:
        db.refresh(p)
    
    return {
        "message": "Progress initialized",
        "total_chapters": len(chapters),
        "progress": [
            {
                "id": p.id,
                "chapter_index": p.chapter_index,
                "chapter_title": p.chapter_title,
                "is_unlocked": p.is_unlocked
            }
            for p in progress_list
        ]
    }


@router.get("/user/{user_id}/path/{learning_path_id}")
def get_progress(user_id: int, learning_path_id: int, db: Session = Depends(get_db)):
    """Get all progress for a user's learning path"""
    progress = db.query(TopicProgress).filter(
        TopicProgress.user_id == user_id,
        TopicProgress.learning_path_id == learning_path_id
    ).order_by(TopicProgress.chapter_index).all()
    
    if not progress:
        return {"message": "No progress found. Initialize first.", "progress": []}
    
    return {
        "progress": [
            {
                "id": p.id,
                "chapter_index": p.chapter_index,
                "chapter_title": p.chapter_title,
                "level1_completed": p.level1_completed,
                "level2_completed": p.level2_completed,
                "level3_completed": p.level3_completed,
                "chapter_quiz_score": p.chapter_quiz_score,
                "chapter_quiz_passed": p.chapter_quiz_passed,
                "is_unlocked": p.is_unlocked,
                "resources_generated": p.resources_generated
            }
            for p in progress
        ]
    }


@router.get("/resources/{topic_progress_id}")
def get_resources(topic_progress_id: int, db: Session = Depends(get_db), topic: str = "python", refresh: bool = False):
    """Get or generate resources (YouTube videos, notes) for a chapter"""
    progress = db.query(TopicProgress).filter(TopicProgress.id == topic_progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    if not progress.is_unlocked:
        raise HTTPException(status_code=403, detail="Chapter is locked")
    
    # Return cached resources if available (unless refresh is requested)
    if not refresh and progress.resources_generated and progress.resources_data:
        # Check if notes have actual content (not just fallback)
        notes = progress.resources_data.get("notes", {})
        if notes.get("key_concepts") and len(notes.get("key_concepts", [])) > 0:
            return progress.resources_data
        # If notes are empty, regenerate
    
    # Get learning path for subchapter info
    path = db.query(LearningPath).filter(LearningPath.id == progress.learning_path_id).first()
    chapters = path.generated_content.get("chapters", [])
    chapter_data = chapters[progress.chapter_index] if progress.chapter_index < len(chapters) else {}
    subchapters = [s.get("title", s) if isinstance(s, dict) else s for s in chapter_data.get("subchapters", [])]
    
    # Generate resources using ground truth topic from DB instead of volatile query parameter
    actual_topic = normalize_topic(path.topic) if path else normalize_topic(topic)
    resources = run_async(generate_topic_resources(
        topic=actual_topic,
        chapter=progress.chapter_title,
        subchapters=subchapters,
        language=actual_topic
    ))
    
    # Cache resources
    progress.resources_data = resources
    progress.resources_generated = True
    db.commit()
    
    return resources


@router.get("/exercises/{topic_progress_id}/level/{level}")
def get_level_exercises(topic_progress_id: int, level: int, db: Session = Depends(get_db), topic: str = "python", user_id: Optional[int] = None):
    """Get exercises for a specific level (1, 2, or 3) with adaptive difficulty"""
    if level not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Level must be 1, 2, or 3")
    
    progress = db.query(TopicProgress).filter(TopicProgress.id == topic_progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    if not progress.is_unlocked:
        raise HTTPException(status_code=403, detail="Chapter is locked")
    
    # Check if previous level is completed (except for level 1)
    if level == 2 and not progress.level1_completed:
        raise HTTPException(status_code=403, detail="Complete Level 1 first")
    if level == 3 and not progress.level2_completed:
        raise HTTPException(status_code=403, detail="Complete Level 2 first")
    
    # Build adaptive student context
    student_context = ""
    effective_user_id = user_id or progress.user_id
    if effective_user_id:
        past_results = db.query(ExerciseResult).filter(
            ExerciseResult.user_id == effective_user_id
        ).order_by(ExerciseResult.created_at.desc()).limit(20).all()
        
        if past_results:
            total = len(past_results)
            correct = sum(1 for r in past_results if r.is_correct)
            pct = round(correct / total * 100) if total > 0 else 0
            student_context = f"Student's recent accuracy: {pct}% ({correct}/{total} correct). "
            
            # Identify struggling topics
            wrong_questions = [r.question for r in past_results if not r.is_correct and r.question][:5]
            if wrong_questions:
                student_context += f"Recently struggled with: {'; '.join(wrong_questions)}. "
            
            # Check performance on previous level of this chapter
            chapter_results = [r for r in past_results if r.topic_progress_id == topic_progress_id]
            if chapter_results:
                ch_correct = sum(1 for r in chapter_results if r.is_correct)
                ch_total = len(chapter_results)
                student_context += f"Performance on this chapter so far: {ch_correct}/{ch_total} correct. "
                if ch_correct / ch_total < 0.5:
                    student_context += "The student is struggling with this chapter - make questions slightly easier and provide more guidance. "
                elif ch_correct / ch_total > 0.8:
                    student_context += "The student excels at this chapter - make questions more challenging. "

                previous_level_questions = [
                    r.question for r in chapter_results
                    if r.level < level and r.question
                ][:8]
                if previous_level_questions:
                    student_context += (
                        "Avoid repeating these previous level questions/themes: "
                        + "; ".join(previous_level_questions)
                        + ". "
                    )
    
    # Generate exercises
    chapter = progress.chapter_title
    
    path = db.query(LearningPath).filter(LearningPath.id == progress.learning_path_id).first()
    actual_topic = normalize_topic(path.topic) if path else normalize_topic(topic)

    # Add latest per-user quiz profile context for the same topic.
    if effective_user_id:
        latest_profile = db.query(QuizProfile).filter(
            QuizProfile.user_id == effective_user_id,
            QuizProfile.topic == actual_topic
        ).order_by(QuizProfile.created_at.desc()).first()
        if latest_profile:
            strengths = json.loads(latest_profile.strengths_json) if latest_profile.strengths_json else []
            weaknesses = json.loads(latest_profile.weaknesses_json) if latest_profile.weaknesses_json else []
            student_context += (
                f" Adaptive quiz profile summary: {latest_profile.summary or ''}."
                f" Strengths: {', '.join(strengths[:3])}."
                f" Weaknesses: {', '.join(weaknesses[:3])}."
                f" Recommendation: {latest_profile.recommendation or ''}."
            )
    
    if level == 1:
        exercises = run_async(generate_level1_exercises(actual_topic, chapter, actual_topic, student_context))
    elif level == 2:
        exercises = run_async(generate_level2_exercises(actual_topic, chapter, actual_topic, student_context))
    else:
        exercises = run_async(generate_level3_exercises(actual_topic, chapter, actual_topic, student_context))
    
    return exercises


@router.post("/exercises/submit")
def submit_exercise(submission: ExerciseSubmission, db: Session = Depends(get_db)):
    """Submit an exercise answer and check if correct"""
    progress = db.query(TopicProgress).filter(TopicProgress.id == submission.topic_progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    # For MCQ and fill-blank, check answer
    is_correct = submission.user_answer.strip().lower() == submission.correct_answer.strip().lower()
    
    # Save result
    result = ExerciseResult(
        user_id=submission.user_id,
        topic_progress_id=submission.topic_progress_id,
        level=submission.level,
        exercise_type=submission.exercise_type,
        question=submission.question,
        user_answer=submission.user_answer,
        correct_answer=submission.correct_answer,
        is_correct=is_correct,
        score=100 if is_correct else 0
    )
    db.add(result)
    db.commit()
    
    return {
        "is_correct": is_correct,
        "correct_answer": submission.correct_answer,
        "message": "Correct! Well done!" if is_correct else "Not quite. Try again!"
    }


@router.post("/exercises/submit-code")
def submit_code(submission: CodeSubmission, db: Session = Depends(get_db)):
    """Submit code for Level 3 and get AI evaluation"""
    progress = db.query(TopicProgress).filter(TopicProgress.id == submission.topic_progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    # Get learning path for topic
    path = db.query(LearningPath).filter(LearningPath.id == progress.learning_path_id).first()
    language = normalize_topic(path.topic) if path else "python"

    # Runtime evaluation first; AI fallback if runtime cannot be applied.
    runtime_eval = evaluate_code_runtime(
        code=submission.code,
        exercise=submission.exercise or {},
        language=language,
    )
    if runtime_eval.get("evaluated"):
        evaluation = runtime_eval
    else:
        evaluation = run_async(evaluate_code_submission(
            code=submission.code,
            exercise=submission.exercise,
            language=language
        ))
    
    # Save result
    result = ExerciseResult(
        user_id=submission.user_id,
        topic_progress_id=submission.topic_progress_id,
        level=3,
        exercise_type="write_code",
        question=submission.exercise.get("title", "Code Exercise"),
        user_answer=submission.code,
        correct_answer=submission.exercise.get("solution", ""),
        is_correct=evaluation.get("passed", False),
        ai_feedback=evaluation.get("feedback", ""),
        score=evaluation.get("score", 0)
    )
    db.add(result)
    db.commit()
    
    return evaluation


@router.post("/exercises/submit-all")
def submit_all_exercises(submission: BatchExerciseSubmission, db: Session = Depends(get_db)):
    """
    Submit all exercise answers at once for AI batch evaluation.
    Returns a comprehensive report with strengths, areas to improve, and per-question results.
    """
    progress = db.query(TopicProgress).filter(TopicProgress.id == submission.topic_progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")

    # Get canonical language from learning path
    path = db.query(LearningPath).filter(LearningPath.id == progress.learning_path_id).first()
    language = normalize_topic(path.topic) if path else normalize_topic(submission.topic)

    # Deterministic grading with runtime code execution for code exercises.
    question_results = []
    total_correct = 0
    runtime_evaluated_count = 0

    for sub in submission.submissions:
        user_answer = (sub.user_answer or "").strip()
        correct_answer = (sub.correct_answer or "").strip()

        is_correct = False
        explanation = ""
        display_correct_answer = correct_answer

        if sub.exercise_type in {"complete_code", "write_code"}:
            runtime_eval = evaluate_code_runtime(
                code=sub.user_answer or "",
                exercise=sub.exercise_payload or {},
                language=language,
            )
            if runtime_eval.get("evaluated"):
                runtime_evaluated_count += 1
                is_correct = bool(runtime_eval.get("passed", False))
                explanation = runtime_eval.get("feedback", "Runtime evaluation complete.")
                if runtime_eval.get("test_results"):
                    failed = [
                        t for t in runtime_eval.get("test_results", [])
                        if not t.get("passed")
                    ]
                    if failed:
                        first_failed = failed[0]
                        explanation += (
                            f" First failed test expected {first_failed.get('expected')} "
                            f"but got {first_failed.get('actual')}."
                        )
                display_correct_answer = (
                    correct_answer
                    or (sub.exercise_payload or {}).get("solution", "")
                    or "See expected test outputs"
                )
            else:
                # Fallback when runtime is unavailable for the language.
                is_correct = user_answer.lower() == correct_answer.lower() if correct_answer else False
                explanation = runtime_eval.get(
                    "feedback",
                    "Runtime evaluation unavailable for this language on this server.",
                )
        else:
            is_correct = user_answer.lower() == correct_answer.lower() if correct_answer else False
            explanation = "Correct answer." if is_correct else f"Expected answer: {display_correct_answer}"

        if is_correct:
            total_correct += 1

        question_results.append({
            "question": sub.question,
            "user_answer": sub.user_answer,
            "correct_answer": display_correct_answer,
            "is_correct": is_correct,
            "explanation": explanation,
        })

        result = ExerciseResult(
            user_id=submission.user_id,
            topic_progress_id=submission.topic_progress_id,
            level=submission.level,
            exercise_type=sub.exercise_type,
            question=sub.question,
            user_answer=sub.user_answer,
            correct_answer=display_correct_answer,
            is_correct=is_correct,
            ai_feedback=explanation,
            score=100 if is_correct else 0
        )
        db.add(result)

    total_questions = len(submission.submissions)
    score = round((total_correct / total_questions) * 100, 1) if total_questions else 0
    passing_score = 50 if submission.level == 3 else 60
    passed = score >= passing_score

    strengths = []
    areas_to_improve = []
    if runtime_evaluated_count > 0:
        strengths.append("Code answers were validated with runtime test execution.")
    if passed:
        strengths.append("Consistent correctness across submitted answers.")
    else:
        areas_to_improve.append("Review failed questions and rerun against expected test cases.")
    if not strengths:
        strengths.append("You attempted all required questions.")

    recommendation = (
        "Great work. Continue to the next level/chapter."
        if passed
        else "Revise the weak concepts and retry after testing your code locally."
    )

    report = {
        "score": score,
        "passed": passed,
        "total_correct": total_correct,
        "total_questions": total_questions,
        "feedback": (
            f"You answered {total_correct}/{total_questions} correctly."
            + (" Runtime tests were used for code evaluation." if runtime_evaluated_count else "")
        ),
        "question_results": question_results,
        "strengths": strengths,
        "areas_to_improve": areas_to_improve,
        "recommendation": recommendation,
    }

    db.commit()
    return report


@router.post("/level/complete")
def complete_level(user_id: int, topic_progress_id: int, level: int, db: Session = Depends(get_db)):
    """Mark a level as completed and generate resources for next level"""
    progress = db.query(TopicProgress).filter(TopicProgress.id == topic_progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    if level == 1:
        progress.level1_completed = True
    elif level == 2:
        progress.level2_completed = True
    elif level == 3:
        progress.level3_completed = True
    
    progress.updated_at = datetime.utcnow()
    db.commit()
    
    # Check if ready for chapter quiz
    all_levels_done = progress.level1_completed and progress.level2_completed and progress.level3_completed
    
    # Auto-generate resources/videos for this chapter if not already generated
    if not progress.resources_generated:
        try:
            path = db.query(LearningPath).filter(LearningPath.id == progress.learning_path_id).first()
            if path:
                chapters = path.generated_content.get("chapters", [])
                chapter_data = chapters[progress.chapter_index] if progress.chapter_index < len(chapters) else {}
                subchapters = [s.get("title", s) if isinstance(s, dict) else s for s in chapter_data.get("subchapters", [])]
                
                resources = run_async(generate_topic_resources(
                    topic=normalize_topic(path.topic),
                    chapter=progress.chapter_title,
                    subchapters=subchapters,
                    language=normalize_topic(path.topic)
                ))
                progress.resources_data = resources
                progress.resources_generated = True
                db.commit()
        except Exception as e:
            print(f"Warning: Failed to auto-generate resources: {e}")
    
    return {
        "message": f"Level {level} completed!",
        "level1_completed": progress.level1_completed,
        "level2_completed": progress.level2_completed,
        "level3_completed": progress.level3_completed,
        "ready_for_quiz": all_levels_done,
        "resources_generated": progress.resources_generated
    }


@router.get("/chapter-quiz/{topic_progress_id}")
def get_chapter_quiz(topic_progress_id: int, topic: str = "python", db: Session = Depends(get_db)):
    """Get the chapter quiz (only after completing all 3 levels)"""
    progress = db.query(TopicProgress).filter(TopicProgress.id == topic_progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    # Check all levels completed
    if not (progress.level1_completed and progress.level2_completed and progress.level3_completed):
        raise HTTPException(
            status_code=403, 
            detail="Complete all 3 levels before taking the chapter quiz"
        )
    
    # Get actual language from learning path
    path = db.query(LearningPath).filter(LearningPath.id == progress.learning_path_id).first()
    actual_topic = normalize_topic(path.topic) if path else normalize_topic(topic)
    
    # Generate quiz
    quiz = run_async(generate_chapter_quiz(actual_topic, progress.chapter_title, actual_topic))
    
    return quiz


@router.post("/chapter-quiz/submit")
def submit_chapter_quiz(submission: ChapterQuizSubmission, db: Session = Depends(get_db)):
    """
    Submit chapter quiz answers.
    If score >= 50%, unlock next chapter.
    """
    progress = db.query(TopicProgress).filter(TopicProgress.id == submission.topic_progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")
    
    # Calculate score
    questions = submission.quiz_data.get("questions", [])
    correct = 0
    
    for answer in submission.answers:
        q_id = answer.get("question_id")
        selected = answer.get("selected_answer", "")
        
        # Find the question
        for q in questions:
            if q.get("id") == q_id:
                if selected.strip().lower() == q.get("answer", "").strip().lower():
                    correct += 1
                break
    
    score = (correct / len(questions)) * 100 if questions else 0
    passed = score >= 50
    
    # Save quiz result
    quiz_result = ChapterQuizResult(
        user_id=submission.user_id,
        topic_progress_id=submission.topic_progress_id,
        score=score,
        total_questions=len(questions),
        passed=passed,
        quiz_data=submission.quiz_data,
        answers=submission.answers
    )
    db.add(quiz_result)
    
    # Update progress
    progress.chapter_quiz_score = score
    progress.chapter_quiz_passed = passed
    
    if passed:
        progress.completed_at = datetime.utcnow()
        
        # Unlock next chapter
        next_progress = db.query(TopicProgress).filter(
            TopicProgress.user_id == submission.user_id,
            TopicProgress.learning_path_id == progress.learning_path_id,
            TopicProgress.chapter_index == progress.chapter_index + 1
        ).first()
        
        if next_progress:
            next_progress.is_unlocked = True
            next_progress.started_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "score": score,
        "correct": correct,
        "total": len(questions),
        "passed": passed,
        "message": "Congratulations! Next chapter unlocked!" if passed else "Keep practicing! Score 50% to unlock the next chapter.",
        "next_chapter_unlocked": passed
    }


@router.get("/status/user/{user_id}/path/{learning_path_id}")
def get_learning_status(user_id: int, learning_path_id: int, db: Session = Depends(get_db)):
    """Get overall learning status and statistics"""
    progress_list = db.query(TopicProgress).filter(
        TopicProgress.user_id == user_id,
        TopicProgress.learning_path_id == learning_path_id
    ).order_by(TopicProgress.chapter_index).all()
    
    if not progress_list:
        return {"message": "No progress found"}
    
    total_chapters = len(progress_list)
    completed_chapters = sum(1 for p in progress_list if p.chapter_quiz_passed)
    current_chapter = next((p for p in progress_list if p.is_unlocked and not p.chapter_quiz_passed), None)
    
    return {
        "total_chapters": total_chapters,
        "completed_chapters": completed_chapters,
        "progress_percentage": (completed_chapters / total_chapters) * 100,
        "current_chapter": {
            "id": current_chapter.id,
            "index": current_chapter.chapter_index,
            "title": current_chapter.chapter_title,
            "level1_done": current_chapter.level1_completed,
            "level2_done": current_chapter.level2_completed,
            "level3_done": current_chapter.level3_completed
        } if current_chapter else None,
        "chapters": [
            {
                "id": p.id,
                "index": p.chapter_index,
                "title": p.chapter_title,
                "is_unlocked": p.is_unlocked,
                "is_completed": p.chapter_quiz_passed,
                "levels_done": sum([p.level1_completed, p.level2_completed, p.level3_completed])
            }
            for p in progress_list
        ]
    }


# ==================== DYNAMIC STUDENT SUMMARY ====================

@router.get("/student-summary/{user_id}")
def get_student_summary(user_id: int, db: Session = Depends(get_db)):
    """
    Comprehensive dynamic student summary.
    Computes real stats from all history — chapters completed, exercise accuracy,
    streaks, current position, AI-powered recommendations.
    This is the CORE adaptive intelligence endpoint.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ---- All learning paths ----
    paths = db.query(LearningPath).filter(LearningPath.user_id == user_id).all()

    # ---- All progress records across all paths ----
    all_progress = db.query(TopicProgress).filter(
        TopicProgress.user_id == user_id
    ).order_by(TopicProgress.chapter_index).all()

    # ---- All exercise results ----
    all_exercises = db.query(ExerciseResult).filter(
        ExerciseResult.user_id == user_id
    ).order_by(ExerciseResult.created_at).all()

    # ---- All quiz results ----
    quiz_results = db.query(QuizResult).filter(
        QuizResult.user_id == user_id
    ).all()

    chapter_quizzes = db.query(ChapterQuizResult).filter(
        ChapterQuizResult.user_id == user_id
    ).all()

    # ---- Compute stats ----
    total_chapters = len(all_progress)
    completed_chapters = sum(1 for p in all_progress if p.chapter_quiz_passed)
    total_exercises = len(all_exercises)
    correct_exercises = sum(1 for e in all_exercises if e.is_correct)
    overall_accuracy = round(correct_exercises / total_exercises * 100, 1) if total_exercises else 0

    # Levels completed
    l1_done = sum(1 for p in all_progress if p.level1_completed)
    l2_done = sum(1 for p in all_progress if p.level2_completed)
    l3_done = sum(1 for p in all_progress if p.level3_completed)
    total_levels_done = l1_done + l2_done + l3_done
    total_levels_possible = total_chapters * 3

    # Overall learning progress (weighted: levels 60%, quizzes 40%)
    level_pct = (total_levels_done / total_levels_possible * 100) if total_levels_possible else 0
    quiz_pct = (completed_chapters / total_chapters * 100) if total_chapters else 0
    overall_progress = round(level_pct * 0.6 + quiz_pct * 0.4, 1) if total_chapters else 0

    # Estimated learning hours
    estimated_hours = round(total_exercises * 0.05 + completed_chapters * 1.5, 1)

    # Streak: count consecutive days with activity (from most recent)
    streak = 0
    if all_exercises:
        from datetime import timedelta
        today = datetime.utcnow().date()
        activity_dates = sorted(set(e.created_at.date() for e in all_exercises if e.created_at), reverse=True)
        for i, d in enumerate(activity_dates):
            expected = today - timedelta(days=i)
            if d == expected:
                streak += 1
            else:
                break

    # Topics mastered (chapters with quiz passed)
    mastered_topics = [p.chapter_title for p in all_progress if p.chapter_quiz_passed]

    # Struggling areas
    struggling_areas = []
    for p in all_progress:
        if not p.is_unlocked:
            continue
        ch_exercises = [e for e in all_exercises if e.topic_progress_id == p.id]
        if len(ch_exercises) >= 3:
            ch_correct = sum(1 for e in ch_exercises if e.is_correct)
            ch_acc = ch_correct / len(ch_exercises) * 100
            if ch_acc < 50:
                struggling_areas.append({
                    "chapter": p.chapter_title,
                    "accuracy": round(ch_acc, 1),
                    "attempts": len(ch_exercises)
                })

    # Strong areas
    strong_areas = []
    for p in all_progress:
        ch_exercises = [e for e in all_exercises if e.topic_progress_id == p.id]
        if len(ch_exercises) >= 3:
            ch_correct = sum(1 for e in ch_exercises if e.is_correct)
            ch_acc = ch_correct / len(ch_exercises) * 100
            if ch_acc >= 80:
                strong_areas.append({
                    "chapter": p.chapter_title,
                    "accuracy": round(ch_acc, 1)
                })

    # Current active chapters
    current_chapters = []
    for p in all_progress:
        if p.is_unlocked and not p.chapter_quiz_passed:
            levels_done = sum([p.level1_completed, p.level2_completed, p.level3_completed])
            path = next((pt for pt in paths if pt.id == p.learning_path_id), None)
            current_chapters.append({
                "id": p.id,
                "chapter_title": p.chapter_title,
                "path_topic": path.topic if path else "unknown",
                "levels_completed": levels_done,
                "next_step": "Chapter Quiz" if levels_done == 3 else f"Level {levels_done + 1}"
            })

    # Recent activity (last 10 exercises)
    recent_activity = []
    for e in reversed(all_exercises[-10:]):
        recent_activity.append({
            "question": (e.question or "")[:60],
            "is_correct": e.is_correct,
            "level": e.level,
            "type": e.exercise_type,
            "date": e.created_at.isoformat() if e.created_at else None
        })

    # Per-path progress breakdown
    path_breakdowns = []
    for path in paths:
        p_progress = [p for p in all_progress if p.learning_path_id == path.id]
        p_total = len(p_progress)
        p_completed = sum(1 for p in p_progress if p.chapter_quiz_passed)
        p_current = next((p for p in p_progress if p.is_unlocked and not p.chapter_quiz_passed), None)
        path_breakdowns.append({
            "path_id": path.id,
            "topic": path.topic,
            "title": path.generated_content.get("title", path.topic) if isinstance(path.generated_content, dict) else path.topic,
            "total_chapters": p_total,
            "completed_chapters": p_completed,
            "progress_pct": round(p_completed / p_total * 100, 1) if p_total else 0,
            "current_chapter": p_current.chapter_title if p_current else None
        })

    # Dynamic goals
    goals = []
    if not paths:
        goals.append({"goal": "Take a quiz to get your first AI learning path", "priority": "high", "type": "quiz"})
    elif current_chapters:
        top = current_chapters[0]
        goals.append({
            "goal": f"Complete {top['next_step']} in \"{top['chapter_title']}\"",
            "priority": "high",
            "type": "exercise"
        })
        if streak == 0:
            goals.append({"goal": "Start a learning streak — practice today!", "priority": "medium", "type": "streak"})
        elif streak > 0:
            goals.append({"goal": f"Keep your {streak}-day streak alive!", "priority": "medium", "type": "streak"})
    if struggling_areas:
        goals.append({
            "goal": f"Review \"{struggling_areas[0]['chapter']}\" — accuracy is {struggling_areas[0]['accuracy']}%",
            "priority": "high",
            "type": "review"
        })

    return {
        "user": {
            "id": user.id,
            "name": user.full_name or user.email,
        },
        "stats": {
            "total_paths": len(paths),
            "total_chapters": total_chapters,
            "completed_chapters": completed_chapters,
            "total_exercises_attempted": total_exercises,
            "correct_exercises": correct_exercises,
            "overall_accuracy": overall_accuracy,
            "overall_progress": overall_progress,
            "estimated_learning_hours": estimated_hours,
            "streak_days": streak,
            "topics_mastered": mastered_topics,
            "total_levels_completed": total_levels_done,
        },
        "current_chapters": current_chapters,
        "path_breakdowns": path_breakdowns,
        "struggling_areas": struggling_areas,
        "strong_areas": strong_areas,
        "recent_activity": recent_activity,
        "goals": goals,
    }


# ==================== ADAPTIVE PATH UPDATE ====================

@router.post("/adapt-path/{learning_path_id}")
def adapt_learning_path(learning_path_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Dynamically adapt/regenerate a learning path based on student's
    full history: exercise results, quiz scores, struggling areas, strengths.
    This is the KEY adaptive intelligence feature.
    """
    path = db.query(LearningPath).filter(LearningPath.id == learning_path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found")

    # Gather full student history
    all_progress = db.query(TopicProgress).filter(
        TopicProgress.user_id == user_id,
        TopicProgress.learning_path_id == learning_path_id
    ).order_by(TopicProgress.chapter_index).all()

    all_exercises = db.query(ExerciseResult).filter(
        ExerciseResult.user_id == user_id
    ).order_by(ExerciseResult.created_at).all()

    chapter_quizzes = db.query(ChapterQuizResult).filter(
        ChapterQuizResult.user_id == user_id
    ).all()

    # Build a detailed performance profile
    chapter_performance = []
    for p in all_progress:
        ch_exercises = [e for e in all_exercises if e.topic_progress_id == p.id]
        ch_total = len(ch_exercises)
        ch_correct = sum(1 for e in ch_exercises if e.is_correct)
        ch_quiz = next((q for q in chapter_quizzes if q.topic_progress_id == p.id), None)

        level_detail = {}
        for lvl in [1, 2, 3]:
            lvl_ex = [e for e in ch_exercises if e.level == lvl]
            lvl_total = len(lvl_ex)
            lvl_correct = sum(1 for e in lvl_ex if e.is_correct)
            level_detail[f"level{lvl}"] = {
                "completed": getattr(p, f"level{lvl}_completed"),
                "attempts": lvl_total,
                "correct": lvl_correct,
                "accuracy": round(lvl_correct / lvl_total * 100) if lvl_total else 0
            }

        chapter_performance.append({
            "chapter": p.chapter_title,
            "chapter_index": p.chapter_index,
            "is_unlocked": p.is_unlocked,
            "is_completed": p.chapter_quiz_passed,
            "quiz_score": p.chapter_quiz_score,
            "total_exercises": ch_total,
            "correct_exercises": ch_correct,
            "accuracy": round(ch_correct / ch_total * 100) if ch_total else 0,
            "levels": level_detail
        })

    # Overall stats
    total_ex = len(all_exercises)
    correct_ex = sum(1 for e in all_exercises if e.is_correct)
    overall_acc = round(correct_ex / total_ex * 100) if total_ex else 0

    # Get current path structure
    current_content = path.generated_content if isinstance(path.generated_content, dict) else {}
    current_chapters = current_content.get("chapters", [])

    # Find struggling chapters and strong chapters
    struggling = [c for c in chapter_performance if c["accuracy"] < 50 and c["total_exercises"] >= 3]
    strong = [c for c in chapter_performance if c["accuracy"] >= 80 and c["total_exercises"] >= 3]

    # Call AI to generate adapted path
    adapted = run_async(generate_adaptive_path_update(
        topic=path.topic,
        language=path.topic,
        current_chapters=[c.get("title", "") for c in current_chapters],
        chapter_performance=chapter_performance,
        overall_accuracy=overall_acc,
        struggling_areas=[s["chapter"] for s in struggling],
        strong_areas=[s["chapter"] for s in strong],
    ))

    if adapted and "chapters" in adapted:
        # Preserve the original path structure but update with adapted content
        new_content = current_content.copy()
        new_content["chapters"] = adapted["chapters"]
        new_content["adapted"] = True
        new_content["adapted_at"] = datetime.utcnow().isoformat()
        new_content["adaptation_reason"] = adapted.get("adaptation_reason", "Based on student performance")
        if adapted.get("tips"):
            new_content["tips"] = adapted["tips"]
        if adapted.get("focus_areas"):
            new_content["focus_areas"] = adapted["focus_areas"]

        path.generated_content = new_content
        db.commit()
        db.refresh(path)

        # Re-initialize progress for new chapters that don't exist yet
        existing_indexes = {p.chapter_index for p in all_progress}
        for i, chapter in enumerate(adapted["chapters"]):
            if i not in existing_indexes:
                new_progress = TopicProgress(
                    user_id=user_id,
                    learning_path_id=learning_path_id,
                    chapter_index=i,
                    chapter_title=chapter.get("title", f"Chapter {i+1}"),
                    is_unlocked=False,
                    started_at=None
                )
                db.add(new_progress)

        db.commit()

        return {
            "message": "Learning path adapted to your performance!",
            "adapted": True,
            "reason": adapted.get("adaptation_reason", "Based on performance analysis"),
            "focus_areas": adapted.get("focus_areas", []),
            "new_chapter_count": len(adapted["chapters"]),
            "path": new_content
        }

    return {
        "message": "Path could not be adapted at this time. Keep learning!",
        "adapted": False,
        "path": current_content
    }


# ==================== AI RECOMMENDATIONS ====================

@router.get("/recommendations/{user_id}")
def get_recommendations(user_id: int, db: Session = Depends(get_db)):
    """
    AI-powered dynamic recommendations based on full student history.
    """
    all_exercises = db.query(ExerciseResult).filter(
        ExerciseResult.user_id == user_id
    ).order_by(ExerciseResult.created_at).all()

    all_progress = db.query(TopicProgress).filter(
        TopicProgress.user_id == user_id
    ).all()

    paths = db.query(LearningPath).filter(
        LearningPath.user_id == user_id
    ).all()

    if not all_exercises and not all_progress:
        return {
            "recommendations": [
                {
                    "type": "get_started",
                    "title": "Take Your First Quiz",
                    "description": "Complete a programming quiz to get an AI-powered personalized learning path.",
                    "priority": "high",
                    "action": "quiz-home"
                }
            ]
        }

    # Build context for AI
    total_ex = len(all_exercises)
    correct_ex = sum(1 for e in all_exercises if e.is_correct)
    accuracy = round(correct_ex / total_ex * 100) if total_ex else 0

    struggling = []
    for p in all_progress:
        ch_ex = [e for e in all_exercises if e.topic_progress_id == p.id]
        if len(ch_ex) >= 3:
            ch_acc = sum(1 for e in ch_ex if e.is_correct) / len(ch_ex) * 100
            if ch_acc < 50:
                struggling.append(p.chapter_title)

    topics = list(set(p.topic for p in paths))

    recommendations = run_async(generate_dynamic_recommendations(
        topics=topics,
        overall_accuracy=accuracy,
        total_exercises=total_ex,
        struggling_chapters=struggling,
        completed_chapters=sum(1 for p in all_progress if p.chapter_quiz_passed),
        total_chapters=len(all_progress),
    ))

    return {"recommendations": recommendations}


@router.get("/my-report/{user_id}")
def get_my_report(user_id: int, db: Session = Depends(get_db)):
    """
    Generate an AI-powered performance report for the student themselves.
    Reuses the same logic as the admin report.
    """
    from app.services.ai_service import generate_student_report

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    progress_list = db.query(TopicProgress).filter(TopicProgress.user_id == user_id).all()

    if not progress_list:
        return {
            "student": {"id": user.id, "full_name": user.full_name, "email": user.email},
            "struggling_topics": [],
            "report": {
                "overall_grade": "N/A",
                "overall_score": 0,
                "summary": "No learning activity yet. Start a learning path to see your report!",
                "strengths": [],
                "weaknesses": [],
                "chapter_analysis": [],
                "recommendations": ["Take a quiz and start a learning path to begin."],
                "learning_style_notes": "",
                "predicted_areas_of_difficulty": []
            }
        }

    # Build chapters data
    chapters_data = []
    exercise_lines = []
    for p in progress_list:
        exercise_results = db.query(ExerciseResult).filter(
            ExerciseResult.user_id == user_id,
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

    path = db.query(LearningPath).filter(LearningPath.id == progress_list[0].learning_path_id).first()
    topic = path.topic if path else "programming"

    report = run_async(generate_student_report(
        student_name=user.full_name or user.email,
        topic=topic,
        chapters_data=chapters_data,
        exercise_summary=exercise_summary,
        language=topic
    ))

    # Identify struggling topics
    struggling_topics = []
    for p in progress_list:
        ch_exercises = db.query(ExerciseResult).filter(
            ExerciseResult.user_id == user_id,
            ExerciseResult.topic_progress_id == p.id
        ).all()
        if len(ch_exercises) >= 3:
            ch_correct = sum(1 for e in ch_exercises if e.is_correct)
            if ch_correct / len(ch_exercises) < 0.5:
                struggling_topics.append(p.chapter_title)

    return {
        "student": {
            "id": user.id,
            "full_name": user.full_name or "Student",
            "email": user.email
        },
        "struggling_topics": struggling_topics,
        "report": report
    }
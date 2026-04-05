from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.curriculum import LearningPath
from app.models.user import User
from app.schemas.path_schema import PathResponse
from app.services.llm_service import generate_learning_path_json
from app.services.ai_service import normalize_topic


router = APIRouter()


class GeneratePathRequest(BaseModel):
    topic: str
    score: float
    user_id: int
    difficulty: str = "beginner"  # beginner, intermediate, advanced


@router.post("/generate", response_model=PathResponse)
def create_learning_path(
    request: GeneratePathRequest,
    db: Session = Depends(get_db),
):
    """
    Triggers the AI to generate a path based on the quiz score.
    Note: Usually called automatically after quiz submission.
    """
    normalized_topic = normalize_topic(request.topic)
    print(f"DEBUG: Generating {request.difficulty} path for User {request.user_id} on topic {normalized_topic}...")

    # Determine difficulty from score if not explicitly set
    if request.score <= 40:
        difficulty = "beginner"
    elif request.score <= 70:
        difficulty = "intermediate"
    else:
        difficulty = "advanced"

    # 1. Call AI Service with difficulty
    path_json = generate_learning_path_json(normalized_topic, request.score, difficulty)

    # 2. Fallback if AI fails
    if not path_json:
        print("DEBUG: AI failed, using fallback path.")
        path_json = {
            "title": f"{request.topic.title()} Learning Path ({difficulty.title()})",
            "difficulty": difficulty,
            "chapters": [
                {"title": "Introduction", "subchapters": ["Basics", "Setup"]},
                {
                    "title": "Core Concepts",
                    "subchapters": ["Syntax", "Variables", "Control Flow"],
                },
                {
                    "title": "Advanced Topics",
                    "subchapters": ["OOP", "Error Handling"],
                },
            ],
        }

    # 3. Save to Database
    new_path = LearningPath(user_id=request.user_id, topic=normalized_topic, generated_content=path_json)
    db.add(new_path)
    db.commit()
    db.refresh(new_path)

    return new_path


@router.get("/{user_id}", response_model=List[PathResponse])
def get_user_paths(user_id: int, db: Session = Depends(get_db)):
    """Fetch all paths saved for a student."""
    return db.query(LearningPath).filter(LearningPath.user_id == user_id).all()

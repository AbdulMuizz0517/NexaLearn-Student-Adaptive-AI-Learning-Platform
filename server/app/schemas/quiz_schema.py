from typing import List, Optional

from pydantic import BaseModel


class QuizQuestion(BaseModel):
	id: int
	question: str
	code_snippet: Optional[str] = None
	options: List[str]
	answer: str


class QuizResponse(BaseModel):
	title: str
	questions: List[QuizQuestion]


class QuizSubmission(BaseModel):
	user_id: int
	topic: str
	score: float
	total_questions: int = 10


class QuizAttempt(BaseModel):
	question_id: int
	question: str
	selected_answer: str
	correct_answer: str
	is_correct: bool


class AdaptiveQuizSubmission(BaseModel):
	user_id: int
	topic: str
	answers: List[QuizAttempt]

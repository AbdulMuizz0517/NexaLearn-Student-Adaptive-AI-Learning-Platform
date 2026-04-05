"""
LLM Service: Dynamically generate quizzes and learning paths.
Now uses Groq API (free, fast, GPT-level quality) instead of local Ollama.

Get your free API key at: https://console.groq.com/keys
"""

import asyncio
from typing import Optional, Dict

from app.services.ai_service import (
    generate_quiz as async_generate_quiz,
    generate_learning_path as async_generate_learning_path,
    get_randomized_fallback_quiz,
    get_fallback_learning_path
)


def run_async(coro):
    """Run an async function synchronously."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're in async context - need different approach
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result(timeout=90)
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def generate_quiz_json(
    topic: str,
    difficulty: str = "beginner",
    user_id: int = 0,
    question_count: int = 10,
    profile_context: str = "",
) -> Optional[Dict]:
    """
    Generate a quiz using Groq API (Llama 3.1 70B).
    Synchronous wrapper for backwards compatibility.
    """
    print(f"DEBUG: Generating {difficulty} quiz for {topic} using Groq API...")
    
    try:
        result = run_async(async_generate_quiz(topic, difficulty, user_id, question_count, profile_context))
        if result:
            print(f"DEBUG: Quiz generated successfully with {len(result.get('questions', []))} questions")
            return result
    except Exception as e:
        print(f"ERROR: Quiz generation failed: {e}")
    
    print("DEBUG: Using randomized fallback quiz")
    return get_randomized_fallback_quiz(topic, difficulty, question_count=question_count, user_id=user_id)


def generate_learning_path_json(
    topic: str,
    current_score: float,
    difficulty: str = "beginner",
    user_id: int = 0,
    profile_context: str = "",
) -> Optional[Dict]:
    """
    Generate a learning path using Groq API.
    Synchronous wrapper for backwards compatibility.
    """
    print(f"DEBUG: Generating {difficulty} learning path for {topic} (score: {current_score}%)...")
    
    try:
        result = run_async(async_generate_learning_path(topic, current_score, difficulty, user_id, profile_context))
        if result:
            print(f"DEBUG: Learning path generated with {len(result.get('chapters', []))} chapters")
            return result
    except Exception as e:
        print(f"ERROR: Learning path generation failed: {e}")
    
    print("DEBUG: Using fallback learning path")
    return get_fallback_learning_path(topic, difficulty)


def get_fallback_quiz(topic: str, difficulty: str = "beginner") -> Dict:
    """Returns a randomized fallback quiz if AI fails."""
    return get_randomized_fallback_quiz(topic, difficulty)

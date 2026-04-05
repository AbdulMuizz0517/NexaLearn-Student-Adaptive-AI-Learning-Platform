"""
AI Service using Groq API (free, fast, GPT-level quality)
Uses Llama 3.1 70B for high-quality quiz generation and learning paths.

Get your free API key at: https://console.groq.com/keys
"""

import json
import random
import hashlib
import re
from collections import Counter
from datetime import datetime
from typing import Optional, Dict, List, Any
import urllib.parse

import httpx

from app.core.config import settings


# Groq API endpoint
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


async def call_groq_api(messages: List[Dict], temperature: float = 0.7, max_tokens: int = 2000) -> Optional[str]:
    """Call Groq API with the given messages."""
    if not settings.GROQ_API_KEY:
        print("WARNING: GROQ_API_KEY not set. Using fallback content.")
        return None
    
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Note: Not using response_format as it may not be supported by all models
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(GROQ_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        print(f"ERROR calling Groq API: {e.response.status_code} - {e.response.text}")
        return None
    except Exception as e:
        print(f"ERROR calling Groq API: {e}")
        return None


def parse_json_response(text: str) -> Optional[Dict]:
    """Parse JSON from LLM response."""
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from the response
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
    return None


TOPIC_ALIASES = {
    "python": "python",
    "py": "python",
    "javascript": "javascript",
    "js": "javascript",
    "java": "java",
    "c++": "c++",
    "cpp": "c++",
    "cxx": "c++",
    "c#": "c#",
    "csharp": "c#",
    "cs": "c#",
    "rust": "rust",
}


def normalize_topic(topic: str) -> str:
    normalized = (topic or "python").strip().lower()
    return TOPIC_ALIASES.get(normalized, normalized)


CODE_REFERENCE_PATTERN = re.compile(
    r"(following code|output of (the )?following|given (the )?code|what does this code|code snippet|program below)",
    re.IGNORECASE,
)

FENCED_CODE_PATTERN = re.compile(r"```[a-zA-Z0-9_+\-]*\s*([\s\S]*?)```", re.MULTILINE)


def _clean_code_snippet(snippet: Optional[str]) -> Optional[str]:
    """Normalize code formatting coming from model outputs."""
    if snippet is None:
        return None

    text = str(snippet).strip()
    if not text:
        return None

    fenced = FENCED_CODE_PATTERN.search(text)
    if fenced:
        text = fenced.group(1).strip()

    # Convert escaped newlines/tabs to readable code when models return escaped literals.
    text = text.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\t", "\t")
    return text.strip() or None


def _strip_embedded_code_from_question(question: str) -> str:
    """Remove inline markdown code blocks from question sentence."""
    cleaned = FENCED_CODE_PATTERN.sub("", question)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    # Trim dangling punctuation if model left empty wrapper text.
    cleaned = cleaned.rstrip("` ")
    return cleaned


def _dedupe_options(options: List[str]) -> List[str]:
    """Deduplicate options while preserving order."""
    result: List[str] = []
    seen = set()
    for opt in options:
        key = re.sub(r"\s+", " ", opt).strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(opt.strip())
    return result


def _looks_like_code_fragment(text: str) -> bool:
    """Heuristic: detect answer options that are code fragments, not outputs."""
    value = (text or "").strip().lower()
    if not value:
        return False
    markers = [
        "std::",
        "#include",
        "return ",
        "int ",
        "float ",
        "double ",
        "main(",
        "print(",
        "console.",
        "system.out",
    ]
    if any(token in value for token in markers):
        return True
    # Code-like punctuation patterns.
    if ";" in value or "{" in value or "}" in value:
        return True
    return False


def _normalize_quiz_question(raw: Dict[str, Any], fallback_id: int) -> Optional[Dict[str, Any]]:
    """Normalize one quiz question shape and reject malformed code-reference questions."""
    if not isinstance(raw, dict):
        return None

    question = str(raw.get("question") or "").strip()
    if not question:
        return None

    options_raw = raw.get("options")
    if not isinstance(options_raw, list):
        return None

    options = [str(opt).strip() for opt in options_raw if str(opt).strip()]
    options = _dedupe_options(options)
    if len(options) < 2:
        return None

    answer = str(raw.get("answer") or "").strip()
    if not answer:
        return None
    answer_key = re.sub(r"\s+", " ", answer).strip().lower()
    if not any(re.sub(r"\s+", " ", opt).strip().lower() == answer_key for opt in options):
        options.append(answer)
    options = _dedupe_options(options)

    # Keep option count bounded while ensuring the correct answer remains present.
    if len(options) > 4:
        trimmed = options[:4]
        if answer not in trimmed:
            trimmed[-1] = answer
        options = trimmed

    code_snippet_raw = raw.get("code_snippet") or raw.get("code")
    code_snippet = _clean_code_snippet(code_snippet_raw)

    # If model embedded fenced code in question text, extract/normalize it.
    if not code_snippet:
        embedded = FENCED_CODE_PATTERN.search(question)
        if embedded:
            code_snippet = _clean_code_snippet(embedded.group(0))

    question = _strip_embedded_code_from_question(question)
    if not question:
        return None

    # Avoid showing raw code as an answer option when question asks for output.
    if code_snippet and "output" in question.lower():
        snippet_compact = re.sub(r"\s+", " ", code_snippet).strip().lower()
        filtered = []
        for opt in options:
            opt_compact = re.sub(r"\s+", " ", opt).strip().lower()
            if opt_compact and opt_compact in snippet_compact:
                continue
            if _looks_like_code_fragment(opt):
                continue
            filtered.append(opt)
        if len(filtered) >= 2:
            options = filtered

    references_code = bool(CODE_REFERENCE_PATTERN.search(question))
    if references_code and not code_snippet:
        return None

    # Ensure answer still matches one of the final options.
    answer_match = None
    for opt in options:
        if re.sub(r"\s+", " ", opt).strip().lower() == answer_key:
            answer_match = opt
            break
    if not answer_match:
        return None
    answer = answer_match

    normalized: Dict[str, Any] = {
        "id": fallback_id,
        "question": question,
        "options": options,
        "answer": answer,
        "explanation": str(raw.get("explanation") or "").strip() or "Practice this concept more for better understanding.",
    }
    if code_snippet:
        normalized["code_snippet"] = code_snippet

    return normalized


def _sanitize_quiz_questions(
    questions: List[Dict[str, Any]],
    topic: str,
    difficulty: str,
    question_count: int,
    user_id: int,
) -> List[Dict[str, Any]]:
    """Sanitize generated questions and fill missing/invalid ones from fallback pool."""
    sanitized: List[Dict[str, Any]] = []
    seen = set()

    for idx, raw in enumerate(questions or [], start=1):
        normalized = _normalize_quiz_question(raw, idx)
        if not normalized:
            continue
        dedupe_key = normalized["question"].strip().lower()
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        sanitized.append(normalized)
        if len(sanitized) >= question_count:
            break

    if len(sanitized) < question_count:
        fallback = get_randomized_fallback_quiz(topic, difficulty, question_count=max(question_count * 2, 12), user_id=user_id)
        fallback_questions = fallback.get("questions", []) if isinstance(fallback, dict) else []
        for raw in fallback_questions:
            normalized = _normalize_quiz_question(raw, len(sanitized) + 1)
            if not normalized:
                continue
            dedupe_key = normalized["question"].strip().lower()
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            sanitized.append(normalized)
            if len(sanitized) >= question_count:
                break

    for i, q in enumerate(sanitized, start=1):
        q["id"] = i

    return sanitized[:question_count]


async def generate_quiz(
    topic: str,
    difficulty: str = "beginner",
    user_id: int = 0,
    question_count: int = 10,
    profile_context: str = "",
) -> Dict:
    """
    Generate a unique, high-quality quiz using Groq's Llama 3.1.
    Uses randomization to ensure different questions each time.
    """
    canonical_topic = normalize_topic(topic)
    if question_count < 5:
        question_count = 5

    # Create a unique seed based on time and user to ensure variety
    seed = hashlib.md5(
        f"{canonical_topic}{difficulty}{user_id}{question_count}{datetime.now().isoformat()}{random.random()}".encode()
    ).hexdigest()[:8]
    
    # Question categories for variety
    categories = {
        "beginner": [
            "basic syntax and output prediction",
            "variable types and assignments", 
            "simple control flow (if/else)",
            "basic loops and iterations",
            "string manipulation basics",
            "list and array basics",
            "function definitions and calls",
            "common beginner mistakes and debugging"
        ],
        "intermediate": [
            "object-oriented programming",
            "error handling and exceptions",
            "file I/O operations",
            "data structures (stacks, queues, trees)",
            "algorithm complexity (Big O)",
            "recursion problems",
            "lambda functions and comprehensions",
            "modules and packages"
        ],
        "advanced": [
            "design patterns",
            "concurrency and threading",
            "memory management",
            "performance optimization",
            "metaprogramming",
            "decorators and generators",
            "database operations",
            "API design and best practices"
        ]
    }
    
    # Select random categories for this quiz
    difficulty_categories = categories.get(difficulty, categories["beginner"])
    repeats = (question_count // len(difficulty_categories)) + 1
    expanded_categories = (difficulty_categories * repeats)[: max(question_count, len(difficulty_categories))]
    random.shuffle(expanded_categories)
    selected_categories = expanded_categories[:question_count]

    adaptive_context = f"\nADAPTIVE PROFILE CONTEXT: {profile_context}\n" if profile_context else ""
    
    prompt = f"""Generate a unique {difficulty} level programming quiz about {canonical_topic}.

IMPORTANT: Create COMPLETELY NEW and DIFFERENT questions. Use this seed for uniqueness: {seed}
{adaptive_context}

Focus on these specific topics (one question each):
{json.dumps(selected_categories, indent=2)}

Requirements:
1. Each question must be practical and test real coding knowledge
2. Include code snippets where appropriate
3. All 4 options must be plausible (no obviously wrong answers)
4. Questions should be challenging but fair for {difficulty} level
5. Make questions DIFFERENT from typical textbook questions
6. If code is needed, put it ONLY in "code_snippet" and NOT inside "question"
7. Question text must be plain sentence text (no markdown code fences)

Return JSON in this exact format:
{{
    "title": "{canonical_topic} Quiz - {difficulty.title()} Level",
    "difficulty": "{difficulty}",
    "questions": [
        {{
            "id": 1,
            "category": "category name",
            "question": "What is the output of: print([1,2,3][-1])?",
            "code_snippet": "print([1,2,3][-1])",
            "options": ["3", "1", "[1,2,3]", "Error: negative index"],
            "answer": "3",
            "explanation": "Negative indexing starts from the end, so -1 gives the last element."
        }}
    ]
}}

Generate exactly {question_count} unique questions:"""

    messages = [
        {"role": "system", "content": "You are an expert programming instructor creating quiz questions. Always return valid JSON. Create unique, practical questions that test real understanding."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.9, max_tokens=2500)
    data = parse_json_response(response)
    
    if data and "questions" in data:
        normalized_questions = _sanitize_quiz_questions(
            data.get("questions", []),
            topic=canonical_topic,
            difficulty=difficulty,
            question_count=question_count,
            user_id=user_id,
        )
        if len(normalized_questions) >= question_count:
            data["questions"] = normalized_questions
            return data
    
    # Fallback with randomized questions
    return get_randomized_fallback_quiz(canonical_topic, difficulty, question_count=question_count, user_id=user_id)


async def generate_learning_path(
    topic: str,
    score: float,
    difficulty: str,
    user_id: int = 0,
    profile_context: str = "",
) -> Dict:
    """
    Generate a personalized learning path based on quiz performance.
    Includes specific resources, estimated times, and progression.
    """
    
    canonical_topic = normalize_topic(topic)
    adaptive_context = f"\nAdaptive learner profile:\n{profile_context}\n" if profile_context else ""

    prompt = f"""Create a personalized learning path for a student learning {canonical_topic}.

Student Performance:
- Quiz Score: {score}%
- Current Level: {difficulty}
- Recommendation: {"Focus on fundamentals" if score < 50 else "Ready for next concepts" if score < 80 else "Ready for advanced topics"}
{adaptive_context}

Create a structured learning path with:
1. Clear chapter progression
2. Specific topics to cover in each chapter
3. Estimated time for each chapter
4. Learning objectives
5. Recommended resources (YouTube search terms, documentation links)

Return JSON in this format:
{{
    "title": "{canonical_topic} Learning Path",
    "difficulty": "{difficulty}",
    "total_estimated_hours": 20,
    "chapters": [
        {{
            "id": 1,
            "title": "Chapter Title",
            "description": "What you'll learn",
            "estimated_hours": 3,
            "subchapters": [
                {{
                    "title": "Subtopic",
                    "objectives": ["Learn X", "Understand Y"],
                    "resources": {{
                        "youtube_search": "python basics tutorial beginner",
                        "documentation": "https://docs.python.org/3/tutorial/",
                        "practice": "Write a simple hello world program"
                    }}
                }}
            ]
        }}
    ],
    "next_steps": "What to do after completing this path",
    "tips": ["Tip 1", "Tip 2"]
}}

Generate a comprehensive {6 if difficulty == "beginner" else 7 if difficulty == "intermediate" else 8} chapter learning path:"""

    messages = [
        {"role": "system", "content": "You are an expert curriculum designer. Create detailed, practical learning paths. Always return valid JSON."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.7, max_tokens=3000)
    data = parse_json_response(response)
    
    if data and "chapters" in data:
        data["difficulty"] = difficulty
        data["based_on_score"] = score
        return data
    
    # Fallback
    return get_fallback_learning_path(topic, difficulty)


async def generate_content_notes(topic: str, chapter: str, subchapter: str) -> Dict:
    """Generate detailed notes for a specific topic."""
    
    prompt = f"""Create comprehensive study notes for:
Topic: {topic}
Chapter: {chapter}
Subtopic: {subchapter}

Include:
1. Clear explanation of concepts
2. Code examples where relevant
3. Key points to remember
4. Common mistakes to avoid
5. Practice exercises

Return JSON:
{{
    "topic": "{subchapter}",
    "summary": "2-3 paragraph explanation",
    "key_concepts": [
        {{
            "name": "Concept name",
            "explanation": "Clear explanation",
            "example": "Code or example"
        }}
    ],
    "code_examples": [
        {{
            "title": "Example title",
            "code": "actual code here",
            "explanation": "What this code does"
        }}
    ],
    "key_points": ["Point 1", "Point 2"],
    "common_mistakes": ["Mistake 1 and how to avoid it"],
    "practice_exercises": [
        {{
            "question": "Exercise question",
            "hint": "Helpful hint",
            "difficulty": "easy/medium/hard"
        }}
    ],
    "youtube_searches": ["search term 1", "search term 2"],
    "next_topic": "What to learn next"
}}"""

    messages = [
        {"role": "system", "content": "You are an expert programming tutor. Create clear, practical educational content. Always return valid JSON."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.6, max_tokens=2500)
    return parse_json_response(response) or {"error": "Failed to generate notes"}


async def evaluate_progress(user_id: int, quiz_results: List[Dict]) -> Dict:
    """Evaluate student progress and provide recommendations."""
    
    if not quiz_results:
        return {"status": "no_data", "message": "No quiz results to evaluate"}
    
    # Calculate statistics
    scores = [r.get("score", 0) for r in quiz_results]
    avg_score = sum(scores) / len(scores)
    latest_score = scores[-1] if scores else 0
    trend = "improving" if len(scores) >= 2 and scores[-1] > scores[-2] else "declining" if len(scores) >= 2 and scores[-1] < scores[-2] else "stable"
    
    prompt = f"""Analyze this student's learning progress and provide recommendations:

Quiz History:
- Total Quizzes Taken: {len(quiz_results)}
- Average Score: {avg_score:.1f}%
- Latest Score: {latest_score}%
- Trend: {trend}
- Topics: {[r.get("topic", "unknown") for r in quiz_results[-5:]]}
- Recent Scores: {scores[-5:]}

Provide a detailed analysis with:
1. Performance assessment
2. Strengths and weaknesses
3. Specific recommendations
4. Next steps

Return JSON:
{{
    "performance_level": "excellent/good/average/needs_improvement/struggling",
    "average_score": {avg_score:.1f},
    "trend": "{trend}",
    "assessment": "Overall assessment paragraph",
    "strengths": ["Strength 1", "Strength 2"],
    "weaknesses": ["Area needing work 1"],
    "recommendations": [
        {{
            "priority": "high/medium/low",
            "action": "What to do",
            "reason": "Why this helps"
        }}
    ],
    "suggested_topics": ["Topic to review"],
    "encouragement": "Motivational message",
    "next_quiz_difficulty": "beginner/intermediate/advanced"
}}"""

    messages = [
        {"role": "system", "content": "You are an educational advisor analyzing student performance. Be encouraging but honest. Always return valid JSON."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.5, max_tokens=1500)
    return parse_json_response(response) or {
        "performance_level": "average" if avg_score >= 50 else "needs_improvement",
        "average_score": avg_score,
        "trend": trend,
        "assessment": f"Based on {len(quiz_results)} quizzes with an average of {avg_score:.1f}%",
        "recommendations": [{"action": "Keep practicing", "priority": "high"}]
    }


async def generate_quiz_profile_summary(
    topic: str,
    difficulty: str,
    score: float,
    attempts: List[Dict],
) -> Dict:
    """Generate a per-user adaptive profile from a quiz attempt."""
    canonical_topic = normalize_topic(topic)
    simplified_attempts = [
        {
            "question": a.get("question", ""),
            "is_correct": bool(a.get("is_correct", False)),
        }
        for a in attempts
    ]

    prompt = f"""Create an adaptive learner profile from this {canonical_topic} quiz.

Score: {round(score, 1)}%
Computed difficulty: {difficulty}
Question results:
{json.dumps(simplified_attempts, indent=2)}

Return ONLY valid JSON:
{{
  "summary": "2-3 sentence personalized summary",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "recommendation": "Specific next-step recommendation for adaptive learning path",
  "suggested_focus": ["focus area 1", "focus area 2"],
  "difficulty": "{difficulty}"
}}"""

    messages = [
        {
            "role": "system",
            "content": "You are an adaptive learning analyst. Be specific and actionable. Return JSON only.",
        },
        {"role": "user", "content": prompt},
    ]

    response = await call_groq_api(messages, temperature=0.4, max_tokens=1200)
    data = parse_json_response(response)
    if data and isinstance(data.get("strengths"), list) and isinstance(data.get("weaknesses"), list):
        return data

    # Deterministic fallback profile when AI is unavailable
    question_text = " ".join([a.get("question", "") for a in attempts]).lower()
    wrong_questions = [a.get("question", "") for a in attempts if not a.get("is_correct")]

    keywords = [
        "loop",
        "function",
        "array",
        "vector",
        "pointer",
        "oop",
        "class",
        "inherit",
        "memory",
        "syntax",
    ]
    observed = [k for k in keywords if k in question_text]
    weak_hits = Counter()
    for q in wrong_questions:
        ql = (q or "").lower()
        for k in keywords:
            if k in ql:
                weak_hits[k] += 1

    strengths = []
    if score >= 75:
        strengths.append("Good conceptual understanding across core topics")
    if score >= 60:
        strengths.append("Consistent performance on foundational questions")
    if observed:
        strengths.append(f"Exposure to key areas: {', '.join(observed[:3])}")
    while len(strengths) < 3:
        strengths.append("Demonstrated willingness to attempt all questions")

    weak_list = [k for k, _ in weak_hits.most_common(3)]
    if not weak_list:
        weak_list = ["advanced problem solving", "edge-case handling", "time-efficient reasoning"]

    recommendation = (
        f"Start with focused drills on {', '.join(weak_list[:2])}, then move to mixed {canonical_topic} practice sets and short coding challenges."
    )

    return {
        "summary": f"Learner scored {round(score, 1)}% in {canonical_topic}. Current placement is {difficulty}. Targeted reinforcement is needed in weaker areas before advancing.",
        "strengths": strengths[:3],
        "weaknesses": weak_list[:3],
        "recommendation": recommendation,
        "suggested_focus": weak_list[:3],
        "difficulty": difficulty,
    }


async def generate_remediation(topic: str, weak_areas: List[str], score: float) -> Dict:
    """Generate remediation content for struggling students."""
    
    prompt = f"""A student is struggling with {topic}. Create a remediation plan.

Current Score: {score}%
Weak Areas: {json.dumps(weak_areas)}

Create a focused remediation plan with:
1. Simplified explanations of weak areas
2. Step-by-step practice problems
3. Additional resources
4. Motivational support

Return JSON:
{{
    "topic": "{topic}",
    "current_level": "needs_support",
    "remediation_plan": [
        {{
            "weak_area": "Area name",
            "simplified_explanation": "Very simple explanation",
            "analogy": "Real-world analogy to help understand",
            "mini_exercises": [
                {{
                    "question": "Very simple question",
                    "answer": "Answer",
                    "explanation": "Step by step"
                }}
            ]
        }}
    ],
    "video_recommendations": ["Simple tutorial search terms"],
    "practice_strategy": "How to practice effectively",
    "motivation": "Encouraging message",
    "expected_improvement_time": "Estimated time to improve"
}}"""

    messages = [
        {"role": "system", "content": "You are a patient, supportive tutor helping struggling students. Make content simple and encouraging. Always return valid JSON."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.6, max_tokens=2000)
    return parse_json_response(response) or {"error": "Failed to generate remediation"}


# ==================== FALLBACK FUNCTIONS ====================

def get_randomized_fallback_quiz(topic: str, difficulty: str, question_count: int = 10, user_id: int = 0) -> Dict:
    """Generate a randomized fallback quiz when API is unavailable."""
    canonical_topic = normalize_topic(topic)

    questions_pool = {
        "python": [
            {"question": "What is the output of: len('Hello')", "options": ["5", "4", "6", "'Hello'"], "answer": "5"},
            {"question": "Which creates a list?", "options": ["[]", "{}", "()", "//"], "answer": "[]"},
            {"question": "What does 'hello'.upper() return?", "options": ["'HELLO'", "'hello'", "'Hello'", "Error"], "answer": "'HELLO'"},
            {"question": "What is 10 // 3?", "options": ["3", "3.33", "4", "1"], "answer": "3"},
            {"question": "Which is a valid variable name?", "options": ["my_var", "2var", "my-var", "class"], "answer": "my_var"},
            {"question": "What does range(3) produce?", "options": ["0, 1, 2", "1, 2, 3", "0, 1, 2, 3", "1, 2"], "answer": "0, 1, 2"},
            {"question": "What is type(3.14)?", "options": ["float", "int", "str", "double"], "answer": "float"},
            {"question": "How to add item to list?", "options": [".append()", ".add()", ".insert(0)", ".push()"], "answer": ".append()"},
        ],
        "javascript": [
            {"question": "What is typeof 'hello'?", "options": ["string", "text", "str", "char"], "answer": "string"},
            {"question": "Which declares a constant?", "options": ["const", "let", "var", "constant"], "answer": "const"},
            {"question": "What is [1,2,3].length?", "options": ["3", "2", "4", "undefined"], "answer": "3"},
            {"question": "How to log to console?", "options": ["console.log()", "print()", "log()", "echo()"], "answer": "console.log()"},
        ],
        "java": [
            {"question": "Which is the entry point?", "options": ["main()", "start()", "run()", "init()"], "answer": "main()"},
            {"question": "What keyword creates object?", "options": ["new", "create", "object", "make"], "answer": "new"},
            {"question": "Which collection allows duplicates?", "options": ["ArrayList", "HashSet", "TreeSet", "Map"], "answer": "ArrayList"},
            {"question": "Which keyword is used to inherit a class?", "options": ["extends", "implements", "inherits", "super"], "answer": "extends"},
        ],
        "c++": [
            {"question": "Which operator is used for scope resolution in C++?", "options": ["::", ".", "->", "=>"], "answer": "::"},
            {"question": "Which header is commonly used for input/output streams?", "options": ["<iostream>", "<stdio.h>", "<stream>", "<io>"], "answer": "<iostream>"},
            {"question": "What does std::vector provide?", "options": ["Dynamic array", "Linked list", "Stack only", "Hash table"], "answer": "Dynamic array"},
            {"question": "Which keyword allocates memory on heap?", "options": ["new", "malloc", "alloc", "create"], "answer": "new"},
            {"question": "What is RAII primarily about?", "options": ["Resource lifetime tied to object lifetime", "Manual memory only", "Threading model", "Template metaprogramming"], "answer": "Resource lifetime tied to object lifetime"},
            {"question": "Which function is the entry point in C++?", "options": ["main", "start", "run", "init"], "answer": "main"},
            {"question": "What does const mean for a variable?", "options": ["Value cannot change", "Variable is global", "Variable is static", "Variable is public"], "answer": "Value cannot change"},
            {"question": "Which cast is safest for polymorphic downcasts?", "options": ["dynamic_cast", "reinterpret_cast", "static_cast", "C-style cast"], "answer": "dynamic_cast"},
        ],
        "c#": [
            {"question": "Which keyword defines a class in C#?", "options": ["class", "type", "struct", "object"], "answer": "class"},
            {"question": "Which method writes to console in C#?", "options": ["Console.WriteLine", "print", "echo", "System.out.println"], "answer": "Console.WriteLine"},
            {"question": "What does LINQ stand for?", "options": ["Language Integrated Query", "Linked Query", "Linear Query", "List Indexed Query"], "answer": "Language Integrated Query"},
            {"question": "Which type is nullable by default?", "options": ["string", "int", "double", "bool"], "answer": "string"},
            {"question": "What is the purpose of async/await?", "options": ["Asynchronous non-blocking operations", "Parallel loops only", "Database mapping", "Type inference"], "answer": "Asynchronous non-blocking operations"},
            {"question": "Which keyword creates an object instance?", "options": ["new", "create", "alloc", "make"], "answer": "new"},
            {"question": "Which access modifier is most restrictive?", "options": ["private", "protected", "internal", "public"], "answer": "private"},
            {"question": "Which collection stores key-value pairs?", "options": ["Dictionary", "List", "Queue", "Stack"], "answer": "Dictionary"},
        ],
        "rust": [
            {"question": "Which keyword creates an immutable variable?", "options": ["let", "var", "mut", "const"], "answer": "let"},
            {"question": "How do you make a variable mutable in Rust?", "options": ["let mut", "mutable", "var", "mut let"], "answer": "let mut"},
            {"question": "What does ownership in Rust prevent?", "options": ["Data races and invalid memory access", "Syntax errors", "Slow performance", "Compilation"], "answer": "Data races and invalid memory access"},
            {"question": "Which type represents optional values?", "options": ["Option<T>", "Maybe<T>", "Nullable<T>", "Optional<T>"], "answer": "Option<T>"},
            {"question": "Which macro prints text to console?", "options": ["println!", "print", "echo!", "console.log"], "answer": "println!"},
            {"question": "What does Result<T, E> represent?", "options": ["Success or error", "Only success", "Only error", "Tuple"], "answer": "Success or error"},
            {"question": "Which keyword defines a module?", "options": ["mod", "module", "pkg", "crate"], "answer": "mod"},
            {"question": "What is Cargo in Rust?", "options": ["Build and package manager", "Runtime VM", "Debugger", "Web framework"], "answer": "Build and package manager"},
        ]
    }

    generic = [
        {"question": f"Which statement best describes {canonical_topic} variable declarations?", "options": ["They define named storage with language rules", "They are only constants", "They are always global", "They cannot hold text"], "answer": "They define named storage with language rules"},
        {"question": f"What is the best first step when debugging {canonical_topic} code?", "options": ["Reproduce the issue with a minimal example", "Rewrite everything", "Ignore warnings", "Disable checks"], "answer": "Reproduce the issue with a minimal example"},
        {"question": "Why are functions important in software design?", "options": ["They improve reusability and structure", "They make code slower", "They remove all bugs", "They replace variables"], "answer": "They improve reusability and structure"},
        {"question": "What is a common sign of clean code?", "options": ["Clear names and small focused units", "One very long function", "No comments ever", "Random naming"], "answer": "Clear names and small focused units"},
        {"question": "What does unit testing help with most?", "options": ["Verifying behavior and preventing regressions", "Improving internet speed", "Compiling faster always", "Removing the need for design"], "answer": "Verifying behavior and preventing regressions"},
        {"question": "Which approach best improves programming skill?", "options": ["Regular practice with feedback", "Memorizing syntax only", "Skipping fundamentals", "Avoiding projects"], "answer": "Regular practice with feedback"},
    ]

    # Get questions for the topic or use python as default
    pool = questions_pool.get(canonical_topic, questions_pool["python"]) + generic

    # Deterministic shuffle per user + topic for varied but repeatable sessions
    seeded = random.Random(f"{canonical_topic}-{difficulty}-{user_id}-{datetime.now().date().isoformat()}")
    seeded.shuffle(pool)

    selected = pool[: min(question_count, len(pool))]
    if len(selected) < question_count:
        while len(selected) < question_count:
            selected.append(random.choice(pool))
    
    questions = []
    for i, q in enumerate(selected):
        # Shuffle options for each question
        options = q["options"].copy()
        answer = q["answer"]
        random.shuffle(options)
        questions.append({
            "id": i + 1,
            "question": q["question"],
            "options": options,
            "answer": answer,
            "explanation": "Practice this concept more for better understanding."
        })
    
    return {
        "title": f"{canonical_topic.title()} Quiz - {difficulty.title()} Level",
        "difficulty": difficulty,
        "questions": questions,
        "note": "Generated offline - API unavailable"
    }


def get_fallback_learning_path(topic: str, difficulty: str) -> Dict:
    """Fallback learning path when API is unavailable."""
    return {
        "title": f"{topic.title()} Learning Path",
        "difficulty": difficulty,
        "total_estimated_hours": 20,
        "chapters": [
            {
                "id": 1,
                "title": "Getting Started",
                "description": f"Introduction to {topic}",
                "estimated_hours": 3,
                "subchapters": [
                    {"title": "What is " + topic, "objectives": ["Understand basics"]},
                    {"title": "Setting Up", "objectives": ["Install tools"]},
                    {"title": "First Program", "objectives": ["Write first code"]}
                ]
            },
            {
                "id": 2,
                "title": "Core Fundamentals",
                "description": "Essential concepts",
                "estimated_hours": 5,
                "subchapters": [
                    {"title": "Variables & Types", "objectives": ["Work with data"]},
                    {"title": "Control Flow", "objectives": ["Use conditions"]},
                    {"title": "Loops", "objectives": ["Iterate over data"]}
                ]
            },
            {
                "id": 3,
                "title": "Building Skills",
                "description": "Practice and projects",
                "estimated_hours": 6,
                "subchapters": [
                    {"title": "Functions", "objectives": ["Create reusable code"]},
                    {"title": "Data Structures", "objectives": ["Organize data"]},
                    {"title": "Mini Project", "objectives": ["Apply learning"]}
                ]
            }
        ],
        "next_steps": "Continue practicing with more projects",
        "tips": ["Practice daily", "Build projects", "Read documentation"]
    }


# ==================== EXERCISE GENERATION ====================

async def generate_level1_exercises(topic: str, chapter: str, language: str = "python", student_context: str = "") -> Dict:
    """
    Level 1: MCQs and Fill in the Blanks (Dry Run)
    Easy exercises to test basic understanding
    """
    seed = hashlib.md5(f"{topic}{chapter}{datetime.now().isoformat()}{random.random()}".encode()).hexdigest()[:8]
    print(f"DEBUG: Generating Level 1 exercises for {chapter}, seed: {seed}")
    
    adaptive_section = ""
    if student_context:
        adaptive_section = f"\n\nSTUDENT ADAPTIVE CONTEXT:\n{student_context}\nAdjust the difficulty and focus of questions based on this student's history. Focus more on their weak areas.\n"

    prompt = f"""Create Level 1 exercises for learning {topic}, specifically for the chapter: {chapter}
Programming Language: {language}
Seed for uniqueness: {seed}
{adaptive_section}

Create a mix of:
1. Multiple Choice Questions (MCQs) - 3 questions
2. Fill in the Blanks - 2 questions

These should be "dry run" style - testing if the student can trace through code mentally.

Return ONLY valid JSON (no markdown, no explanation, no code blocks):
{{
    "level": 1,
    "level_name": "Dry Run",
    "chapter": "{chapter}",
    "exercises": [
        {{
            "id": 1,
            "type": "mcq",
            "question": "What is the output of this code?",
            "code": "x = 5\\nprint(x * 2)",
            "options": ["10", "5", "52", "Error"],
            "answer": "10",
            "explanation": "x * 2 multiplies 5 by 2"
        }},
        {{
            "id": 4,
            "type": "fill_blank",
            "question": "Fill in the blank to print 'Hello'",
            "code": "___('Hello')",
            "answer": "print",
            "hint": "This is the function used to display output",
            "explanation": "print() is used to display output"
        }}
    ],
    "passing_score": 60,
    "time_limit_minutes": 10
}}

Generate exactly 5 exercises (3 MCQs + 2 Fill in Blanks):"""

    messages = [
        {"role": "system", "content": f"You are an expert {language} instructor. Return ONLY valid JSON, no markdown code blocks, no explanation text."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.8, max_tokens=2000)
    print(f"DEBUG: Groq response length: {len(response) if response else 0}")
    if response:
        print(f"DEBUG: Response preview: {response[:200]}...")
    
    data = parse_json_response(response)
    print(f"DEBUG: Parsed data has exercises: {data is not None and 'exercises' in data if data else False}")
    
    if data and "exercises" in data:
        print(f"DEBUG: Returning {len(data['exercises'])} AI-generated exercises")
        return data
    
    print("DEBUG: Using fallback exercises")
    return get_fallback_level1(topic, chapter, language, student_context)


async def generate_level2_exercises(topic: str, chapter: str, language: str = "python", student_context: str = "") -> Dict:
    """
    Level 2: Complete the Missing Code
    Medium difficulty - student fills in missing parts
    """
    seed = hashlib.md5(f"{topic}{chapter}L2{datetime.now().isoformat()}{random.random()}".encode()).hexdigest()[:8]
    
    adaptive_section = ""
    if student_context:
        adaptive_section = f"\n\nSTUDENT ADAPTIVE CONTEXT:\n{student_context}\nAdjust difficulty based on level 1 performance. If student struggled, make exercises slightly easier. If student excelled, increase complexity.\n"

    prompt = f"""Create Level 2 exercises for {topic}, chapter: {chapter}
Programming Language: {language}
Seed: {seed}
{adaptive_section}

These are "Complete the Missing Code" exercises where students must fill in the missing parts.
The code should have 1-3 blanks marked as ___ or ??? that students need to complete.

Return JSON:
{{
    "level": 2,
    "level_name": "Complete the Code",
    "chapter": "{chapter}",
    "exercises": [
        {{
            "id": 1,
            "type": "complete_code",
            "title": "Sum of List",
            "description": "Complete the function to calculate the sum of all numbers in a list",
            "starter_code": "def sum_list(numbers):\\n    total = ___\\n    for num in numbers:\\n        total ___ num\\n    return total",
            "blanks": ["0", "+="],
            "solution": "def sum_list(numbers):\\n    total = 0\\n    for num in numbers:\\n        total += num\\n    return total",
            "test_cases": [
                {{"input": "[1, 2, 3]", "expected": "6"}},
                {{"input": "[10, 20]", "expected": "30"}}
            ],
            "hints": ["Initialize total to zero", "Use += to add to total"],
            "explanation": "We initialize total to 0 and add each number to it"
        }}
    ],
    "passing_score": 60,
    "time_limit_minutes": 15
}}

Generate exactly 3 complete-the-code exercises of increasing difficulty:"""

    messages = [
        {"role": "system", "content": f"You are an expert {language} instructor creating code completion exercises. Always return valid JSON with valid code."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.8, max_tokens=2500)
    data = parse_json_response(response)
    
    if data and "exercises" in data:
        exercises = data.get("exercises", [])
        valid_types = all(ex.get("type") == "complete_code" for ex in exercises)
        has_starter_code = all(bool(ex.get("starter_code")) for ex in exercises)
        if valid_types and has_starter_code and len(exercises) >= 3:
            return data
        print("DEBUG: Level 2 payload invalid, falling back to strict level 2 template")
    
    return get_fallback_level2(topic, chapter, language)


async def generate_level3_exercises(topic: str, chapter: str, language: str = "python", student_context: str = "") -> Dict:
    """
    Level 3: Write the Whole Code
    Advanced - student writes complete solution
    """
    seed = hashlib.md5(f"{topic}{chapter}L3{datetime.now().isoformat()}{random.random()}".encode()).hexdigest()[:8]
    
    adaptive_section = ""
    if student_context:
        adaptive_section = f"\n\nSTUDENT ADAPTIVE CONTEXT:\n{student_context}\nThis is the hardest level. Adjust code challenges based on the student's capabilities. If they've been struggling, provide more structured problems. If excelling, challenge them further.\n"

    prompt = f"""Create Level 3 exercises for {topic}, chapter: {chapter}
Programming Language: {language}
Seed: {seed}
{adaptive_section}

These are "Write Complete Code" exercises where students write the entire solution from scratch.
Each problem should be practical and test the concepts from this chapter.

Return JSON:
{{
    "level": 3,
    "level_name": "Write Code",
    "chapter": "{chapter}",
    "exercises": [
        {{
            "id": 1,
            "type": "write_code",
            "title": "Fibonacci Sequence",
            "description": "Write a function that returns the nth Fibonacci number",
            "requirements": [
                "Function should be named 'fibonacci'",
                "Takes one parameter 'n'",
                "Returns the nth Fibonacci number",
                "Handle edge cases (n=0, n=1)"
            ],
            "example_input": "5",
            "example_output": "5",
            "test_cases": [
                {{"input": "0", "expected": "0"}},
                {{"input": "1", "expected": "1"}},
                {{"input": "6", "expected": "8"}}
            ],
            "hints": ["F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2)", "Consider using a loop or recursion"],
            "solution": "def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    a, b = 0, 1\\n    for _ in range(2, n + 1):\\n        a, b = b, a + b\\n    return b",
            "difficulty": "medium"
        }}
    ],
    "passing_score": 50,
    "time_limit_minutes": 25
}}

Generate exactly 2 write-code exercises (one medium, one harder):"""

    messages = [
        {"role": "system", "content": f"You are an expert {language} instructor creating coding challenges. Create practical problems. Always return valid JSON with working code solutions."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.8, max_tokens=2500)
    data = parse_json_response(response)
    
    if data and "exercises" in data:
        exercises = data.get("exercises", [])
        valid_types = all(ex.get("type") == "write_code" for ex in exercises)
        has_requirements = all(bool(ex.get("requirements")) for ex in exercises)
        if valid_types and has_requirements and len(exercises) >= 2:
            return data
        print("DEBUG: Level 3 payload invalid, falling back to strict level 3 template")
    
    return get_fallback_level3(topic, chapter, language)


async def evaluate_code_submission(code: str, exercise: Dict, language: str = "python") -> Dict:
    """
    AI evaluates a student's code submission for Level 3 exercises
    """
    prompt = f"""Evaluate this student's code submission:

EXERCISE:
Title: {exercise.get('title', 'Code Exercise')}
Description: {exercise.get('description', '')}
Requirements: {json.dumps(exercise.get('requirements', []))}
Expected Solution: {exercise.get('solution', '')}

STUDENT'S CODE:
```{language}
{code}
```

Evaluate the code for:
1. Correctness - Does it produce the right output?
2. Code quality - Is it well-structured?
3. Requirements - Does it meet all requirements?
4. Edge cases - Does it handle edge cases?

Return JSON:
{{
    "is_correct": true/false,
    "score": 0-100,
    "feedback": "Detailed feedback explaining what's good and what needs improvement",
    "issues": ["Issue 1", "Issue 2"],
    "suggestions": ["Suggestion for improvement"],
    "test_results": [
        {{"test": "input", "expected": "output", "passed": true/false}}
    ],
    "code_quality_notes": "Notes on code style and structure",
    "passed": true/false
}}"""

    messages = [
        {"role": "system", "content": f"You are an expert {language} code reviewer. Be encouraging but thorough. Always return valid JSON."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.3, max_tokens=1500)
    data = parse_json_response(response)
    
    if data:
        return data
    
    return {
        "is_correct": False,
        "score": 0,
        "feedback": "Unable to evaluate code. Please try again.",
        "passed": False
    }


async def evaluate_exercises_batch(
    submissions: List[Dict],
    topic: str,
    chapter: str,
    level: int,
    language: str = "python",
    student_history: str = ""
) -> Dict:
    """
    AI evaluates all exercise answers at once and generates a comprehensive report.
    Used for the batch submit flow (no live answer feedback).
    """
    # Build a summary of all questions and answers
    qa_text = ""
    for i, sub in enumerate(submissions):
        qa_text += f"\nQ{i+1} ({sub.get('exercise_type', 'unknown')}): {sub.get('question', '')}\n"
        qa_text += f"  Student's Answer: {sub.get('user_answer', 'No answer')}\n"
        qa_text += f"  Correct Answer: {sub.get('correct_answer', 'N/A')}\n"

    history_section = ""
    if student_history:
        history_section = f"\n\nSTUDENT HISTORY (for adaptive feedback):\n{student_history}\n"

    prompt = f"""You are evaluating a student's exercise submissions for:
Topic: {topic}
Chapter: {chapter}
Level: {level} ({'MCQs & Fill Blanks' if level == 1 else 'Complete the Code' if level == 2 else 'Write Code'})
Language: {language}
{history_section}
SUBMISSIONS:
{qa_text}

Evaluate ALL answers carefully. For code answers, check logic and correctness, not just exact string match.
For MCQs and fill-blanks, be flexible with casing and minor variations.

Return ONLY valid JSON:
{{
    "score": 80,
    "passed": true,
    "total_correct": 4,
    "total_questions": 5,
    "feedback": "Overall summary of performance",
    "question_results": [
        {{
            "question": "The question text",
            "user_answer": "Student's answer",
            "correct_answer": "The correct answer",
            "is_correct": true,
            "explanation": "Why correct/incorrect"
        }}
    ],
    "strengths": ["Good understanding of X", "Correct use of Y"],
    "areas_to_improve": ["Need more practice with Z"],
    "recommendation": "Personalized recommendation for the student"
}}

Be encouraging but honest. Provide specific, actionable feedback."""

    messages = [
        {"role": "system", "content": f"You are an expert {language} instructor evaluating student work. Be thorough, fair, and encouraging. Always return valid JSON."},
        {"role": "user", "content": prompt}
    ]

    response = await call_groq_api(messages, temperature=0.3, max_tokens=3000)
    data = parse_json_response(response)

    if data and "question_results" in data:
        return data

    # Fallback: simple string comparison
    correct = 0
    results = []
    for sub in submissions:
        user_ans = (sub.get("user_answer") or "").strip().lower()
        correct_ans = (sub.get("correct_answer") or "").strip().lower()
        is_correct = user_ans == correct_ans
        if is_correct:
            correct += 1
        results.append({
            "question": sub.get("question", ""),
            "user_answer": sub.get("user_answer", ""),
            "correct_answer": sub.get("correct_answer", ""),
            "is_correct": is_correct,
            "explanation": "Correct!" if is_correct else f"The correct answer was: {sub.get('correct_answer', '')}"
        })

    total = len(submissions)
    score = (correct / total * 100) if total > 0 else 0
    return {
        "score": round(score, 1),
        "passed": score >= 60,
        "total_correct": correct,
        "total_questions": total,
        "feedback": f"You got {correct}/{total} correct.",
        "question_results": results,
        "strengths": [],
        "areas_to_improve": [],
        "recommendation": "Keep practicing!"
    }


async def generate_student_report(
    student_name: str,
    topic: str,
    chapters_data: List[Dict],
    exercise_summary: str,
    language: str = "python"
) -> Dict:
    """
    Generate a comprehensive AI report for admin about a student's performance.
    """
    prompt = f"""Generate a detailed learning report for student "{student_name}" studying {topic} ({language}).

CHAPTER PROGRESS:
{json.dumps(chapters_data, indent=2)}

EXERCISE PERFORMANCE SUMMARY:
{exercise_summary}

Create a comprehensive report. Return ONLY valid JSON:
{{
    "overall_grade": "A/B/C/D/F",
    "overall_score": 85,
    "summary": "Brief overall assessment",
    "strengths": ["Strength 1", "Strength 2"],
    "weaknesses": ["Weakness 1", "Weakness 2"],
    "chapter_analysis": [
        {{
            "chapter": "Chapter name",
            "performance": "Excellent/Good/Needs Improvement/Struggling",
            "notes": "Specific observations"
        }}
    ],
    "recommendations": [
        "Specific recommendation 1",
        "Specific recommendation 2"
    ],
    "learning_style_notes": "Observations about the student's learning patterns",
    "predicted_areas_of_difficulty": ["Topic that may be challenging next"]
}}"""

    messages = [
        {"role": "system", "content": "You are an expert educational analyst creating detailed student performance reports. Be insightful and specific. Always return valid JSON."},
        {"role": "user", "content": prompt}
    ]

    response = await call_groq_api(messages, temperature=0.4, max_tokens=2000)
    data = parse_json_response(response)

    if data:
        return data

    return {
        "overall_grade": "N/A",
        "overall_score": 0,
        "summary": "Unable to generate report at this time.",
        "strengths": [],
        "weaknesses": [],
        "chapter_analysis": [],
        "recommendations": ["Continue practicing"],
        "learning_style_notes": "",
        "predicted_areas_of_difficulty": []
    }


async def generate_chapter_quiz(topic: str, chapter: str, language: str = "python") -> Dict:
    """
    Generate a chapter completion quiz (after all 3 levels)
    Must score >= 50% to unlock next chapter
    """
    seed = hashlib.md5(f"{topic}{chapter}QUIZ{datetime.now().isoformat()}{random.random()}".encode()).hexdigest()[:8]
    
    prompt = f"""Create a chapter completion quiz for:
Topic: {topic}
Chapter: {chapter}
Language: {language}
Seed: {seed}

This quiz tests if the student has mastered this chapter and is ready to move on.
Create 5 questions covering all aspects of the chapter.

Return JSON:
{{
    "quiz_type": "chapter_completion",
    "chapter": "{chapter}",
    "topic": "{topic}",
    "passing_score": 50,
    "questions": [
        {{
            "id": 1,
            "question": "Question text with code if needed",
            "code": "optional code snippet",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": "Correct option",
            "explanation": "Why this is correct"
        }}
    ],
    "unlock_message": "Congratulations! You've unlocked the next chapter!",
    "fail_message": "Keep practicing! Review the material and try again."
}}

Generate exactly 5 questions:"""

    messages = [
        {"role": "system", "content": f"You are an expert {language} instructor creating assessment quizzes. Questions should thoroughly test understanding. Always return valid JSON."},
        {"role": "user", "content": prompt}
    ]
    
    response = await call_groq_api(messages, temperature=0.8, max_tokens=2500)
    data = parse_json_response(response)
    
    if data and "questions" in data:
        return data
    
    return get_randomized_fallback_quiz(topic, "intermediate")


async def generate_topic_resources(topic: str, chapter: str, subchapters: List[str], language: str = "python") -> Dict:
    """
    Generate resources (YouTube videos, notes) for a chapter
    """
    # Generate YouTube videos
    video_rand = str(random.random())
    video_prompt = f"""Generate 3 HIGHLY SPECIFIC AND UNIQUE YouTube video recommendations for learning about "{chapter}" in {language} programming.
Seed: {video_rand}
CRITICAL: Do NOT provide generic titles. Provide niche, highly specific sub-topics regarding {chapter}. Each regeneration MUST produce completely different video titles and search queries.

Return ONLY valid JSON (no markdown, no explanation):
{{
    "youtube_videos": [
        {{
            "title": "descriptive video title",
            "search_query": "youtube search query",
            "description": "what this video teaches",
            "duration_estimate": "10-15 min"
        }}
    ]
}}"""

    video_messages = [
        {"role": "system", "content": "You are a helpful assistant. Return only valid JSON, no markdown code blocks."},
        {"role": "user", "content": video_prompt}
    ]
    
    video_response = await call_groq_api(video_messages, temperature=0.9, max_tokens=800)
    video_data = parse_json_response(video_response)
    
    videos = []
    if video_data and "youtube_videos" in video_data:
        # Import video_service to get real video URLs
        try:
            from app.services.video_service import search_youtube_links
            for video in video_data["youtube_videos"]:
                query = video.get("search_query", video.get("title", f"{language} {chapter}"))
                real_videos = search_youtube_links(query, max_results=1)
                if real_videos and len(real_videos) > 0:
                    video["url"] = real_videos[0]["link"]
                else:
                    safe_query = urllib.parse.quote_plus(query)
                    video["url"] = f"https://www.youtube.com/results?search_query={safe_query}"
                videos.append(video)
        except ImportError:
            for video in video_data["youtube_videos"]:
                query = video.get("search_query", video.get("title", f"{language} {chapter}"))
                safe_query = urllib.parse.quote_plus(query)
                video["url"] = f"https://www.youtube.com/results?search_query={safe_query}"
                videos.append(video)
    else:
        # Use video_service for fallbacks too
        try:
            from app.services.video_service import search_youtube_links
            fallback_q1 = f"{language} {chapter} tutorial beginners"
            fallback_q2 = f"{language} {chapter} complete guide"
            
            vid1_res = search_youtube_links(fallback_q1, max_results=1)
            vid2_res = search_youtube_links(fallback_q2, max_results=1)
            
            videos = [
                {
                    "title": f"{language.title()} {chapter} Tutorial for Beginners",
                    "search_query": fallback_q1,
                    "url": vid1_res[0]["link"] if vid1_res else f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(fallback_q1)}",
                    "description": f"Beginner-friendly tutorial on {chapter}",
                    "duration_estimate": "15-20 min"
                },
                {
                    "title": f"Learn {chapter} in {language.title()} - Complete Guide",
                    "search_query": fallback_q2,
                    "url": vid2_res[0]["link"] if vid2_res else f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(fallback_q2)}",
                    "description": f"Comprehensive guide to {chapter}",
                    "duration_estimate": "20-30 min"
                }
            ]
        except ImportError:
            fallback_q1 = f"{language} {chapter} tutorial beginners"
            fallback_q2 = f"{language} {chapter} complete guide"
            videos = [
                {
                    "title": f"{language.title()} {chapter} Tutorial for Beginners",
                    "search_query": fallback_q1,
                    "url": f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(fallback_q1)}",
                    "description": f"Beginner-friendly tutorial on {chapter}",
                    "duration_estimate": "15-20 min"
                },
                {
                    "title": f"Learn {chapter} in {language.title()} - Complete Guide",
                    "search_query": fallback_q2,
                    "url": f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(fallback_q2)}",
                    "description": f"Comprehensive guide to {chapter}",
                    "duration_estimate": "20-30 min"
                }
            ]
    
    # Generate comprehensive study notes
    notes_seed = hashlib.md5(f"{topic}{chapter}NOTES{datetime.now().isoformat()}{random.random()}".encode()).hexdigest()[:8]
    notes_prompt = f"""Create detailed study notes for learning "{chapter}" in {language} programming.
Seed for uniqueness: {notes_seed}

CRITICAL: Generate COMPLETELY DIFFERENT and UNIQUE content than standard generic teaching. Pick entirely different "Key Concepts" than usual. Use unique, creative code examples (e.g. use different variable names, entirely different scenarios). DO NOT REPEAT typical textbook examples. Pick obscure but helpful practical tips.

The notes should be comprehensive and educational. Include:
1. A clear overview (2-3 paragraphs explaining what this topic is about)
2. 4-5 key concepts with detailed explanations and code examples
3. A summary of main points
4. 3-4 practical tips for learners
5. Common mistakes to avoid

Return ONLY valid JSON (no markdown code blocks):
{{
    "notes": {{
        "overview": "Detailed 2-3 paragraph overview of the topic...",
        "key_concepts": [
            {{
                "name": "Concept Name",
                "explanation": "Detailed explanation of this concept (2-3 sentences)",
                "code_example": "# Example code\\nprint('hello')"
            }}
        ],
        "summary": "Summary of the key points covered...",
        "tips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"],
        "common_mistakes": ["Mistake 1 and how to avoid it", "Mistake 2"]
    }}
}}"""

    notes_messages = [
        {"role": "system", "content": f"You are an expert {language} programming instructor. Create clear, detailed, and practical study notes. Return only valid JSON."},
        {"role": "user", "content": notes_prompt}
    ]
    
    notes_response = await call_groq_api(notes_messages, temperature=0.9, max_tokens=2500)
    print(f"DEBUG: Notes response length: {len(notes_response) if notes_response else 0}")
    notes_data = parse_json_response(notes_response)
    
    if notes_data and "notes" in notes_data:
        notes = notes_data["notes"]
        print(f"DEBUG: Successfully parsed notes with {len(notes.get('key_concepts', []))} concepts")
    else:
        print(f"DEBUG: Failed to parse notes, using fallback. Response: {notes_response[:200] if notes_response else 'None'}")
        # Generate fallback notes based on the topic
        notes = generate_fallback_notes(chapter, language)
    
    return {
        "chapter": chapter,
        "topic": topic,
        "youtube_videos": videos,
        "notes": notes
    }


def generate_fallback_notes(chapter: str, language: str) -> Dict:
    """Generate fallback notes when AI fails"""
    chapter_lower = chapter.lower()
    
    # Provide meaningful fallback content based on common programming topics
    if "getting started" in chapter_lower or "introduction" in chapter_lower or "basics" in chapter_lower:
        return {
            "overview": f"""Welcome to {language.title()} programming! This chapter introduces you to the fundamentals of {language}, one of the most popular and versatile programming languages in the world.

{language.title()} is known for its simplicity and readability, making it an excellent choice for beginners while being powerful enough for professional applications. Whether you're interested in web development, data science, automation, or software development, {language} provides the tools you need.

In this chapter, you'll learn how to set up your development environment, write your first program, and understand the basic building blocks of {language} programming.""",
            "key_concepts": [
                {
                    "name": "Installing Python",
                    "explanation": f"Before you can start coding, you need to install {language} on your computer. Download it from the official website and follow the installation instructions for your operating system.",
                    "code_example": "# Check your Python version\n# Open terminal/command prompt and type:\n# python --version"
                },
                {
                    "name": "Your First Program",
                    "explanation": "The traditional first program in any language is 'Hello, World!' - a simple program that displays a message on the screen. This helps you verify your setup is working correctly.",
                    "code_example": "# Your first Python program\nprint('Hello, World!')"
                },
                {
                    "name": "Variables and Data Types",
                    "explanation": "Variables are containers for storing data. Python has several built-in data types including strings (text), integers (whole numbers), floats (decimal numbers), and booleans (True/False).",
                    "code_example": "name = 'Alice'      # String\nage = 25            # Integer\nheight = 5.7        # Float\nis_student = True   # Boolean"
                },
                {
                    "name": "Basic Input and Output",
                    "explanation": "Programs need to communicate with users. The print() function displays output, while input() gets data from users.",
                    "code_example": "name = input('What is your name? ')\nprint(f'Hello, {name}!')"
                }
            ],
            "summary": f"This chapter covered the essentials of getting started with {language}: installing the language, writing your first program, understanding variables and data types, and basic input/output operations. These fundamentals form the foundation for everything else you'll learn.",
            "tips": [
                "Practice coding every day, even if just for 15 minutes",
                "Don't just read code - type it out yourself to build muscle memory",
                "Use the official documentation as your primary reference",
                "Join online communities to ask questions and learn from others"
            ],
            "common_mistakes": [
                "Forgetting to save files before running them",
                "Mixing up = (assignment) with == (comparison)",
                "Not paying attention to indentation - Python uses indentation to define code blocks"
            ]
        }
    elif "function" in chapter_lower or "method" in chapter_lower:
        return {
            "overview": f"""Functions are reusable blocks of code that perform specific tasks. They are one of the most important concepts in programming, allowing you to organize your code, avoid repetition, and make your programs easier to understand and maintain.

In {language}, functions are defined using the 'def' keyword, followed by the function name and parameters. Functions can accept inputs (parameters), perform operations, and return outputs (return values).

Understanding functions is crucial for writing clean, modular, and professional code. They help break down complex problems into smaller, manageable pieces.""",
            "key_concepts": [
                {
                    "name": "Defining Functions",
                    "explanation": "Use the 'def' keyword to create a function. Choose descriptive names that indicate what the function does.",
                    "code_example": "def greet(name):\n    return f'Hello, {name}!'\n\nmessage = greet('Alice')\nprint(message)"
                },
                {
                    "name": "Parameters and Arguments",
                    "explanation": "Parameters are variables in the function definition. Arguments are the actual values passed when calling the function.",
                    "code_example": "def add(a, b):  # a and b are parameters\n    return a + b\n\nresult = add(5, 3)  # 5 and 3 are arguments"
                },
                {
                    "name": "Return Values",
                    "explanation": "Functions can send data back using the return statement. A function without return implicitly returns None.",
                    "code_example": "def square(x):\n    return x * x\n\nresult = square(4)  # result is 16"
                },
                {
                    "name": "Default Parameters",
                    "explanation": "You can provide default values for parameters, making them optional when calling the function.",
                    "code_example": "def greet(name, greeting='Hello'):\n    return f'{greeting}, {name}!'\n\nprint(greet('Alice'))  # Uses default\nprint(greet('Bob', 'Hi'))  # Custom greeting"
                }
            ],
            "summary": "Functions are essential building blocks of any program. You learned how to define functions, work with parameters and return values, and use default parameters. Practice creating your own functions to solve specific problems.",
            "tips": [
                "Keep functions small and focused on a single task",
                "Use descriptive function names that explain what they do",
                "Document your functions with docstrings",
                "Test functions individually before using them in larger programs"
            ],
            "common_mistakes": [
                "Forgetting to return a value when one is expected",
                "Modifying global variables inside functions unintentionally",
                "Using mutable default arguments (like lists or dictionaries)"
            ]
        }
    else:
        return {
            "overview": f"""This chapter explores {chapter} in {language} programming. Understanding this topic is essential for becoming a proficient {language} developer.

The concepts covered here will help you write more efficient, readable, and maintainable code. Take your time to understand each concept thoroughly before moving on.

Practice is key - try to implement the examples yourself and experiment with variations to deepen your understanding.""",
            "key_concepts": [
                {
                    "name": "Core Concept",
                    "explanation": f"This is a fundamental aspect of {chapter} that you'll use frequently in your programs.",
                    "code_example": f"# Example code for {chapter}\n# Practice writing your own examples"
                },
                {
                    "name": "Best Practices",
                    "explanation": f"Following best practices when working with {chapter} will make your code more professional and easier to maintain.",
                    "code_example": "# Follow coding conventions\n# Write clear, readable code"
                }
            ],
            "summary": f"This chapter covered the key aspects of {chapter}. Continue practicing these concepts to build your skills.",
            "tips": [
                "Read the official documentation for more details",
                "Practice with real-world examples",
                "Review and refactor your code regularly"
            ],
            "common_mistakes": [
                "Not testing code thoroughly",
                "Ignoring error messages instead of understanding them"
            ]
        }


# ==================== FALLBACK EXERCISES ====================

def get_fallback_level1(topic: str, chapter: str, language: str, student_context: str = "") -> Dict:
    """Fallback Level 1 exercises with language-specific and user-varying content."""
    lang = normalize_topic(language or topic)
    language_map = {
        "python": "Python",
        "javascript": "JavaScript",
        "java": "Java",
        "c++": "C++",
        "c#": "C#",
        "rust": "Rust",
    }
    lang_label = language_map.get(lang, (language or topic or "programming").upper())

    template_bank = {
        "python": [
            {
                "type": "mcq",
                "question": "What does range(3) produce in Python?",
                "options": ["0, 1, 2", "1, 2, 3", "0, 1, 2, 3", "Error"],
                "answer": "0, 1, 2",
                "explanation": "range(3) starts at 0 and stops before 3."
            },
            {
                "type": "mcq",
                "question": "Which statement creates a dictionary?",
                "options": ["{}", "[]", "()", "set()"],
                "answer": "{}",
                "explanation": "Curly braces create a dictionary literal."
            },
            {
                "type": "fill_blank",
                "question": "Fill the blank to print value of x:",
                "code": "x = 5\n___(x)",
                "answer": "print",
                "hint": "Use the output function",
                "explanation": "print() outputs values to console."
            },
            {
                "type": "fill_blank",
                "question": "Fill the blank to append 7 to list nums:",
                "code": "nums = [1,2]\nnums.___(7)",
                "answer": "append",
                "hint": "List method to add one item at end",
                "explanation": "append adds a single element to a list."
            },
        ],
        "c++": [
            {
                "type": "mcq",
                "question": "Which header enables std::cout in C++?",
                "options": ["<iostream>", "<stdio.h>", "<stream>", "<cstdio>"],
                "answer": "<iostream>",
                "explanation": "std::cout is defined in <iostream>."
            },
            {
                "type": "mcq",
                "question": "Which symbol ends a statement in C++?",
                "options": [";", ":", ".", ","],
                "answer": ";",
                "explanation": "Statements in C++ end with semicolon."
            },
            {
                "type": "fill_blank",
                "question": "Fill the blank to output Hello in C++:",
                "code": "std::___ << \"Hello\";",
                "answer": "cout",
                "hint": "Standard output stream object",
                "explanation": "std::cout sends output to console."
            },
            {
                "type": "fill_blank",
                "question": "Fill the blank to declare integer variable x initialized to 5:",
                "code": "___ x = 5;",
                "answer": "int",
                "hint": "Primitive integer type",
                "explanation": "int declares an integer variable."
            },
        ],
        "javascript": [
            {
                "type": "mcq",
                "question": "Which keyword declares a block-scoped variable?",
                "options": ["let", "var", "const", "both let and const"],
                "answer": "both let and const",
                "explanation": "Both let and const are block-scoped in JS."
            },
            {
                "type": "mcq",
                "question": "What is typeof 42 in JavaScript?",
                "options": ["number", "int", "float", "numeric"],
                "answer": "number",
                "explanation": "All numeric literals are type number in JS."
            },
            {
                "type": "fill_blank",
                "question": "Fill in to print to browser console:",
                "code": "console.___('Hello');",
                "answer": "log",
                "hint": "Common debug output method",
                "explanation": "console.log writes to console."
            },
            {
                "type": "fill_blank",
                "question": "Fill in to create an array:",
                "code": "const nums = ___;",
                "answer": "[]",
                "hint": "Array literal syntax",
                "explanation": "Square brackets create arrays."
            },
        ],
        "java": [
            {
                "type": "mcq",
                "question": "What is the entry point method in Java?",
                "options": ["main", "start", "run", "init"],
                "answer": "main",
                "explanation": "public static void main is Java's entry point."
            },
            {
                "type": "mcq",
                "question": "Which keyword creates an object?",
                "options": ["new", "create", "make", "init"],
                "answer": "new",
                "explanation": "new allocates and constructs an object."
            },
            {
                "type": "fill_blank",
                "question": "Fill in to print to console in Java:",
                "code": "System.out.___(\"Hello\");",
                "answer": "println",
                "hint": "Method to print line",
                "explanation": "println prints text with newline."
            },
            {
                "type": "fill_blank",
                "question": "Fill in the type for integer variable age:",
                "code": "___ age = 20;",
                "answer": "int",
                "hint": "Primitive integer type",
                "explanation": "int is the integer primitive in Java."
            },
        ],
        "c#": [
            {
                "type": "mcq",
                "question": "Which namespace contains Console class?",
                "options": ["System", "Core", "Console", "Main"],
                "answer": "System",
                "explanation": "Console is in System namespace."
            },
            {
                "type": "mcq",
                "question": "Which keyword is used to define a class?",
                "options": ["class", "type", "struct", "object"],
                "answer": "class",
                "explanation": "class defines a reference type in C#."
            },
            {
                "type": "fill_blank",
                "question": "Fill in to print Hello in C#:",
                "code": "Console.___(\"Hello\");",
                "answer": "WriteLine",
                "hint": "Console method with newline",
                "explanation": "WriteLine prints text and a newline."
            },
            {
                "type": "fill_blank",
                "question": "Fill in to declare integer score:",
                "code": "___ score = 10;",
                "answer": "int",
                "hint": "Built-in integer type",
                "explanation": "int is the integer type in C#."
            },
        ],
        "rust": [
            {
                "type": "mcq",
                "question": "How do you declare an immutable variable in Rust?",
                "options": ["let", "var", "const", "mut"],
                "answer": "let",
                "explanation": "let creates immutable binding by default."
            },
            {
                "type": "mcq",
                "question": "How do you make a variable mutable in Rust?",
                "options": ["let mut", "mut let", "var mut", "mutable"],
                "answer": "let mut",
                "explanation": "Use let mut for mutable binding."
            },
            {
                "type": "fill_blank",
                "question": "Fill in to print in Rust:",
                "code": "___!(\"Hello\");",
                "answer": "println",
                "hint": "Standard print macro",
                "explanation": "println! macro prints text with newline."
            },
            {
                "type": "fill_blank",
                "question": "Fill in to define function returning i32:",
                "code": "fn add(a: i32, b: i32) -> ___ { a + b }",
                "answer": "i32",
                "hint": "32-bit integer type",
                "explanation": "i32 is the signed 32-bit integer type."
            },
        ],
    }

    generic = [
        {
            "type": "mcq",
            "question": f"In {lang_label}, what is the best first step before writing complex logic in {chapter}?",
            "options": ["Understand fundamentals and syntax", "Skip to advanced topics", "Ignore compiler errors", "Avoid debugging"],
            "answer": "Understand fundamentals and syntax",
            "explanation": "Strong fundamentals reduce downstream errors."
        },
        {
            "type": "fill_blank",
            "question": f"Fill in the blank: Clean code in {lang_label} should have ___ naming.",
            "code": "// use ___ names",
            "answer": "clear",
            "hint": "Readable and understandable",
            "explanation": "Clear names improve maintainability."
        },
    ]

    pool = (template_bank.get(lang, []) + generic)
    if len(pool) < 5:
        pool = template_bank.get("python", []) + generic

    seed_source = f"{lang}-{chapter}-{student_context}-{datetime.utcnow().date().isoformat()}-{random.random()}"
    seeded = random.Random(seed_source)
    seeded.shuffle(pool)
    selected = pool[:5]

    exercises = []
    for i, ex in enumerate(selected, start=1):
        item = {
            "id": i,
            "type": ex["type"],
            "question": ex["question"],
            "answer": ex["answer"],
            "explanation": ex.get("explanation", ""),
        }
        if ex["type"] == "mcq":
            options = ex.get("options", []).copy()
            seeded.shuffle(options)
            item["options"] = options
        else:
            item["code"] = ex.get("code", "")
            item["hint"] = ex.get("hint", "")
        exercises.append(item)

    return {
        "level": 1,
        "level_name": "Dry Run",
        "chapter": chapter,
        "topic": lang,
        "language": lang_label,
        "exercises": exercises,
        "passing_score": 60,
        "time_limit_minutes": 10,
    }


def get_fallback_level2(topic: str, chapter: str, language: str) -> Dict:
    """Fallback Level 2 exercises with language-specific templates."""
    lang = normalize_topic(language or topic)

    templates = {
        "python": [
            {
                "title": "Sum Function",
                "description": "Complete the function to add two numbers",
                "starter_code": "def add(a, b):\n    return a ___ b",
                "blanks": ["+"],
                "solution": "def add(a, b):\n    return a + b",
                "test_cases": [{"input": "2, 3", "expected": "5"}],
                "hints": ["Use the addition operator"],
                "explanation": "The + operator adds numbers"
            },
            {
                "title": "List Length",
                "description": "Complete to get list length",
                "starter_code": "def get_length(lst):\n    return ___(lst)",
                "blanks": ["len"],
                "solution": "def get_length(lst):\n    return len(lst)",
                "test_cases": [{"input": "[1,2,3]", "expected": "3"}],
                "hints": ["Built-in function for length"],
                "explanation": "len() returns the length"
            },
            {
                "title": "Loop Print",
                "description": "Complete the loop to print 0 to 2",
                "starter_code": "for i in ___(3):\n    print(i)",
                "blanks": ["range"],
                "solution": "for i in range(3):\n    print(i)",
                "test_cases": [{"input": "", "expected": "0\n1\n2"}],
                "hints": ["Function that generates numbers"],
                "explanation": "range(3) generates 0, 1, 2"
            },
        ],
        "c++": [
            {
                "title": "Add Two Integers",
                "description": "Complete the function to add two integers",
                "starter_code": "int add(int a, int b) {\n    return a ___ b;\n}",
                "blanks": ["+"],
                "solution": "int add(int a, int b) {\n    return a + b;\n}",
                "test_cases": [{"input": "2, 3", "expected": "5"}],
                "hints": ["Use arithmetic addition"],
                "explanation": "C++ uses + for numeric addition."
            },
            {
                "title": "Vector Size",
                "description": "Complete the function to return vector length",
                "starter_code": "#include <vector>\nint getSize(std::vector<int> nums) {\n    return nums.___();\n}",
                "blanks": ["size"],
                "solution": "#include <vector>\nint getSize(std::vector<int> nums) {\n    return nums.size();\n}",
                "test_cases": [{"input": "[1,2,3]", "expected": "3"}],
                "hints": ["Use vector member function"],
                "explanation": "std::vector::size() returns item count."
            },
            {
                "title": "For Loop Output",
                "description": "Complete loop header to print 0, 1, 2",
                "starter_code": "#include <iostream>\nint main() {\n    for (int i = 0; i ___ 3; i++) {\n        std::cout << i << std::endl;\n    }\n    return 0;\n}",
                "blanks": ["<"],
                "solution": "#include <iostream>\nint main() {\n    for (int i = 0; i < 3; i++) {\n        std::cout << i << std::endl;\n    }\n    return 0;\n}",
                "test_cases": [{"input": "", "expected": "0\n1\n2"}],
                "hints": ["The loop should stop before 3"],
                "explanation": "Use i < 3 to generate 0,1,2."
            },
        ],
        "javascript": [
            {
                "title": "Add Function",
                "description": "Complete the function to add two numbers",
                "starter_code": "function add(a, b) {\n  return a ___ b;\n}",
                "blanks": ["+"],
                "solution": "function add(a, b) {\n  return a + b;\n}",
                "test_cases": [{"input": "2, 3", "expected": "5"}],
                "hints": ["Use + operator"],
                "explanation": "JavaScript adds numbers with +."
            },
            {
                "title": "Array Length",
                "description": "Complete code to return array length",
                "starter_code": "function getLength(arr) {\n  return arr.___;\n}",
                "blanks": ["length"],
                "solution": "function getLength(arr) {\n  return arr.length;\n}",
                "test_cases": [{"input": "[1,2,3]", "expected": "3"}],
                "hints": ["Array property, not function"],
                "explanation": "Array length is exposed by length property."
            },
            {
                "title": "Loop Print",
                "description": "Complete loop condition to print 0..2",
                "starter_code": "for (let i = 0; i ___ 3; i++) {\n  console.log(i);\n}",
                "blanks": ["<"],
                "solution": "for (let i = 0; i < 3; i++) {\n  console.log(i);\n}",
                "test_cases": [{"input": "", "expected": "0\n1\n2"}],
                "hints": ["The condition should allow 0,1,2"],
                "explanation": "i < 3 iterates three times."
            },
        ],
        "java": [
            {
                "title": "Add Method",
                "description": "Complete method to add two integers",
                "starter_code": "public static int add(int a, int b) {\n    return a ___ b;\n}",
                "blanks": ["+"],
                "solution": "public static int add(int a, int b) {\n    return a + b;\n}",
                "test_cases": [{"input": "2, 3", "expected": "5"}],
                "hints": ["Use arithmetic operator"],
                "explanation": "Integer addition in Java uses +."
            },
            {
                "title": "Array Length",
                "description": "Complete method to return array length",
                "starter_code": "public static int getLength(int[] arr) {\n    return arr.___;\n}",
                "blanks": ["length"],
                "solution": "public static int getLength(int[] arr) {\n    return arr.length;\n}",
                "test_cases": [{"input": "[1,2,3]", "expected": "3"}],
                "hints": ["Array length is a field"],
                "explanation": "Use arr.length for Java arrays."
            },
            {
                "title": "Loop Condition",
                "description": "Complete the loop condition to print 0..2",
                "starter_code": "for (int i = 0; i ___ 3; i++) {\n    System.out.println(i);\n}",
                "blanks": ["<"],
                "solution": "for (int i = 0; i < 3; i++) {\n    System.out.println(i);\n}",
                "test_cases": [{"input": "", "expected": "0\n1\n2"}],
                "hints": ["Stop before 3"],
                "explanation": "i < 3 gives values 0, 1, 2."
            },
        ],
        "c#": [
            {
                "title": "Add Method",
                "description": "Complete method to add two integers",
                "starter_code": "public static int Add(int a, int b) {\n    return a ___ b;\n}",
                "blanks": ["+"],
                "solution": "public static int Add(int a, int b) {\n    return a + b;\n}",
                "test_cases": [{"input": "2, 3", "expected": "5"}],
                "hints": ["Use + operator"],
                "explanation": "C# uses + for integer addition."
            },
            {
                "title": "List Count",
                "description": "Complete method to get list size",
                "starter_code": "using System.Collections.Generic;\npublic static int GetCount(List<int> nums) {\n    return nums.___;\n}",
                "blanks": ["Count"],
                "solution": "using System.Collections.Generic;\npublic static int GetCount(List<int> nums) {\n    return nums.Count;\n}",
                "test_cases": [{"input": "[1,2,3]", "expected": "3"}],
                "hints": ["List<T> exposes Count property"],
                "explanation": "Count returns number of items in List<T>."
            },
            {
                "title": "Loop Condition",
                "description": "Complete the loop condition to print 0..2",
                "starter_code": "for (int i = 0; i ___ 3; i++) {\n    Console.WriteLine(i);\n}",
                "blanks": ["<"],
                "solution": "for (int i = 0; i < 3; i++) {\n    Console.WriteLine(i);\n}",
                "test_cases": [{"input": "", "expected": "0\n1\n2"}],
                "hints": ["Allow i values 0,1,2"],
                "explanation": "Use less-than to stop before 3."
            },
        ],
        "rust": [
            {
                "title": "Add Function",
                "description": "Complete function to add two integers",
                "starter_code": "fn add(a: i32, b: i32) -> i32 {\n    a ___ b\n}",
                "blanks": ["+"],
                "solution": "fn add(a: i32, b: i32) -> i32 {\n    a + b\n}",
                "test_cases": [{"input": "2, 3", "expected": "5"}],
                "hints": ["Use + expression"],
                "explanation": "Rust expressions can be returned without semicolon."
            },
            {
                "title": "Vector Length",
                "description": "Complete function to return vector length",
                "starter_code": "fn get_len(nums: Vec<i32>) -> usize {\n    nums.___()\n}",
                "blanks": ["len"],
                "solution": "fn get_len(nums: Vec<i32>) -> usize {\n    nums.len()\n}",
                "test_cases": [{"input": "[1,2,3]", "expected": "3"}],
                "hints": ["Use Vec method for size"],
                "explanation": "Vec::len returns number of elements."
            },
            {
                "title": "Range Loop",
                "description": "Complete range syntax to print 0..2",
                "starter_code": "for i in 0___3 {\n    println!(\"{}\", i);\n}",
                "blanks": [".."],
                "solution": "for i in 0..3 {\n    println!(\"{}\", i);\n}",
                "test_cases": [{"input": "", "expected": "0\n1\n2"}],
                "hints": ["Exclusive upper-bound range"],
                "explanation": "0..3 iterates over 0,1,2."
            },
        ],
    }

    selected_templates = templates.get(lang, templates["python"])
    exercises = []
    for idx, template in enumerate(selected_templates, start=1):
        exercises.append({
            "id": idx,
            "type": "complete_code",
            **template,
        })

    return {
        "level": 2,
        "level_name": "Complete the Code",
        "chapter": chapter,
        "topic": lang,
        "exercises": exercises,
        "passing_score": 60,
        "time_limit_minutes": 15,
    }


def get_fallback_level3(topic: str, chapter: str, language: str) -> Dict:
    """Fallback Level 3 exercises with language-specific coding tasks."""
    lang = normalize_topic(language or topic)

    templates = {
        "python": [
            {
                "title": "Double Numbers",
                "description": "Write a function 'double' that takes a number and returns it doubled",
                "requirements": [
                    "Function named 'double'",
                    "Takes one parameter",
                    "Returns the number multiplied by 2"
                ],
                "example_input": "5",
                "example_output": "10",
                "test_cases": [{"input": "5", "expected": "10"}, {"input": "0", "expected": "0"}],
                "hints": ["Multiply by 2"],
                "solution": "def double(n):\n    return n * 2",
                "difficulty": "easy"
            },
            {
                "title": "Find Maximum",
                "description": "Write a function 'find_max' that finds the largest number in a list",
                "requirements": [
                    "Function named 'find_max'",
                    "Takes a list parameter",
                    "Returns the largest number"
                ],
                "example_input": "[1, 5, 3]",
                "example_output": "5",
                "test_cases": [{"input": "[1, 5, 3]", "expected": "5"}, {"input": "[10]", "expected": "10"}],
                "hints": ["You can use max() or loop through"],
                "solution": "def find_max(lst):\n    return max(lst)",
                "difficulty": "medium"
            },
        ],
        "c++": [
            {
                "title": "Double Number Function",
                "description": "Write a function named doubleValue that returns input multiplied by 2",
                "requirements": [
                    "Function named 'doubleValue'",
                    "Accepts one integer parameter",
                    "Returns parameter * 2"
                ],
                "example_input": "5",
                "example_output": "10",
                "test_cases": [{"input": "5", "expected": "10"}, {"input": "0", "expected": "0"}],
                "hints": ["Use integer multiplication"],
                "solution": "int doubleValue(int n) {\n    return n * 2;\n}",
                "difficulty": "easy"
            },
            {
                "title": "Maximum of Vector",
                "description": "Write a function findMax that returns the largest value from a vector<int>",
                "requirements": [
                    "Function named 'findMax'",
                    "Accepts std::vector<int>",
                    "Returns largest integer in vector"
                ],
                "example_input": "[1, 5, 3]",
                "example_output": "5",
                "test_cases": [{"input": "[1, 5, 3]", "expected": "5"}, {"input": "[10]", "expected": "10"}],
                "hints": ["Track current best while iterating"],
                "solution": "#include <vector>\nint findMax(std::vector<int> nums) {\n    int best = nums[0];\n    for (int n : nums) if (n > best) best = n;\n    return best;\n}",
                "difficulty": "medium"
            },
        ],
        "javascript": [
            {
                "title": "Double Number",
                "description": "Write function doubleValue that returns n * 2",
                "requirements": [
                    "Function named 'doubleValue'",
                    "One numeric argument",
                    "Return argument multiplied by 2"
                ],
                "example_input": "5",
                "example_output": "10",
                "test_cases": [{"input": "5", "expected": "10"}, {"input": "0", "expected": "0"}],
                "hints": ["Return expression directly"],
                "solution": "function doubleValue(n) {\n  return n * 2;\n}",
                "difficulty": "easy"
            },
            {
                "title": "Array Maximum",
                "description": "Write function findMax that returns largest number in array",
                "requirements": [
                    "Function named 'findMax'",
                    "One array parameter",
                    "Return maximum element"
                ],
                "example_input": "[1, 5, 3]",
                "example_output": "5",
                "test_cases": [{"input": "[1, 5, 3]", "expected": "5"}, {"input": "[10]", "expected": "10"}],
                "hints": ["Use loop or Math.max"],
                "solution": "function findMax(arr) {\n  return Math.max(...arr);\n}",
                "difficulty": "medium"
            },
        ],
        "java": [
            {
                "title": "Double Number Method",
                "description": "Write method doubleValue that returns n * 2",
                "requirements": [
                    "Method named 'doubleValue'",
                    "One int parameter",
                    "Return value multiplied by 2"
                ],
                "example_input": "5",
                "example_output": "10",
                "test_cases": [{"input": "5", "expected": "10"}, {"input": "0", "expected": "0"}],
                "hints": ["Return n * 2"],
                "solution": "public static int doubleValue(int n) {\n    return n * 2;\n}",
                "difficulty": "easy"
            },
            {
                "title": "Array Maximum Method",
                "description": "Write method findMax that returns largest value in int[]",
                "requirements": [
                    "Method named 'findMax'",
                    "One int[] parameter",
                    "Return maximum element"
                ],
                "example_input": "[1, 5, 3]",
                "example_output": "5",
                "test_cases": [{"input": "[1, 5, 3]", "expected": "5"}, {"input": "[10]", "expected": "10"}],
                "hints": ["Loop through array while tracking max"],
                "solution": "public static int findMax(int[] arr) {\n    int best = arr[0];\n    for (int n : arr) if (n > best) best = n;\n    return best;\n}",
                "difficulty": "medium"
            },
        ],
        "c#": [
            {
                "title": "Double Number Method",
                "description": "Write method DoubleValue that returns n * 2",
                "requirements": [
                    "Method named 'DoubleValue'",
                    "One int parameter",
                    "Return value multiplied by 2"
                ],
                "example_input": "5",
                "example_output": "10",
                "test_cases": [{"input": "5", "expected": "10"}, {"input": "0", "expected": "0"}],
                "hints": ["Use arithmetic expression"],
                "solution": "public static int DoubleValue(int n) {\n    return n * 2;\n}",
                "difficulty": "easy"
            },
            {
                "title": "Array Maximum Method",
                "description": "Write method FindMax that returns largest value in int[]",
                "requirements": [
                    "Method named 'FindMax'",
                    "One int[] parameter",
                    "Return largest element"
                ],
                "example_input": "[1, 5, 3]",
                "example_output": "5",
                "test_cases": [{"input": "[1, 5, 3]", "expected": "5"}, {"input": "[10]", "expected": "10"}],
                "hints": ["Track maximum while iterating"],
                "solution": "public static int FindMax(int[] arr) {\n    int best = arr[0];\n    foreach (var n in arr) if (n > best) best = n;\n    return best;\n}",
                "difficulty": "medium"
            },
        ],
        "rust": [
            {
                "title": "Double Number Function",
                "description": "Write function double_value that returns n * 2",
                "requirements": [
                    "Function named 'double_value'",
                    "One i32 parameter",
                    "Return parameter multiplied by 2"
                ],
                "example_input": "5",
                "example_output": "10",
                "test_cases": [{"input": "5", "expected": "10"}, {"input": "0", "expected": "0"}],
                "hints": ["Return n * 2 as final expression"],
                "solution": "fn double_value(n: i32) -> i32 {\n    n * 2\n}",
                "difficulty": "easy"
            },
            {
                "title": "Vector Maximum Function",
                "description": "Write function find_max that returns largest value in Vec<i32>",
                "requirements": [
                    "Function named 'find_max'",
                    "One Vec<i32> parameter",
                    "Return largest element"
                ],
                "example_input": "[1, 5, 3]",
                "example_output": "5",
                "test_cases": [{"input": "[1, 5, 3]", "expected": "5"}, {"input": "[10]", "expected": "10"}],
                "hints": ["Iterate with for and track best"],
                "solution": "fn find_max(nums: Vec<i32>) -> i32 {\n    let mut best = nums[0];\n    for n in nums { if n > best { best = n; } }\n    best\n}",
                "difficulty": "medium"
            },
        ],
    }

    selected_templates = templates.get(lang, templates["python"])
    exercises = []
    for idx, template in enumerate(selected_templates, start=1):
        exercises.append({
            "id": idx,
            "type": "write_code",
            **template,
        })

    return {
        "level": 3,
        "level_name": "Write Code",
        "chapter": chapter,
        "topic": lang,
        "exercises": exercises,
        "passing_score": 50,
        "time_limit_minutes": 25,
    }


# ==================== ADAPTIVE PATH INTELLIGENCE ====================

async def generate_adaptive_path_update(
    topic: str,
    language: str,
    current_chapters: List[str],
    chapter_performance: List[Dict],
    overall_accuracy: float,
    struggling_areas: List[str],
    strong_areas: List[str],
) -> Optional[Dict]:
    """
    AI-powered adaptive path update.
    Analyzes full student performance and regenerates/adapts the learning path:
    - Adds remediation chapters for weak areas
    - Skips or condenses mastered material
    - Reorders for optimal learning flow
    - Adjusts difficulty level
    """

    performance_summary = json.dumps(chapter_performance, indent=2)

    prompt = f"""You are an adaptive learning AI. A student is learning "{topic}".

CURRENT CHAPTERS (in order):
{json.dumps(current_chapters, indent=2)}

DETAILED CHAPTER PERFORMANCE:
{performance_summary}

OVERALL STATS:
- Overall Accuracy: {overall_accuracy}%
- Struggling Areas: {json.dumps(struggling_areas)}
- Strong Areas: {json.dumps(strong_areas)}

TASK: Adapt this learning path based on the student's performance.

Rules:
1. If a student is struggling (accuracy < 50%) in a chapter, ADD a remediation/review chapter BEFORE the next topic. The remediation chapter should break down the difficult concepts further.
2. If a student has mastered a chapter (accuracy > 85%), you may CONDENSE or SKIP similar subsequent chapters.
3. Keep chapters the student hasn't started yet, but reorder if needed for better learning flow.
4. Add bridging chapters if there are knowledge gaps.
5. Always maintain logical progression.
6. Keep completed chapters in the list (mark them) — don't remove progress.

Return JSON:
{{
    "chapters": [
        {{
            "id": 1,
            "title": "Chapter Title",
            "description": "What you'll learn",
            "estimated_hours": 3,
            "is_remediation": false,
            "subchapters": [
                {{
                    "title": "Subtopic",
                    "objectives": ["Learn X"],
                    "resources": {{
                        "youtube_search": "search term",
                        "documentation": "url or description",
                        "practice": "exercise description"
                    }}
                }}
            ]
        }}
    ],
    "adaptation_reason": "Why the path was changed",
    "focus_areas": ["Area 1 the student should focus on"],
    "tips": ["Personalized tip based on performance"]
}}

Generate the adapted path (aim for 6-10 chapters total):"""

    messages = [
        {"role": "system", "content": "You are an expert adaptive learning AI that personalizes curricula based on student performance data. Always return valid JSON."},
        {"role": "user", "content": prompt}
    ]

    response = await call_groq_api(messages, temperature=0.7, max_tokens=4000)
    data = parse_json_response(response)

    if data and "chapters" in data:
        return data
    return None


async def generate_dynamic_recommendations(
    topics: List[str],
    overall_accuracy: float,
    total_exercises: int,
    struggling_chapters: List[str],
    completed_chapters: int,
    total_chapters: int,
) -> List[Dict]:
    """
    Generate personalized AI recommendations for the student
    based on their full learning history.
    """

    prompt = f"""You are a learning coach AI. Generate personalized recommendations for a student.

STUDENT PROFILE:
- Topics being studied: {json.dumps(topics)}
- Overall Accuracy: {overall_accuracy}%
- Total Exercises Completed: {total_exercises}
- Chapters Completed: {completed_chapters}/{total_chapters}
- Struggling Chapters: {json.dumps(struggling_chapters)}

Generate 3-5 specific, actionable recommendations. Each should have a type, title, description, and priority.

Types: "practice" (do more exercises), "review" (revisit material), "advance" (move to next topic), "explore" (try new related topic), "break" (take a rest)

Return JSON array:
[
    {{
        "type": "practice",
        "title": "Short action title",
        "description": "Detailed recommendation (2-3 sentences)",
        "priority": "high"
    }}
]

Generate recommendations:"""

    messages = [
        {"role": "system", "content": "You are a supportive, encouraging learning coach. Give specific, actionable advice. Always return a valid JSON array."},
        {"role": "user", "content": prompt}
    ]

    response = await call_groq_api(messages, temperature=0.7, max_tokens=1500)
    data = parse_json_response(response)

    if isinstance(data, list) and len(data) > 0:
        return data

    # Fallback recommendations
    recs = []
    if overall_accuracy < 50:
        recs.append({
            "type": "review",
            "title": "Review Fundamentals",
            "description": f"Your accuracy is {overall_accuracy}%. Revisit the basics and focus on understanding core concepts before moving forward.",
            "priority": "high"
        })
    if struggling_chapters:
        recs.append({
            "type": "practice",
            "title": f"Practice: {struggling_chapters[0]}",
            "description": f"You're finding \"{struggling_chapters[0]}\" challenging. Try the exercises again — repetition builds mastery!",
            "priority": "high"
        })
    if total_exercises < 10:
        recs.append({
            "type": "practice",
            "title": "Build Momentum",
            "description": "You've only done a few exercises. The more you practice, the faster you'll learn. Try completing at least 10 exercises today!",
            "priority": "medium"
        })
    if overall_accuracy > 80 and completed_chapters < total_chapters:
        recs.append({
            "type": "advance",
            "title": "Ready to Advance!",
            "description": f"Great accuracy of {overall_accuracy}%! You're ready to move to the next chapter. Keep up the momentum!",
            "priority": "high"
        })
    if not recs:
        recs.append({
            "type": "practice",
            "title": "Keep Learning!",
            "description": "Continue working through your learning path. Consistency is key to mastering any subject.",
            "priority": "medium"
        })

    return recs
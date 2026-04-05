"""
Content API - AI-generated notes and YouTube video recommendations
Uses Groq API as primary AI provider, with Ollama as fallback.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import os
import json
import re

from app.services.ai_service import call_groq_api, parse_json_response
from app.services.ai_service import normalize_topic
from app.core.config import settings

router = APIRouter(prefix="/content", tags=["content"])


class ContentRequest(BaseModel):
    topic: str
    chapter_title: str | None = None
    learning_level: int | None = None
    variation_seed: str | None = None


class NotesResponse(BaseModel):
    topic: str
    summary: str
    key_points: list[str]
    next_chapter_preview: str
    youtube_videos: list[dict]


def generate_static_fallback(topic: str, chapter_title: str, learning_level: int = 1) -> dict:
    """Generate a chapter-aware fallback when external AI providers are unavailable."""
    topic_clean = (topic or "programming").strip()
    chapter_clean = (chapter_title or topic_clean).strip()
    topic_lower = topic_clean.lower()
    chapter_lower = chapter_clean.lower()

    if topic_lower == "python" and (
        "getting started" in chapter_lower or "introduction" in chapter_lower or "basics" in chapter_lower
    ):
        if learning_level == 2:
            return {
                "summary": (
                    "This level deepens Python fundamentals by focusing on code completion and reasoning through execution flow. "
                    "You should be comfortable filling missing parts in functions, loops, and conditionals while preserving correct syntax and indentation. "
                    "The goal is to move from recognition to active construction of Python code."
                ),
                "key_points": [
                    "Complete missing function bodies using correct Python indentation",
                    "Use if/elif/else blocks correctly when filling logical branches",
                    "Apply for/range patterns without off-by-one mistakes",
                    "Initialize accumulators and update variables predictably in loops",
                    "Choose the right built-ins for completion tasks: len, sum, max, min",
                    "Validate partial code quickly by testing small input samples",
                    "Avoid shadowing built-ins like list, dict, str in starter code",
                    "Read error traces line-by-line to locate missing symbols or syntax"
                ],
                "next_chapter_preview": (
                    "Next you will move into full-code writing tasks where you design complete solutions "
                    "instead of filling placeholders."
                )
            }
        if learning_level >= 3:
            return {
                "summary": (
                    "This level transitions from guided completion to writing full Python solutions. "
                    "You should focus on decomposition, edge-case handling, and validating correctness with test cases. "
                    "Expect to combine multiple fundamentals into coherent, readable functions."
                ),
                "key_points": [
                    "Break each problem into input handling, logic, and return/output sections",
                    "Handle edge cases first (empty values, zero, negatives, boundary sizes)",
                    "Use meaningful function and variable names for maintainability",
                    "Prefer simple, readable control flow over clever one-liners",
                    "Validate outputs against sample tests before final submission",
                    "Add defensive checks where assumptions may fail",
                    "Refactor repeated code into helpers once correctness is confirmed",
                    "Compare time complexity of alternate approaches for scalability"
                ],
                "next_chapter_preview": (
                    "Next chapter challenges you with broader problem-solving patterns and more complex "
                    "data manipulation tasks in Python."
                )
            }
        return {
            "summary": (
                "This chapter introduces Python setup and first-program workflow. "
                "You start by verifying Python installation, running code in the REPL, and writing basic scripts. "
                "It also covers Python syntax rules like indentation, variable assignment, and common beginner mistakes that cause runtime errors."
            ),
            "key_points": [
                "Install Python 3 and verify setup with: python --version",
                "Use the Python REPL for quick experiments before writing full scripts",
                "Create a first script with print('Hello, World!') and run it from terminal",
                "Understand core data types: str, int, float, bool",
                "Use input() and print() for basic interaction and output formatting",
                "Python indentation is syntax, not style; inconsistent spaces cause errors",
                "Use clear variable names and avoid reusing built-in names like list or str",
                "Debug early with small test cases and explicit print checks"
            ],
            "next_chapter_preview": (
                "Next you will apply these basics to control flow and functions, "
                "so you can write reusable Python logic instead of one-off statements."
            )
        }

    return {
        "summary": (
            f"This chapter covers {chapter_clean} in {topic_clean}. "
            f"It focuses on practical understanding, syntax-level usage, and common mistakes. "
            f"Mastering {chapter_clean} will make later {topic_clean} topics easier to learn and debug."
        ),
        "key_points": [
            f"Define what {chapter_clean} means in {topic_clean} and where it is commonly used",
            f"Learn syntax and core rules you must follow when using {chapter_clean}",
            f"Use at least one real coding example related to {chapter_clean}",
            "Identify common runtime or logic errors and how to fix them quickly",
            "Apply best practices that improve readability and maintainability",
            "Compare beginner approach vs production-friendly approach",
            "Practice with short exercises that mirror real tasks",
            "Review outputs and edge cases to confirm understanding"
        ],
        "next_chapter_preview": (
            f"Next, you will build on {chapter_clean} with deeper implementation patterns "
            "and hands-on coding exercises."
        )
    }


def generate_youtube_video_links(topic: str, chapter_title: str | None = None, learning_level: int = 1) -> list[dict]:
    """Fetch real YouTube video URLs using chapter-aware query terms."""
    level_hint = {
        1: "beginner fundamentals",
        2: "intermediate practice",
        3: "advanced exercises"
    }.get(learning_level, "practice")
    search_topic = f"{topic} {chapter_title} {level_hint}".strip() if chapter_title else f"{topic} {level_hint}"
    try:
        from app.services.video_service import search_youtube_links
        results = search_youtube_links(f"{search_topic} tutorial", max_results=3)
        videos = []
        for r in results:
            url = r.get("link", "")
            title = r.get("title", f"{search_topic} Video")
            videos.append({
                "title": title,
                "url": url,
                "type": "video",
                "thumbnail": r.get("thumbnail", "")
            })
        if videos:
            return videos
    except Exception as e:
        print(f"YouTube search failed: {e}")

    # Fallback: return search result URLs if youtubesearchpython fails
    search_query = f"{search_topic} tutorial programming"
    return [
        {
            "title": f"📺 {search_topic} - Full Tutorial",
            "url": f"https://www.youtube.com/results?search_query={search_query.replace(' ', '+')}",
            "type": "video"
        },
        {
            "title": f"📖 {search_topic} - Concepts Explained",
            "url": f"https://www.youtube.com/results?search_query={search_topic.replace(' ', '+')}+explained+programming",
            "type": "video"
        },
        {
            "title": f"💻 {search_topic} - Examples & Practice",
            "url": f"https://www.youtube.com/results?search_query={search_topic.replace(' ', '+')}+examples+code+practice",
            "type": "video"
        }
    ]


@router.post("/generate-notes", response_model=NotesResponse)
async def generate_notes(request: ContentRequest):
    """Generate AI-powered notes and YouTube recommendations for a topic.
    Uses Groq API as primary, Ollama as fallback."""
    
    topic = normalize_topic(request.topic)
    chapter_title = request.chapter_title or topic
    learning_level = request.learning_level or 1
    variation_seed = request.variation_seed or "default"
    if learning_level < 1:
        learning_level = 1
    if learning_level > 3:
        learning_level = 3

    level_guidance = {
        1: "Beginner depth: fundamentals, syntax basics, and first-step practical use.",
        2: "Intermediate depth: code completion patterns, flow tracing, and common implementation mistakes.",
        3: "Advanced depth: full-code writing strategy, edge cases, optimization, and robust debugging."
    }[learning_level]
    
    prompt = f"""Generate DETAILED and SPECIFIC educational notes for the programming topic: "{topic}" (Chapter: {chapter_title}).
Target learning level: {learning_level}
Level guidance: {level_guidance}
Variation seed: {variation_seed}

IMPORTANT: Do NOT write broad/generic content. Be SPECIFIC with:
- Exact syntax and code examples
- Step-by-step explanations of how things work internally
- Common pitfalls and debugging tips
- Real-world use cases
- Ensure this response is fresh and phrased differently from past attempts while staying technically accurate

Return ONLY a JSON object with this exact structure:
{{
    "summary": "A detailed 3-4 paragraph technical explanation covering: what this concept is, how it works under the hood, when to use it, and how it connects to other concepts. Include specific terminology and technical details.",
    "key_points": [
        "Detailed point 1 with specific syntax or code snippet",
        "Detailed point 2 explaining a specific behavior or rule",
        "Detailed point 3 with a practical example",
        "Detailed point 4 covering edge cases or gotchas",
        "Detailed point 5 with best practices",
        "Detailed point 6 comparing with alternatives",
        "Detailed point 7 with a real-world use case",
        "Detailed point 8 with debugging/troubleshooting tip"
    ],
    "next_chapter_preview": "Specific preview of what to learn next and how it builds on this topic"
}}

Be technical, specific, and educational. Include code snippets inline where helpful.
Return ONLY the JSON, no other text."""

    parsed = None
    
    # PRIMARY: Try Groq API
    try:
        messages = [
            {"role": "system", "content": "You are an expert programming instructor creating detailed educational notes. Always return valid JSON only, no markdown code blocks, no extra text."},
            {"role": "user", "content": prompt}
        ]
        response = await call_groq_api(messages, temperature=0.7, max_tokens=2500)
        if response:
            parsed = parse_json_response(response)
            if parsed:
                print(f"✅ Notes generated via Groq API for '{topic}'")
    except Exception as e:
        print(f"⚠️ Groq API failed for notes generation: {e}")
    
    # FALLBACK: Try Ollama if Groq failed
    if not parsed:
        try:
            ollama_url = settings.OLLAMA_API_URL.replace("/api/generate", "")
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": settings.OLLAMA_MODEL,
                        "prompt": f"/no_think\n{prompt}",
                        "stream": False,
                        "options": {"temperature": 0.7}
                    }
                )
                if response.status_code == 200:
                    result = response.json()
                    ai_text = result.get("response", "")
                    parsed = parse_json_response(ai_text)
                    if parsed:
                        print(f"✅ Notes generated via Ollama for '{topic}'")
        except Exception as e:
            print(f"⚠️ Ollama also failed for notes: {e}")
    
    # LAST RESORT: Static fallback content
    if not parsed:
        print(f"⚠️ Using static fallback notes for '{topic}'")
        parsed = generate_static_fallback(topic, chapter_title, learning_level)
    
    # Generate YouTube video links
    youtube_videos = generate_youtube_video_links(topic, chapter_title, learning_level)
    
    return NotesResponse(
        topic=topic,
        summary=parsed.get("summary", f"Introduction to {topic}"),
        key_points=parsed.get("key_points", []),
        next_chapter_preview=parsed.get("next_chapter_preview", "Continue to the next chapter"),
        youtube_videos=youtube_videos
    )


@router.get("/youtube-recommendations/{topic}")
async def get_youtube_recommendations(topic: str):
    """Get YouTube video recommendations for a topic."""
    return {
        "topic": topic,
        "videos": generate_youtube_video_links(topic)
    }

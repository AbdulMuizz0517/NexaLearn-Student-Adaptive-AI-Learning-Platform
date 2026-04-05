from typing import Any, List, Optional

from pydantic import BaseModel


class ChapterSchema(BaseModel):
    title: str
    subchapters: List[str]


class PathContent(BaseModel):
    title: str
    chapters: List[ChapterSchema]


class PathResponse(BaseModel):
    id: int
    user_id: int
    topic: str
    generated_content: Any  # JSON content from AI

    class Config:
        from_attributes = True

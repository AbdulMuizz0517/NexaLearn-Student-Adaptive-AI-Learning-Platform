from sqlalchemy import Column, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String)
    generated_content = Column(JSON)

    user = relationship("User")

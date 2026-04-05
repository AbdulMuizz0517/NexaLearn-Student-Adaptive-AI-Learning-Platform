from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base

# 1. IMPORT ROUTERS
from app.api.v1 import auth, learning_path, quiz, content, progress, admin, feedback

# Import models to ensure they're registered
from app.models import user, curriculum, quiz as quiz_model, progress as progress_model, feedback as feedback_model, quiz_profile as quiz_profile_model

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NexaLearn API")

# 2. CORS (Allow Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "NexaLearn Backend is Running"}


# 3. REGISTER ROUTERS (This fixes the "Not Found" error)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(learning_path.router, prefix="/api/v1/path", tags=["Learning Path"])
app.include_router(quiz.router, prefix="/api/v1/quiz", tags=["Quiz"])
app.include_router(content.router, prefix="/api/v1", tags=["Content"])
app.include_router(progress.router, prefix="/api/v1/progress", tags=["Progress"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(feedback.router, prefix="/api/v1/feedback", tags=["Feedback"])

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./nexalearn.db"
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # AI Configuration - Groq API (free, fast, Llama 3.1 70B)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-70b-versatile"
    
    # Fallback to Ollama if Groq not configured
    OLLAMA_MODEL: str = "qwen3:0.6b"
    OLLAMA_API_URL: str = "http://127.0.0.1:11434/api/generate"

    class Config:
        env_file = (".env", "server/.env")
        env_file_encoding = "utf-8"


settings = Settings()

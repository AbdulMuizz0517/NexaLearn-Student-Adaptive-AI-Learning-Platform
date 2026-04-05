# NexaLearn

NexaLearn is a full-stack AI-assisted learning platform for programming practice.
It includes:

- A React + Vite frontend for students and admins
- A FastAPI backend with adaptive learning and progress tracking
- Optional PostgreSQL via Docker Compose (SQLite works out of the box)

## Highlights

- Role-aware flows (student and admin)
- Quiz-based learning path generation
- Chapter progression with 3-level practice model
- AI-generated notes and video recommendations
- Runtime-backed code evaluation flow (Python path)
- Admin dashboard, flagged students, and reporting overview
- Password change flow and custom login error modal

## Tech Stack

Frontend:

- React 18
- TypeScript
- Vite
- Axios
- Radix UI + utility components

Backend:

- FastAPI
- SQLAlchemy
- Pydantic / pydantic-settings
- Uvicorn
- bcrypt + JWT auth

Data / Infra:

- SQLite by default
- PostgreSQL 16 via Docker Compose (optional)

## Project Structure

.
|- client/      React + Vite app
|- server/      FastAPI app
|- docker-compose.yml

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Python 3.10+
- pip
- Optional: Docker Desktop (for PostgreSQL)

### 2. Clone and enter project

git clone <your-repo-url>
cd export_project

### 3. Backend setup

cd server
python -m venv .venv

Windows:
.venv\Scripts\activate

macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

Run backend:

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Backend health check:

http://127.0.0.1:8000/

### 4. Frontend setup

In a new terminal:

cd client
npm install
npm run dev

Frontend URL:

http://localhost:3000/

## Environment Configuration

### Backend (.env)

The backend reads env values from .env or server/.env.

Common settings:

- DATABASE_URL (default sqlite:///./nexalearn.db)
- SECRET_KEY
- ALGORITHM (default HS256)
- ACCESS_TOKEN_EXPIRE_MINUTES
- GROQ_API_KEY (optional, for AI features)
- GROQ_MODEL
- OLLAMA_MODEL
- OLLAMA_API_URL

PostgreSQL example is available in:

- server/.env.postgres.example

### Frontend (.env)

The frontend API client uses:

- VITE_API_BASE_URL

Example:

VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1

Note: client/.env.example currently contains VITE_API_URL, but the active key used by the client code is VITE_API_BASE_URL.

## Optional: PostgreSQL with Docker

From repository root:

docker compose up -d

Then set DATABASE_URL in backend env to:

postgresql+psycopg2://nexalearn:nexalearn@localhost:5432/nexalearn

## Core API Prefixes

Backend base:

- /api/v1

Main route groups:

- /api/v1/auth
- /api/v1/path
- /api/v1/quiz
- /api/v1/content
- /api/v1/progress
- /api/v1/admin
- /api/v1/feedback

## Build and Production Notes

Frontend production build:

cd client
npm run build

Backend can run without Docker using SQLite. For production, prefer PostgreSQL and secure environment variables.

## Troubleshooting

- If docker command is not found, run with SQLite first (default) and skip docker-compose.
- If frontend cannot reach backend, verify VITE_API_BASE_URL and backend port 8000.
- If login/session issues appear, clear browser local storage and sign in again.
- If AI generation fails, app fallbacks are used, but set GROQ_API_KEY for best results.

## Credits

- UI source inspiration: NexaLearn Figma design bundle
- Built and extended as a full-stack application with adaptive learning features

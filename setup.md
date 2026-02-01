# Project Yukti - Setup & Run Guide

## Prerequisites
- **Node.js** (v18+)
- **Python** (v3.11+)
- **Git**

## Quick Start

### 1. Frontend (Next.js)
The frontend is built with Next.js 15 and Tailwind CSS.

```bash
# Navigate to web app
cd apps/web

# Install dependencies (first time only)
npm install

# Start Development Server
npm run dev
```
> Access at: `http://localhost:3000`

### 2. Backend AI Engine (FastAPI)
The backend provides AI signals and market data.

```bash
# Navigate to ai-engine
cd apps/ai-engine

# Create Virtual Environment (first time only)
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Dependencies (first time only)
pip install -r requirements.txt

# Start API Server
uvicorn main:app --reload --port 8000
```
> Access Docs at: `http://localhost:8000/docs`

## Environment Variables
Create a `.env.local` file in `apps/web` if needed for Firebase config (currently hardcoded or using public constants).

### Firebase Config
Ensure `apps/web/lib/firebase.ts` has valid configuration keys.

## Common Issues
- **Port Conflicts**: Ensure ports `3000` and `8000` are free.
- **CORS**: The backend is configured to allow requests from `localhost:3000`.

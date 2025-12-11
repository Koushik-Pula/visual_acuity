# Visual Acuity Test App

A modern web-based visual acuity testing system built using React + Vite on the frontend and Python on the backend. The app presents Landolt C optotypes, handles test progression logic, supports voice input, and communicates with a Python backend.

## Project Structure

```text
visual-acuity-app/
├── backend/
│   ├── app.py              # FastAPI backend server
│   └── requirements.txt    # Backend dependencies
├── src/
│   ├── App.jsx             # Main React entry
│   └── LandoltC.jsx        # Landolt C renderer
├── package.json            # Frontend dependencies
└── README.md
```


## Prerequisites

- Node.js (v16+)
- npm
- Python 3.8+ (3.10 is best)

# Getting Started

## 1. Clone the Repository

git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# Frontend Setup (React + Vite)

## Install Dependencies

npm install

## Start Development Server

npm run dev

Frontend runs at:
http://localhost:5173

# Backend Setup (Python)

cd backend

## (Optional) Create Virtual Environment

macOS / Linux:
python -m venv venv
source venv/bin/activate

Windows:
python -m venv venv
venv\Scripts\activate

## Install Backend Dependencies

pip install -r requirements.txt

## Run the Backend Server

FastAPI (if used):
uvicorn app:app --reload
Runs at: http://localhost:8000

# Running the Full System

Terminal 1 — Frontend:
npm run dev

Terminal 2 — Backend:
python backend/app.py

# Features

- Landolt C optotype rendering
- Level progression logic
- Voice-based response detection
- Test history tracking
- Real-time scaling based on screen size and distance
- Python backend for processing

# World Monitor

Real-time financial market monitoring & analytics platform (Crypto, Stocks, Gold/Silver, Forex).

## Structure
- `backend/` — FastAPI service: REST + WebSocket + SSE, pandas/scikit-learn analytics.
- `frontend/` — Next.js (React) + Tailwind dashboard (added in step 2).

## Run backend
```
cd backend
python -m venv .venv
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs
WebSocket: ws://localhost:8000/ws/market
SSE alerts: http://localhost:8000/sse/alerts


# Backend
cd D:\Data_Monitoring_Analytics_Application\backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# Frontend (terminal khác)
cd D:\Data_Monitoring_Analytics_Application\frontend
npm run dev
# World Monitor 🌍

Real-time financial market monitoring & analytics platform covering Crypto, Stocks, Gold/Silver, and Forex.

## 🏗️ Project Structure
- **backend/**: FastAPI service providing REST APIs, WebSocket streaming, and SSE alerts.
- **frontend/**: Next.js (React) dashboard with Plotly visualizations and Tailwind CSS.

---

## 🚀 Getting Started

### 1. Backend Setup
Open a terminal and run:
```bash
cd backend
python -m venv .venv

# Activate Virtual Environment
# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **WebSocket**: `ws://localhost:8000/ws/market`
- **SSE Alerts**: `http://localhost:8000/sse/alerts`

### 2. Frontend Setup
Open a **new terminal** and run:
```bash
cd frontend
npm install
npm run dev
```
- **Dashboard**: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tech Stack
- **Backend**: FastAPI, Pandas, Scikit-learn, Uvicorn.
- **Frontend**: Next.js, TypeScript, Tailwind CSS, Plotly.js, Lucide Icons.
- **State Management**: Zustand (Market & Portfolio stores).
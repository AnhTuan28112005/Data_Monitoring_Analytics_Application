# 🚀 Hướng Dẫn Chạy Ứng Dụng

> Đây là các lệnh đã được kiểm chứng để chạy thành công toàn bộ ứng dụng.

---

## ⚠️ Điều Kiện Tiên Quyết

1. **PostgreSQL** đã được cài đặt và đang chạy
2. Database `world_monitor_db` đã được tạo trong pgAdmin
3. **Python 3.x** và **Node.js** đã được cài đặt

---

## 📁 Bước 1: Tạo File `.env` (Chỉ làm 1 lần)

Tạo file `.env` trong thư mục `backend/` với nội dung sau:

```env
APP_NAME=World Monitor
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
CRYPTO_EXCHANGE=binance
PRICE_POLL_INTERVAL=5
OHLCV_POLL_INTERVAL=15
NEWS_POLL_INTERVAL=300
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DATABASE_URL=postgresql://postgres:123456@localhost:5432/world_monitor_db
```

> ⚠️ Thay `123456` bằng mật khẩu PostgreSQL thực tế của bạn nếu khác.

---

## 🔴 Bước 2: Chạy Backend (Terminal 1)

```powershell
cd d:\Data_Monitoring_Analytics_Application\backend

# Cài thư viện (chỉ lần đầu)
pip install -r requirements.txt

# Chạy server backend
python -m uvicorn main:app --reload
```

✅ Backend chạy tại: **http://localhost:8000**  
📖 API Docs tại: **http://localhost:8000/docs**

---

## 🟡 Bước 3: Nạp Dữ Liệu (Terminal 2 — Chỉ làm 1 lần)

```powershell
cd d:\Data_Monitoring_Analytics_Application\backend

# Nạp dữ liệu lịch sử BTC, ETH, AAPL, GOLD
$env:PYTHONIOENCODING="utf-8"; python scripts/backfill.py

# Kiểm tra chất lượng dữ liệu
$env:PYTHONIOENCODING="utf-8"; python scripts/data_quality.py
```

---

## 🔵 Bước 4: Chạy Frontend (Terminal 3)

```powershell
cd d:\Data_Monitoring_Analytics_Application\frontend

# Cài thư viện (chỉ lần đầu)
npm install

# Chạy server frontend
npm run dev
```

✅ Frontend chạy tại: **http://localhost:3000**

---

## ⚡ Lần Sau (Chạy Nhanh)

Khi đã setup xong, chỉ cần mở **2 terminal**:

**Terminal 1 — Backend:**
```powershell
cd d:\Data_Monitoring_Analytics_Application\backend
python -m uvicorn main:app --reload
```

**Terminal 2 — Frontend:**
```powershell
cd d:\Data_Monitoring_Analytics_Application\frontend
npm run dev
```

Sau đó mở trình duyệt: **http://localhost:3000**

---

## 🛠️ Xử Lý Lỗi Thường Gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|------------|---------|
| `uvicorn is not recognized` | uvicorn không có trong PATH | Dùng `python -m uvicorn` thay thế |
| `DATABASE_URL không tồn tại` | Chưa tạo file `.env` | Tạo file `.env` theo Bước 1 |
| `UnicodeEncodeError` | Windows không hỗ trợ emoji | Thêm `$env:PYTHONIOENCODING="utf-8";` trước lệnh |
| `EADDRINUSE: port 3000` | Port 3000 đang bị chiếm | Chạy `npx kill-port 3000` rồi `npm run dev` lại |
| `'next' is not recognized` | Chưa cài node_modules | Chạy `npm install` trong thư mục `frontend/` |

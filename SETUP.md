# 📘 HƯỚNG DẪN SETUP & SỬ DỤNG DỮ LIỆU  
**Người soạn:** Phạm Nguyễn Thế Khôi (Data Pipeline & Storage)

Chào anh em, để mọi người có thể sử dụng chung nguồn dữ liệu và chạy code đồng bộ trên PostgreSQL, làm theo đúng các bước sau nhé.

---

# 🛠 Bước 1: Cài đặt PostgreSQL & pgAdmin 4

## Cài đặt PostgreSQL
Tải PostgreSQL bản mới nhất (**v15 hoặc v16**) từ trang chủ PostgreSQL.

## ⚠️ Lưu ý mật khẩu
Trong quá trình cài đặt sẽ có bước đặt mật khẩu cho user `postgres`.
Tui khuyến khích anh em đặt 123456 với tui cho đồng bộ nha.
> Anh em phải nhớ mật khẩu này để điền vào file `.env`.

## pgAdmin 4
pgAdmin 4 là công cụ quản lý database trực quan, thường được cài kèm với PostgreSQL.

---

# 🗄 Bước 2: Tạo Database

Mở **pgAdmin 4**:

- Chuột phải vào mục **Databases**
- Chọn:

```text
Create -> Database...
```

Đặt tên database chính xác là:

```text
world_monitor_db
```

Sau đó nhấn **Save**.

---

# 🐍 Bước 3: Cài đặt Python & Thư viện

Mở Terminal tại thư mục `backend/` của project và chạy lệnh:

```bash
pip install sqlalchemy psycopg2-binary pandas yfinance loguru fastapi uvicorn python-dotenv
```

---

# 📝 Bước 4: Cấu hình file `.env`

Tạo file `.env` (lưu ý để nó cùng cấp với các thư mục như scripts,app,...) và copy nội dung từ file `.env.example` trong thư mục `backend/` và dán thêm nội dung sau:

```env
# Thay 'mat_khau_cua_ban' bằng mật khẩu postgres đã đặt ở Bước 1
DATABASE_URL=postgresql://postgres:mat_khau_cua_ban@localhost:5432/world_monitor_db
```

---

# 🚀 Bước 5: Khởi tạo bảng và Nạp dữ liệu

Anh em cần chạy các lệnh theo đúng thứ tự bên dưới.

---

## 1️⃣ Tạo cấu trúc bảng

Chạy lệnh:

```bash
uvicorn main:app --reload
```

Nếu Terminal hiện thông báo:

```text
[Database] Đã khởi tạo các bảng thành công
```

thì là OK.

---

## 2️⃣ Nạp dữ liệu lịch sử (6 tháng)

Mở Terminal mới và chạy:

```bash
python scripts/backfill.py
```

Lệnh này sẽ nạp hàng nghìn dòng dữ liệu của:

- BTC
- ETH
- AAPL
- GOLD

vào database.

---

## 3️⃣ Kiểm tra chất lượng dữ liệu

Chạy:

```bash
python scripts/data_quality.py
```

Script sẽ hiển thị:

- Số lượng dòng dữ liệu
- Thời gian cập nhật mới nhất
- Trạng thái dữ liệu

---

# 📖 Cách lấy dữ liệu để làm Task

---

# 🟢 Cho Member 2 (EDA) & Member 3 (AI)

## Export dữ liệu CSV sạch

Truy cập API:

```text
http://localhost:8000/api/export/csv/BTC/USDT
```

để tải file CSV.

## Đặc điểm dữ liệu

- Dữ liệu đã được làm sạch
- Không bị trùng lặp
- Sử dụng Unix Timestamp (`BigInt`)
- Dễ dùng để:
  - Phân tích dữ liệu (EDA)
  - Train model AI
  - Vẽ biểu đồ

---

# 🔵 Cho Member 4 (Dashboard) & Member 5 (Portfolio)

## Real-time Data

Database sẽ tự động cập nhật giá mới nhất vào bảng:

```text
ohlcv_candles
```

với khung thời gian:

```text
1m (1 minute)
```

## Alerts & News

Dữ liệu để hiển thị trên giao diện lấy từ:

- `alerts`
- `news`

---

# ✅ Checklist Setup

- [ ] Cài PostgreSQL
- [ ] Tạo database `world_monitor_db`
- [ ] Cài thư viện Python
- [ ] Tạo file `.env`
- [ ] Chạy `uvicorn main:app --reload`
- [ ] Chạy `python scripts/backfill.py`
- [ ] Chạy `python scripts/data_quality.py`

---
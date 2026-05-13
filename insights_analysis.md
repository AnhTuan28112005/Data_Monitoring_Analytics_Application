# Phân Tích Insights & Data Storytelling — World Monitor

> **Dự án:** World Monitor — Data Monitoring & Analytics Application
> **Thành viên phụ trách:** Thành viên 3 — Insight & Data Storytelling
> **Tài liệu:** Mô tả chi tiết cách hệ thống phân tích, giải thích và trình bày dữ liệu thị trường

---

## 1. Tổng Quan

Phần Insight là phần **quan trọng nhất** của đồ án — không chỉ thu thập và vẽ đồ thị, mà còn phải **giải thích ý nghĩa** đằng sau dữ liệu. Dữ liệu thô (giá, khối lượng, chỉ báo kỹ thuật) chỉ có giá trị khi người dùng hiểu được: chuyện gì đang xảy ra, tại sao, và nên làm gì tiếp theo.

Hệ thống insight của World Monitor được xây dựng theo **2 lớp**:

```
Lớp 1 — InsightService          : phân tích định lượng (số liệu, xu hướng, anomaly)
Lớp 2 — StorytellingService     : diễn giải định tính (ngôn ngữ tự nhiên, câu chuyện)
```

Hai lớp này phối hợp với nhau để tạo ra báo cáo hoàn chỉnh, được trình bày trực quan trên trang `/insights` của dashboard.

---

## 2. Kiến Trúc Hệ Thống Insight

```
background.py
    └── insight_loop()               ← chạy mỗi 10 phút
            │
            ▼
    InsightService.build()           ← insight_service.py
            │
            ├── _market_state()      ← xác định xu hướng tổng thể
            ├── _anomalies()         ← phát hiện bất thường
            ├── _timezone_analysis() ← phân tích theo phiên giao dịch
            ├── _top_movers()        ← tài sản tăng/giảm mạnh nhất
            │
            └── StorytellingService  ← storytelling_service.py
                    ├── market_narrative()       → giải thích xu hướng (4W)
                    ├── cross_asset_insights()   → tín hiệu liên thị trường
                    ├── interpret_anomaly()      → phân tích từng bất thường
                    ├── session_narrative()      → giải thích phiên giao dịch
                    └── weekly_summary()         → tổng kết tuần
                    │
                    ▼
            DailyInsight (cache)     ← trả về cho API /insights/daily
            EnhancedInsight (cache)  ← trả về cho API /insights/enhanced
                    │
                    ▼
            Frontend: page.tsx + InsightCards.tsx
```

---

## 3. InsightService — Phân Tích Định Lượng

File: `backend/app/services/insight_service.py`

### 3.1. Xác Định Trạng Thái Thị Trường

**Hàm:** `_market_state(dfs)`

Hệ thống xác định thị trường đang **Bullish / Bearish / Sideway** bằng cách kiểm tra 3 tài sản chính: BTC/USDT, S&P 500 (`^GSPC`), và NASDAQ (`^IXIC`).

Với mỗi tài sản, hệ thống tính điểm dựa trên vị trí giá so với đường trung bình động:

| Điều kiện | Điểm cộng |
|---|---|
| SMA20 > SMA50 (ngắn hạn trên trung hạn) | +1.0 |
| Giá hiện tại > SMA20 | +0.5 |
| Giá hiện tại > SMA50 | +0.5 |

Sau đó trừ đi 1.0 để căn giữa về 0, rồi tính trung bình:

```
avg > +0.4  →  BULLISH  (đa số tài sản đang trong xu hướng tăng)
avg < -0.4  →  BEARISH  (đa số tài sản đang trong xu hướng giảm)
còn lại     →  SIDEWAY  (không có xu hướng rõ ràng)
```

**Tại sao dùng 3 tài sản?** Vì BTC đại diện cho thị trường crypto, S&P 500 và NASDAQ đại diện cho thị trường chứng khoán Mỹ. Khi cả 3 cùng tăng/giảm, đó là tín hiệu vĩ mô rõ ràng hơn so với chỉ nhìn vào 1 tài sản.

---

### 3.2. Phát Hiện Bất Thường (Anomaly Detection)

**Hàm:** `_anomalies(dfs)`

Một tài sản được coi là **bất thường** khi thoả mãn ít nhất một trong hai điều kiện:

```
Volume Ratio ≥ 2.5×    →  Khối lượng giao dịch gấp 2.5 lần trung bình 20 nến
Biến động 24h ≥ ±5%    →  Giá thay đổi quá 5% trong 24 giờ
```

**Volume Ratio** được tính bằng cách so sánh khối lượng nến hiện tại với trung bình động 20 kỳ:

```
Volume Ratio = Volume(hiện tại) / SMA20(Volume)
```

Ví dụ: nếu BTC thường giao dịch 50,000 BTC/giờ, nhưng đột nhiên đạt 150,000 BTC/giờ, thì Volume Ratio = 3.0× — đây là tín hiệu bất thường đáng chú ý.

Sau khi phát hiện, các anomaly được **sắp xếp theo mức độ nghiêm trọng** (kết hợp biến động giá và khối lượng) và chỉ giữ lại 8 trường hợp đáng chú ý nhất để tránh nhiễu.

---

### 3.3. Phân Tích Theo Phiên Giao Dịch

**Hàm:** `_timezone_analysis(df)`

Thị trường tài chính toàn cầu hoạt động theo 3 phiên chính:

| Phiên | Giờ UTC | Thị trường chính |
|---|---|---|
| **Châu Á** | 00:00 – 08:00 | Nhật Bản, Hàn Quốc, Trung Quốc, Úc |
| **Châu Âu** | 07:00 – 16:00 | Frankfurt, Paris, London |
| **Mỹ** | 13:00 – 22:00 | NYSE, NASDAQ |

Với BTC làm tài sản chuẩn (vì hoạt động 24/7), hệ thống tính cho mỗi phiên:

- **Avg Volume** — khối lượng giao dịch trung bình mỗi nến 1h
- **Avg Volatility** — biến động trung bình mỗi nến (đo bằng %)
- **Net Change** — tổng thay đổi giá trong phiên (%)

Thông tin này giúp trả lời câu hỏi: *"Phiên giao dịch nào ảnh hưởng nhiều nhất đến giá BTC hôm nay?"*

---

### 3.4. Top Tăng / Giảm

**Hàm:** `_top_movers(dfs)`

Hệ thống tính % thay đổi giá trong 24h cho tất cả tài sản đang theo dõi, sau đó trả về:
- **Top 5 Gainers** — tăng mạnh nhất
- **Top 5 Losers** — giảm mạnh nhất

---

## 4. StorytellingService — Diễn Giải Định Tính

File: `backend/app/services/storytelling_service.py`

Đây là phần **cốt lõi** của Data Storytelling. Thay vì chỉ hiển thị số liệu, hệ thống tự động tạo ra các đoạn văn giải thích ý nghĩa của dữ liệu theo framework 4 câu hỏi.

### 4.1. Framework 4W — Nền Tảng Của Mọi Insight

Mỗi sự kiện thị trường đều được phân tích theo 4 lớp:

```
┌─────────────────────────────────────────────────────────┐
│  WHAT HAPPENED?   Chuyện gì đã xảy ra?                  │
│  → Mô tả khách quan, có số liệu cụ thể                  │
│  → Ví dụ: "BTC tăng 8.5%, khối lượng đạt 3.2× trung bình" │
├─────────────────────────────────────────────────────────┤
│  WHY?             Tại sao điều đó xảy ra?               │
│  → Giả thuyết nguyên nhân dựa trên dữ liệu              │
│  → Ví dụ: "SMA20 vượt SMA50 (golden cross), kết hợp với │
│           dòng tiền rút khỏi Gold sang Crypto"          │
├─────────────────────────────────────────────────────────┤
│  SO WHAT?         Điều đó có ý nghĩa gì?                │
│  → Tác động, bối cảnh, hệ quả đối với thị trường        │
│  → Ví dụ: "Momentum cao → chiến lược trend-following    │
│           có lợi thế, nhưng tương quan đa tài sản tăng"  │
├─────────────────────────────────────────────────────────┤
│  WHAT NEXT?       Nên theo dõi gì tiếp theo?            │
│  → Các tín hiệu cần giám sát, mức giá quan trọng        │
│  → Ví dụ: "Xem RSI có phân kỳ không, đặt cảnh báo tại  │
│           vùng hỗ trợ SMA50"                            │
└─────────────────────────────────────────────────────────┘
```

Framework này được áp dụng nhất quán cho **tất cả** loại insight: xu hướng thị trường, anomaly, tín hiệu liên thị trường.

---

### 4.2. Giải Thích Xu Hướng Thị Trường

**Hàm:** `market_narrative(market_state, dfs)`

Với mỗi trạng thái thị trường, hệ thống tạo ra một câu chuyện khác nhau:

**Khi Bullish:**
- Mô tả: nêu rõ BTC và S&P 500 đang ở đâu, SMA nào đang hỗ trợ
- Nguyên nhân: giải thích tín hiệu Golden Cross, xác nhận bởi khối lượng
- Ý nghĩa: chiến lược momentum hiệu quả, tương quan đa tài sản tăng
- Tiếp theo: theo dõi RSI divergence, ngưỡng kháng cự phía trên

**Khi Bearish:**
- Mô tả: giá dưới SMA50, Death Cross có thể đang xảy ra
- Nguyên nhân: rủi ro vĩ mô, áp lực bán từ tổ chức
- Ý nghĩa: tài sản beta cao (altcoin, growth stocks) giảm mạnh hơn
- Tiếp theo: tìm tín hiệu capitulation (khối lượng lớn + giảm đột ngột rồi hồi)

**Khi Sideway:**
- Mô tả: giá dao động quanh vùng SMA, không có hướng rõ ràng
- Nguyên nhân: thị trường đang chờ đợi catalyst (tin tức, dữ liệu vĩ mô)
- Ý nghĩa: chiến lược mean-reversion hiệu quả hơn trend-following
- Tiếp theo: đợi breakout có khối lượng xác nhận

---

### 4.3. Tín Hiệu Liên Thị Trường (Cross-Asset Insights)

**Hàm:** `cross_asset_insights(dfs)`

Đây là phần phân tích **quan hệ giữa các loại tài sản khác nhau** — một trong những giá trị độc đáo nhất của hệ thống. Thay vì nhìn từng tài sản riêng lẻ, hệ thống phát hiện các mẫu hình vĩ mô:

#### Tín hiệu 1: Rotation Crypto → Gold (Risk-Off)
```
Điều kiện: BTC giảm < -1.5% VÀ Gold tăng > +0.3%
Ý nghĩa:   Nhà đầu tư đang rút tiền khỏi tài sản rủi ro cao (crypto)
           và chuyển vào tài sản trú ẩn an toàn (vàng)
Chế độ:    risk-off
```

#### Tín hiệu 2: Dòng Tiền Vào Crypto (Risk-On)
```
Điều kiện: BTC tăng > +1.5% VÀ Gold giảm < -0.3%
Ý nghĩa:   Khẩu vị rủi ro đang tăng, vốn chạy vào tài sản tăng trưởng
Chế độ:    risk-on
```

#### Tín hiệu 3: Everything Rally (Đồng loạt tăng)
```
Điều kiện: BTC tăng > +0.5% VÀ Gold tăng > +0.5%
Ý nghĩa:   USD đang yếu đi — khi đô la mất giá, tất cả tài sản
           định giá bằng USD đều tăng tương đối
Chế độ:    rotation
```

#### Tín hiệu 4: USD Yếu (Equities + EUR/USD cùng tăng)
```
Điều kiện: S&P500 tăng > +0.5% VÀ EUR/USD tăng > +0.3%
Ý nghĩa:   Khi cổ phiếu và EUR/USD cùng tăng, nguyên nhân thường là
           USD yếu đi — không phải sức mạnh riêng của chứng khoán
Chế độ:    risk-on
```

#### Tín hiệu 5: Altcoin Season
```
Điều kiện: Altcoin trung bình vượt BTC hơn 2%
Ý nghĩa:   Vốn đầu tư đang mở rộng từ BTC sang altcoin
           Rủi ro cao hơn nhưng tiềm năng lợi nhuận cũng cao hơn
Chế độ:    risk-on
```

#### Tín hiệu 6: BTC Dominance Tăng
```
Điều kiện: BTC vượt altcoin trung bình hơn 2%
Ý nghĩa:   Vốn co cụm lại vào tài sản crypto lớn nhất, an toàn nhất
           Đây là "flight to quality" trong nội bộ thị trường crypto
Chế độ:    neutral
```

Mỗi tín hiệu còn có **Signal Strength** (0–100%) được tính dựa trên độ lớn của sự chênh lệch, giúp người dùng biết tín hiệu đó mạnh hay yếu.

---

### 4.4. Giải Thích Anomaly

**Hàm:** `interpret_anomaly(anomaly, dfs)`

Mỗi anomaly được phân tích theo 4 bước:

**Bước 1 — Mô tả sự kiện:**
Trình bày rõ con số: tài sản nào, tăng/giảm bao nhiêu %, khối lượng gấp mấy lần.

**Bước 2 — Liệt kê nguyên nhân có thể:**
Tùy theo loại tài sản và hướng di chuyển, hệ thống gợi ý 4 nguyên nhân phổ biến nhất. Ví dụ với Crypto tăng đột biến:
- Tin tức về ETF hoặc quy định pháp lý tích cực
- Tổ chức lớn mua vào (whale activity)
- Breakout kỹ thuật kích hoạt lệnh mua tự động
- Tác động vĩ mô (Fed dovish, risk-on)

**Bước 3 — Đánh giá tác động:**
Phân loại theo mức độ nghiêm trọng:
```
Critical  : biến động > 10% hoặc khối lượng > 5× → tác động lan rộng
Notable   : biến động > 5%  hoặc khối lượng > 3× → cần theo dõi
Watch     : dưới các ngưỡng trên               → giám sát thêm
```

**Bước 4 — Hành động gợi ý:**
Hướng dẫn cụ thể người dùng nên làm gì: kiểm tra tin tức, xem khối lượng có xác nhận không, hay chỉ đơn giản là thêm vào watchlist.

---

### 4.5. Giải Thích Phiên Giao Dịch

**Hàm:** `session_narrative(sessions)`

Sau khi có số liệu từ `_timezone_analysis()`, hàm này biến chúng thành ngôn ngữ tự nhiên:

- **Phiên nào có khối lượng lớn nhất?** → Giải thích bối cảnh của phiên đó (ví dụ: Phiên Mỹ là khi NYSE mở cửa, thanh khoản cao nhất toàn cầu)
- **Phiên nào biến động nhất?** → Giải thích tại sao phiên ít thanh khoản lại có biến động lớn hơn (lệnh lớn tác động mạnh hơn trong môi trường thanh khoản thấp)
- **Phiên nào có xu hướng rõ nhất?** → Xác định phiên nào đang dẫn dắt giá ngày hôm nay

---

### 4.6. Tổng Kết Tuần

**Hàm:** `weekly_summary(dfs, market_state, anomalies, gainers, losers)`

Tự động tạo một báo cáo tuần bao gồm:
- Tiêu đề phản ánh trạng thái thị trường tuần
- Đoạn narrative mô tả diễn biến của BTC, S&P 500, và Vàng trong 5 ngày
- Danh sách sự kiện đáng chú ý (anomaly nổi bật)
- Bảng tài sản tăng/giảm mạnh nhất tuần
- Nhận định triển vọng tuần tới (dựa trên trạng thái hiện tại)

---

## 5. Luồng Dữ Liệu Từ Backend Đến Giao Diện

```
1. background.py        → insight_loop() chạy mỗi 10 phút
                           (hoặc ngay khi khởi động nếu cache trống)
        ↓
2. InsightService       → build(): fetch OHLCV 200 nến × N tài sản
                           → phân tích định lượng
                           → gọi StorytellingService
                           → lưu vào _cache và _enhanced_cache
        ↓
3. API Endpoint         → GET /api/insights/daily      → DailyInsight (cơ bản)
                        → GET /api/insights/enhanced   → EnhancedInsight (đầy đủ)
        ↓
4. Frontend page.tsx    → mount: thử đọc cache
                           → nếu cache rỗng: tự động gọi rebuild
                           → hiển thị BuildingScreen trong lúc chờ
                           → render khi có dữ liệu
        ↓
5. InsightCards.tsx     → các component UI cho từng loại insight
```

### Xử Lý Trường Hợp Cache Rỗng (Cold Start)

Vấn đề: khi server vừa khởi động, `insight_loop` cần 10–15 giây để fetch và phân tích dữ liệu. Trong thời gian đó nếu user mở trang, sẽ không có gì để hiển thị.

**Giải pháp trong `page.tsx`:**

```
Người dùng mở trang /insights
        ↓
GET /api/insights/daily
        ↓
Có dữ liệu? → Hiển thị ngay
        ↓ không có
Tự động gọi /api/insights/rebuild (không cần user nhấn nút)
        ↓
Hiển thị BuildingScreen với progress indicator
(Fetching data... → Running analysis... → Composing insights...)
        ↓
Khi build xong → hiển thị kết quả
```

---

## 6. Giao Diện Người Dùng — Trang `/insights`

File: `frontend/app/insights/page.tsx` + `frontend/components/dashboard/InsightCards.tsx`

### Cấu Trúc 6 Tab

| Tab | Nội dung | Component chính |
|---|---|---|
| **Overview** | Insights dạng bullet + Top Gainers/Losers | Danh sách đơn giản |
| **Narrative** | Framework 4W với 4 bước điều hướng | `MarketNarrativeCard` |
| **Cross-Asset** | Các tín hiệu liên thị trường | `CrossAssetInsightCard` |
| **Anomalies** | Phân tích chi tiết từng bất thường | `AnomalyInterpretationCard` |
| **Sessions** | Biểu đồ + giải thích phiên giao dịch | `SessionNarrativeCard` |
| **Weekly** | Báo cáo tổng kết tuần | `WeeklySummaryCard` |

### Các Component UI Chính

**`MarketNarrativeCard`** — Hiển thị framework 4W theo dạng tab. Người dùng click qua từng bước (What Happened → Why → So What → What Next) để đọc từng lớp phân tích. Có nhãn "confidence" (high/medium/low) và danh sách tags.

**`CrossAssetInsightCard`** — Mỗi tín hiệu liên thị trường hiển thị dạng card với: tên tín hiệu, nhãn regime (risk-on/risk-off/rotation...), thanh Signal Strength, danh sách tài sản liên quan, và đoạn phân tích có thể mở rộng.

**`AnomalyInterpretationCard`** — Card màu sắc theo mức độ (đỏ = critical, vàng = notable, xanh = watch). Hiển thị thông tin tóm tắt, click mở rộng để xem nguyên nhân, tác động, và hành động gợi ý.

**`WeeklySummaryCard`** — Card tổng kết với headline, narrative paragraph, danh sách sự kiện, bảng winners/losers, và phần outlook có thể mở rộng.

### Thiết Kế Phù Hợp Với Dashboard

Tất cả component đều dùng CSS variables của hệ thống (`text-accent-green`, `bg-bg-card`, `border-line`...) để đảm bảo nhất quán với phần còn lại của dashboard. Màu sắc có ý nghĩa:
- 🟢 Xanh lá = bullish, tăng, tích cực
- 🔴 Đỏ = bearish, giảm, nguy hiểm
- 🟡 Vàng = cảnh báo, cần chú ý
- 🔵 Xanh dương/Cyan = thông tin, trung tính

---

## 7. Các Câu Hỏi Lớn Của Đồ Án

### 7.1. Xu Hướng Chính Của Dữ Liệu Là Gì?

Hệ thống trả lời câu hỏi này qua `_market_state()` và `market_narrative()`. Thay vì chỉ nói "thị trường đang tăng", hệ thống giải thích **tại sao** (SMA alignment, volume confirmation) và **ý nghĩa thực tế** (nên áp dụng chiến lược gì).

### 7.2. Có Pattern Đáng Chú Ý Nào Không?

Được trả lời qua `cross_asset_insights()` — phát hiện 6 loại pattern liên thị trường khác nhau, từ rotation Capital đơn giản đến các regime phức tạp hơn như Altcoin Season hay USD Weakness narrative.

### 7.3. Những Bất Thường Nào Xuất Hiện?

`_anomalies()` phát hiện, `interpret_anomaly()` giải thích. Không chỉ flagging "đây là anomaly" mà còn liệt kê nguyên nhân có thể, đánh giá tác động, và gợi ý hành động cụ thể.

### 7.4. Kết Luận Tổng Quan Là Gì?

`weekly_summary()` tổng hợp tất cả thành một báo cáo có cấu trúc: mô tả diễn biến → sự kiện nổi bật → tài sản tốt/xấu → nhận định tương lai. Đây là phần giúp người đọc không có thời gian theo dõi chi tiết vẫn nắm được bức tranh toàn cảnh.

---

## 8. Kết Luận

Hệ thống Insight & Storytelling của World Monitor được thiết kế theo nguyên tắc **"data tells a story"** — mỗi con số đều phải được đặt trong bối cảnh và giải thích ý nghĩa.

Điểm khác biệt so với các dashboard thông thường:

| Dashboard thông thường | World Monitor |
|---|---|
| Hiển thị số liệu thô | Giải thích ý nghĩa của số liệu |
| Người dùng tự phân tích | Hệ thống tự tạo narrative |
| Nhìn từng tài sản riêng lẻ | Phân tích quan hệ đa tài sản |
| Chỉ mô tả hiện tại | Có hướng dẫn "nên làm gì tiếp theo" |

Framework 4W (What → Why → So What → What Next) đảm bảo mỗi insight đều có chiều sâu, không chỉ dừng lại ở mô tả bề mặt mà đi đến được **giá trị thực tế** cho người theo dõi thị trường.

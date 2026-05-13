# Dashboard Screenshots Guide for Report & Presentation

Hướng dẫn chụp screenshots đẹp của tất cả charts và pages để dùng cho report và slide presentation.

---

## Chuẩn bị trước chụp

### Resolution & Aspect Ratio
- **Desktop**: 1920x1080 (16:9) - Tối ưu cho slide PowerPoint
- **Mobile**: 390x844 (9:19) - Showcase responsive design
- Bật DevTools: `F12` → `Ctrl+Shift+M` để responsive mode

### Theme & Setup
- **Dark Mode** (mặc định): Chụp chủ yếu vì đẹp hơn
- **Light Mode**: Chụp một vài ví dụ để show theme capability
- Chạy `npm run dev` → `localhost:3000`
- Chờ data load xong (2-3 giây)

---

## Dashboard Page Screenshots (`/`)

### 1️⃣ Date Range Picker + Market Overview
📄 **File**: `01-dashboard-overview.png`
- Chụp từ Date Range Picker đến Market Overview Widget
- Show: Date picker UI (1D, 1W, 1M, 3M, 6M, 1Y buttons) + market cap/volume/dominance stats

### 2️⃣ Multi-Asset Panel (5 Assets)
📄 **File**: `02-multi-asset-panel.png`
- Chụp Multi-Asset Panel card
- Show: 5 assets (BTC, S&P 500, EUR/USD, Gold, Silver) + sparkline charts + real-time prices

### 3️⃣ Fear & Greed Grid (4 Charts)
📄 **File**: `03-fear-greed-grid.png`
- Chụp 4-column grid: Fear&Greed Gauge + Dominance Donut + Volume by Class + Returns Distribution
- Show: Tất cả 4 charts mini cùng lúc

### 4️⃣ Main Candlestick Chart + Gainers/Losers
📄 **File**: `04-chart-panel-gainers.png`
- Chụp ChartPanel (candlestick) + GainersLosers sidebar
- Show: Chart selection + timeframe buttons + pattern markers (DIVERGENCE) + top 5 gainers/losers
- **Tip**: Để asset là BTC/USDT, timeframe 1h

### 5️⃣ Performance Comparison + Volatility Radar
📄 **File**: `05-performance-volatility.png`
- Chụp left: Normalized Performance (5 asset lines) + right: Volatility Radar
- Show: Cross-asset comparison + volatility heatmap (6 cryptos)

### 6️⃣ Top 10 Market Cap + BTC Activity Heatmap
📄 **File**: `06-marketcap-btc-activity.png`
- Chụp Top 10 Crypto (horizontal bar chart) + BTC Hourly Activity (heatmap)
- Show: Market cap ranking with color gradient + hourly activity pattern

### 7️⃣ Sector Performance Heatmap
📄 **File**: `07-sector-heatmap.png`
- Chụp Sector Performance Heatmap (full width)
- Show: Treemap with sectors + assets, color coded by performance (red/green)

### 8️⃣ Portfolio Tracker
📄 **File**: `08-portfolio-tracker.png`
- Chụp Portfolio Tracking card
- Nếu empty: Add 2-3 sample positions:
  - BTC/USDT: 0.5 qty @ $20,000 cost basis
  - ETH/USDT: 5 qty @ $8,000 cost basis
  - AAPL: 10 shares @ $15,000 cost basis
- Show: Portfolio summary (total value, cost, unrealized PnL) + position table

---

## Comparison Page Screenshots (`/comparison`)

### 9️⃣ Asset Selector Grid
📄 **File**: `09-comparison-selector.png`
- Chụp asset selection buttons
- Select 3-4 assets (e.g., BTC, ETH, S&P 500, Gold)
- Show: Selected assets with color indicators + button states

### 🔟 Comparison Chart (Overlay)
📄 **File**: `10-comparison-chart.png`
- Chụp ComparisonChart (full width line chart)
- Show: 3-4 normalized performance lines, timeframe 1d
- Legend showing all assets with colors

---

## Analytics Page Screenshots (`/analytics`)

### 1️⃣1️⃣ Technical Indicators - Candlestick
📄 **File**: `11-analytics-candlestick.png`
- Asset: BTC/USDT, Timeframe: 1h
- Enabled: SMA20, EMA50, Bollinger Bands
- Show: Candlestick chart with moving average overlays

### 1️⃣2️⃣ Technical Indicators - Overlay Chart
📄 **File**: `12-analytics-overlays.png`
- Show: SMA20 (cyan) + EMA50 (purple) + Bollinger (red/green bands)
- Line chart with price + indicators

### 1️⃣3️⃣ Technical Indicators - Oscillators (4-Grid)
📄 **File**: `13-analytics-oscillators.png`
- Show: RSI 14 + MACD + ATR + Volatility % (4 subcharts)
- Color-coded oscillators with proper labels

### 1️⃣4️⃣ Correlation Matrix
📄 **File**: `14-analytics-correlation.png`
- Timeframe: 1d
- Show: 8x8 heatmap (BTC, ETH, SOL, S&P, NASDAQ, Gold, Silver, EUR/USD)
- Color gradient: red (negative) → dark (neutral) → green (positive)

### 1️⃣5️⃣ Intraday Timeline with Events
📄 **File**: `15-analytics-intraday.png`
- Asset: BTC/USDT
- Show: Price line + pump (▲ green) + dump (▼ red) markers
- Summary: "X pumps, Y dumps detected"

---

## Insights Page Screenshots (`/insights`)

### 1️⃣6️⃣ Daily Insight Report Header
📄 **File**: `16-insights-header.png`
- Chụp Daily Insight Report card
- Show: Market state badge (BULLISH/BEARISH/NEUTRAL) + summary text + timestamp

### 1️⃣7️⃣ Macro & Anomalies
📄 **File**: `17-insights-anomalies.png`
- Show: Macro & Anomalies card (if anomalies detected)
- Columns: Symbol, Asset Class, Change %, Volume Ratio, Note

### 1️⃣8️⃣ Data-driven Insights
📄 **File**: `18-insights-insights.png`
- Show: Data-driven Insights card
- 3-5 bullet points with › markers (cyan)
- Sample insights about market trends

### 1️⃣9️⃣ Timezone Analysis (Trading Sessions)
📄 **File**: `19-insights-timezone.png`
- Show: Timezone Analysis (Asia · Europe · US)
- Bar chart: Volume + Line chart: Volatility % + Net Change %
- All 3 sessions visible

### 2️⃣0️⃣ Top Gainers & Top Losers
📄 **File**: `20-insights-movers.png`
- Show: 2-column grid
- Left: Top 5 Gainers, Right: Top 5 Losers
- Each: Symbol, Asset Class, Change %, Volume

---

## Portfolio Page Screenshots (`/portfolio`)

### 2️⃣1️⃣ Portfolio About Section
📄 **File**: `21-portfolio-about.png`
- Chụp "About Portfolio Tracking" info card

### 2️⃣2️⃣ Portfolio Tracker (Full Page)
📄 **File**: `22-portfolio-tracker-full.png`
- Same as #8, shown on dedicated `/portfolio` page
- Show: Full portfolio interface

---

## Mobile & Responsive Screenshots

### 2️⃣3️⃣ Mobile Dashboard (Top Section)
📄 **File**: `23-mobile-dashboard-top.png`
- Resolution: 390x844
- Show: Hamburger menu + Date Range Picker + Market Overview
- Portrait orientation

### 2️⃣4️⃣ Mobile Dashboard (Charts Stack)
📄 **File**: `24-mobile-dashboard-charts.png`
- Show: Fear&Greed + Dominance stacked vertically
- Mobile-optimized layout (1 column)

### 2️⃣5️⃣ Mobile Comparison Page
📄 **File**: `25-mobile-comparison.png`
- Asset selector grid (2 columns on mobile)
- Comparison chart responsive width

---

## Theme & UI Feature Screenshots

### 2️⃣6️⃣ Dark Mode Chart (Default)
📄 **File**: `26-theme-dark-chart.png`
- Same as #4 (ChartPanel) in dark mode
- Dark background, light text, cyan/purple colors

### 2️⃣7️⃣ Light Mode Chart (Theme Toggle)
📄 **File**: `27-theme-light-chart.png`
- Same chart in light mode
- Show: Theme toggle button (Sun icon visible)
- Light background, dark text

### 2️⃣8️⃣ Error State
📄 **File**: `28-error-state.png`
- Show: ErrorMessage component
- Red error icon + error text + "Retry" button
- Optional: Tắt backend API để simulate error

### 2️⃣9️⃣ Loading State
📄 **File**: `29-loading-skeleton.png`
- Show: SkeletonChart placeholders
- Blinking animation (if visible)
- "Loading…" text

---

## How to Capture Screenshots

### 📸 Method 1: Chrome DevTools (Best)
```
1. Mở page muốn chụp
2. Bấm F12 → DevTools
3. Ctrl+Shift+P → Type "Capture full page screenshot"
4. DevTools tự crop vùng cần chụp
5. Tự động download PNG
```

### 📸 Method 2: Print Screen
```
1. Mở page
2. Bấm Print Screen
3. Dán vào Paint/Snagit/Photoshop
4. Crop vùng chart/page
5. Lưu dưới tên PNG
```

### 📸 Method 3: Browser Extension
- Chrome: "Full Page Screen Capture" extension
- Hoặc: "Awesome Screenshot"

---

## File Organization

Tạo folder `screenshots/` lưu tất cả files:
```
Data_Monitoring_Analytics_Application/
├── screenshots/
│   ├── 01-dashboard-overview.png
│   ├── 02-multi-asset-panel.png
│   ├── ...
│   ├── 27-theme-light-chart.png
│   ├── 28-error-state.png
│   └── 29-loading-skeleton.png
├── SCREENSHOTS.md (file này)
```

---

## Tips để Chụp Đẹp ✨

✅ **Làm tốt:**
- Chụp khi data load xong (không loading state)
- Dark mode cho majority screenshots (đẹp, contrast tốt)
- Center chart/table trong frame
- Crop address bar hoặc hide URL
- Resolution 1920x1080 cho desktop
- Để chart/page hiển thị đầy đủ (scroll hết, không scroll lêu phêu)

❌ **Tránh:**
- Chụp lúc loading (skeleton visible)
- Light mode quá nhiều (quá sáng, khó nhìn slide)
- Bao gồm browser tabs/bookmarks
- UI bugs hoặc empty states
- Chụp khi error (trừ error state showcase)

---

## Lưu ý cho Presentation Slides

📊 **Chart Descriptions**: Tất cả charts đã có descriptions
- Descriptions được auto-update với real-time data
- Descriptions giải thích ý nghĩa chart + cách đọc + trading signals

📱 **Mobile Showcase**: Chụp 2-3 mobile views để show responsive design
- Dashboard mobile
- Comparison mobile
- Chart mobile

🎨 **Theme Toggle**: Chụp dark + light mode để show theme capability
- Dark: chủ yếu (90%)
- Light: 1-2 ví dụ (10%)




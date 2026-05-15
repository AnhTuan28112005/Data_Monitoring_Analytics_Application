# TÀI LIỆU CHUẨN BỊ THUYẾT TRÌNH ĐỒ ÁN: WORLD MONITOR

Tài liệu này cung cấp toàn bộ nội dung cần thiết để nhóm bạn tự tin thuyết trình và đạt điểm cao nhất, đặc biệt nhấn mạnh vào phần **Insights** (chiếm 30% số điểm phân tích).

---

## PHẦN 1: GIẢI THÍCH CHI TIẾT CÁC THÀNH PHẦN CỦA ỨNG DỤNG

Ứng dụng **World Monitor** là một hệ thống giám sát và phân tích dữ liệu đa tài sản (Cross-asset Market Intelligence) theo thời gian thực. 

### 1. Kiến trúc Hệ thống (Architecture)
*   **Backend (FastAPI):** Đóng vai trò là data engine. Thu thập dữ liệu từ nhiều nguồn (CCXT cho Crypto, YFinance cho Chứng khoán/Vàng/Forex). Có cơ chế caching và polling liên tục để đảm bảo dữ liệu luôn mới.
*   **Frontend (Next.js 14):** Giao diện người dùng hiện đại, sử dụng Tailwind CSS cho UI/UX và Plotly.js / Lightweight Charts để vẽ biểu đồ tương tác cao.
*   **AI & Phân tích:** Sử dụng mô hình Facebook Prophet để dự báo giá (Forecasting) và các thuật toán thống kê để phân tích độ lệch chuẩn, tương quan (Correlation).

### 2. Chi tiết các Trang (Modules)
*   **Dashboard (Tổng quan):** Nơi hiển thị nhịp đập của thị trường. Bao gồm biểu đồ nến, bản đồ nhiệt (Sector Heatmap) theo từng lĩnh vực, chỉ số sợ hãi/tham lam (Fear & Greed), và biểu đồ radar đo lường mức độ biến động.
*   **Compare (So sánh chéo):** Cho phép chọn nhiều tài sản khác nhau (ví dụ: Bitcoin vs Vàng vs S&P 500) và chuẩn hóa điểm xuất phát về 100 (Base=100) để dễ dàng so sánh hiệu suất % tăng trưởng qua cùng một khoảng thời gian.
*   **Daily Insight (Điểm nhấn ăn tiền):** Hệ thống tự động phân tích dữ liệu và tự động sinh ra các báo cáo dạng văn bản giải thích tình hình thị trường. 
    *   Sử dụng framework học thuật **4-W (What happened, Why, So what, What next)**.
    *   Có mô hình **AI Prophet** để dự báo giá tương lai kèm khoảng tin cậy.
    *   Phân tích theo phiên giao dịch (Á, Âu, Mỹ).
*   **Analytics (Phân tích Kỹ thuật):** Vẽ các chỉ báo kỹ thuật (SMA, EMA, Bollinger Bands, RSI, MACD) lên biểu đồ và quan trọng nhất là đưa ra **chiến lược tự động (Dynamic Strategy)** dựa trên các chỉ báo đang được chọn.
*   **Portfolio (Quản lý danh mục):** Cho phép người dùng nhập danh mục đầu tư và theo dõi Lãi/Lỗ (PnL) theo thời gian thực (Lưu trữ cục bộ LocalStorage).

---

## PHẦN 2: KẾ HOẠCH SLIDE THUYẾT TRÌNH (Dự kiến 15-20 Slides)

**Bố cục Slide đề xuất:**

1.  **Slide 1: Tiêu đề & Giới thiệu nhóm.** Tên đồ án: "World Monitor: Cross-Asset Data Monitoring & Automated Intelligence".
2.  **Slide 2: Đặt vấn đề (Problem Statement).** Quá nhiều dữ liệu thô (raw data) nhưng thiếu sự giải thích (interpretation). Nhà đầu tư bị ngợp trước biểu đồ.
3.  **Slide 3: Mục tiêu dự án (Objectives).** Xây dựng một nền tảng không chỉ HIỂN THỊ dữ liệu mà còn GIẢI THÍCH dữ liệu bằng các thuật toán phân tích.
4.  **Slide 4: Kiến trúc hệ thống (System Architecture).** Sơ đồ luồng dữ liệu: Nguồn Data (API) -> Backend (FastAPI + Prophet) -> Cache -> Frontend (Next.js).
5.  **Slide 5-6: Thu thập & Tiền xử lý dữ liệu (Data Pipeline).** Cách nhóm dùng CCXT và Yfinance để lấy đa dạng dữ liệu: Crypto, Stocks, Gold, Forex.
6.  **Slide 7: Các tính năng Dashboard & Analytics.** Show hình ảnh biểu đồ, Heatmap, Compare Tool.
7.  **Slide 8: [QUAN TRỌNG] Trái tim của hệ thống - The Insight Engine.** Giải thích việc nhóm không dùng API ChatGPT có sẵn mà tự build logic phân tích dựa trên Data thật.
8.  **Slide 9: [QUAN TRỌNG] Khung phân tích 4-W.** Trình bày framework (What - Why - So What - What Next) áp dụng để dịch dữ liệu kỹ thuật sang ngôn ngữ con người.
9.  **Slide 10: [QUAN TRỌNG] Tích hợp AI Forecasting.** Giới thiệu mô hình Facebook Prophet được tích hợp để dự báo giá BTC/Gold.
10. **Slide 11-14: Live Demo (Hoặc Video Demo).** Khuyến khích Demo trực tiếp tính năng Rebuild Insight.
11. **Slide 15: Kết luận & Hướng phát triển.** Những khó khăn đã vượt qua và những tính năng có thể mở rộng (như tích hợp NLP đọc tin tức thực).
12. **Slide 16: Q&A.** Cảm ơn thầy cô và mời đặt câu hỏi.

---

## PHẦN 3: KỊCH BẢN THUYẾT TRÌNH CHI TIẾT (Chia cho 4 người)

> **Mẹo nhỏ:** Hãy bật sẵn Web ở localhost. Trong lúc thuyết trình, 1 người nói thì 1 người ngồi bấm click Web để minh họa.

###  Giới thiệu & Đặt vấn đề (Phụ trách Slide 1 - 4)
"Xin chào thầy và các bạn. Hôm nay nhóm chúng em xin trình bày đồ án: **World Monitor - Ứng dụng Giám sát và Phân tích Dữ liệu Đa tài sản**. 
Khi bắt tay vào đề tài này, nhóm nhận thấy một vấn đề lớn: Các trang web hiện nay (như TradingView, Binance) cung cấp rất nhiều biểu đồ, nhưng lại phụ thuộc vào việc người dùng phải TỰ BIẾT CÁCH đọc hiểu. Đối với những nhà đầu tư không chuyên, một mớ dữ liệu thô không có ý nghĩa gì cả. 
Vì vậy, mục tiêu của nhóm không chỉ là làm một cái Dashboard vẽ biểu đồ cho đẹp. Nhóm muốn xây dựng một hệ thống **Market Intelligence** - nơi hệ thống tự động ăn dữ liệu, tự động tính toán, tự động bắt các điểm bất thường và quan trọng nhất là TỰ ĐỘNG VIẾT RA các báo cáo giải thích thị trường bằng ngôn ngữ dễ hiểu. Về mặt kiến trúc..." *(chuyển sang giải thích sơ đồ kiến trúc)*.

### Dữ liệu & Các tính năng cốt lõi (Phụ trách Slide 5 - 7 & Demo Dashboard)
"Để hệ thống chạy được, dữ liệu là mạch máu. Nhóm không lấy data giả mà lấy data realtime từ các sàn giao dịch bằng thư viện CCXT cho Crypto và YFinance cho thị trường truyền thống như Chứng khoán Mỹ, Vàng, Ngoại hối. 
*(Người bấm máy mở trang Dashboard)* 
Tại trang Dashboard, dữ liệu được hiển thị trực quan thông qua Sector Heatmap để xem nhóm ngành nào đang dẫn dắt thị trường, có chỉ số Sợ hãi và Tham lam, cùng các Radar đo lường độ biến động. 
*(Người bấm máy mở trang Compare)* 
Bên cạnh đó, nhóm phát triển tính năng Compare với thuật toán chuẩn hóa Base=100. Thay vì so sánh giá 60 ngàn đô của Bitcoin với giá 2 ngàn đô của Vàng (rất khập khiễng), thuật toán đưa tất cả về mốc 100% tại điểm bắt đầu để đo lường hiệu suất tăng trưởng tuyệt đối.
*(Người bấm máy mở trang Analytics)*
Phần Analytics không chỉ vẽ các đường MA hay RSI, mà bên dưới sẽ có một bảng tín hiệu động (Dynamic Strategy). Khi ta bật/tắt các chỉ báo, hệ thống sẽ đọc chỉ báo đó và đưa ra lời khuyên tương ứng."

###  Phần Insights - Điểm sáng giá nhất (Phụ trách Slide 8 - 10 & Demo tính năng Insight)
"Phần tiếp theo là linh hồn của dự án - Module Daily Insight. Đây là phần nhóm đầu tư nhiều chất xám nhất để đáp ứng yêu cầu rút ra insight có giá trị của đồ án.
*(Người bấm máy mở trang Daily Insight, nhấn nút Rebuild)*
Mỗi khi ta nhấn nút Rebuild, Backend sẽ chạy lại một luồng Data Pipeline. Thay vì hiển thị con số khô khan, hệ thống áp dụng framework học thuật 4-W bao gồm: What happened (Chuyện gì xảy ra), Why (Tại sao), So what (Ý nghĩa là gì) và What next (Nên làm gì tiếp theo). 
Ví dụ, khi phát hiện khối lượng giao dịch bất thường, hệ thống không chỉ báo 'Volume tăng', mà sẽ phân tích: Volume tăng nhưng giá giảm -> Nghĩa là có áp lực bán tháo -> Nhà đầu tư nên cẩn trọng bắt đáy.
Hệ thống cũng tự động phân tích tính chất của các phiên giao dịch: Phiên Á, Phiên Âu, Phiên Mỹ xem dòng tiền đang tập trung ở đâu. Và đặc biệt, để dự báo tương lai..." *(nhường lời cho người 4)*

###  AI Forecasting & Kết luận (Phụ trách Demo Tab Forecast & Slide còn lại)
*(Người bấm máy chuyển sang tab Forecast trong trang Insight)*
"Và để hệ thống thêm phần toàn diện, nhóm đã tích hợp mô hình Machine Learning **Facebook Prophet**. Hệ thống sẽ lấy dữ liệu lịch sử của Bitcoin và Vàng, phân tích tính thời vụ (seasonality) và chu kỳ để dự báo hướng đi của giá trong các giờ tiếp theo.
Như thầy có thể thấy trên màn hình, hệ thống tính toán ra giá dự báo, hiển thị khoảng tin cậy (độ rủi ro). Và hệ thống Storytelling của nhóm tiếp tục bóc tách số liệu Prophet này thành văn bản giải thích: Tại sao mô hình lại dự báo tăng/giảm, dựa vào đặc tính lịch sử nào. Hệ thống cũng đánh giá luôn Vị thế lịch sử (Historical Context) xem giá hiện tại đang ở gần đỉnh hay đáy của chu kỳ 8 ngày.
**Tóm lại**, World Monitor không phải là một trang web clone biểu đồ. Nó là một Data Pipeline hoàn chỉnh: từ thu thập -> tiền xử lý -> trực quan hóa -> và cuối cùng là sinh ra Insights tự động. 
Cảm ơn thầy và các bạn đã lắng nghe. Chúng em xin mời thầy đặt câu hỏi ạ."

---

## 🎯 CÁC CÂU HỎI PHẢN BIỆN THƯỜNG GẶP (Chuẩn bị sẵn để đối phó)

1.  **Thầy hỏi: Các đoạn text trong trang Insight có phải là code cứng (hardcode) hay dùng ChatGPT API không?**
    *   **Trả lời:** "Dạ không ạ. Toàn bộ text được sinh ra từ các thuật toán rẽ nhánh logic dựa trên dữ liệu thật ngay tại thời điểm đó (Rule-based Generation). Nhóm xây dựng module `storytelling_service` phân tích các chỉ số (giá, khối lượng, MA) để ghép nối thành các câu có nghĩa theo khung 4-W. Việc không dùng ChatGPT giúp hệ thống chạy nhanh, không tốn phí API và đảm bảo độ chính xác tuyệt đối theo data, không bị 'ảo giác' (hallucination)."
2.  **Thầy hỏi: Tại sao lại chọn mô hình Facebook Prophet cho phần Forecast?**
    *   **Trả lời:** "Dạ vì đặc thù dữ liệu tài chính (đặc biệt là Crypto) hoạt động 24/7 và có tính chu kỳ theo giờ/ngày. Prophet xử lý rất tốt các chu kỳ (seasonality) và kháng lại nhiễu (outliers) tốt hơn các mô hình cơ bản như ARIMA. Hơn nữa nó tự động sinh ra khoảng tin cậy (upper/lower bounds) rất hữu ích để nhóm xây dựng các kịch bản quản trị rủi ro."
3.  **Thầy hỏi: Dữ liệu của các em là tĩnh hay realtime?**
    *   **Trả lời:** "Dạ là Near-realtime (thời gian thực có độ trễ ngắn). Frontend liên tục gọi API polling (mỗi 5 giây lấy giá, 15 giây lấy nến). Backend có cơ chế Caching (lưu trữ tạm) để không bị vi phạm Rate Limit (giới hạn gọi API) của các sàn giao dịch ạ."

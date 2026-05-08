"""
PROJECT: WORLD MONITOR
MEMBER 1: DATA PIPELINE & PERSISTENT STORAGE
TASK 1.3: HISTORICAL DATA BACKFILL (FINAL STABLE VERSION)
Description: Thu thập dữ liệu lịch sử từ Yahoo Finance và lưu vào PostgreSQL.
Đã fix lỗi: Chuyển đổi chính xác Datetime sang Unix Timestamp (BigInt).
"""

import os
import sys
import pandas as pd
import yfinance as yf
from sqlalchemy import create_engine
from dotenv import load_dotenv
from datetime import datetime

# 1. Cấu hình môi trường
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ LỖI: DATABASE_URL không tồn tại trong file .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

def load_historical_data(symbol: str, yf_ticker: str, period: str = "6mo", interval: str = "1h"):
    """
    Kéo dữ liệu lịch sử, chuẩn hóa 1D và lưu vào bảng ohlcv_candles.
    """
    print("-" * 60)
    print(f"🚀 BẮT ĐẦU: Thu thập dữ liệu cho {symbol} ({yf_ticker})")
    
    try:
        # Tải dữ liệu từ Yahoo Finance (không hiện thanh progress để log sạch hơn)
        data = yf.download(yf_ticker, period=period, interval=interval, progress=False)
        
        if data.empty:
            print(f"⚠️ CẢNH BÁO: Ticker {yf_ticker} không trả về dữ liệu.")
            return

        # Đưa cột Datetime từ Index ra thành cột dữ liệu bình thường
        data = data.reset_index()
        

        def flatten(series):
            return series.values.flatten()


        unix_timestamps = data.iloc[:, 0].values.astype('datetime64[s]').astype('int64')

        # Tạo DataFrame chuẩn Schema database
        df_to_db = pd.DataFrame({
            'symbol': symbol,
            'timeframe': interval,
            'open': flatten(data['Open']),
            'high': flatten(data['High']),
            'low': flatten(data['Low']),
            'close': flatten(data['Close']),
            'volume': flatten(data['Volume']),
            'time_timestamp': unix_timestamps # Mỗi dòng bây giờ là một con số Unix duy nhất
        })
        
        # Đẩy dữ liệu vào PostgreSQL (chế độ append để không xóa dữ liệu cũ của mã khác)
        df_to_db.to_sql('ohlcv_candles', engine, if_exists='append', index=False)
        
        print(f"✅ THÀNH CÔNG: Đã nạp {len(df_to_db)} dòng cho {symbol} vào database.")
        
    except Exception as e:
        print(f"❌ LỖI tại {symbol}: {e}")

if __name__ == "__main__":
    start_time = datetime.now()
    print(f"🕒 Script khởi chạy lúc: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Danh sách các tài sản cần Backfill cho đồ án
    assets_list = [
        {"symbol": "BTC/USDT", "ticker": "BTC-USD"},
        {"symbol": "ETH/USDT", "ticker": "ETH-USD"},
        {"symbol": "AAPL",     "ticker": "AAPL"},
        {"symbol": "GOLD",     "ticker": "GC=F"},
    ]
    
    for asset in assets_list:
        load_historical_data(asset["symbol"], asset["ticker"])
    
    end_time = datetime.now()
    print("-" * 60)
    print(f"🎉 HOÀN THÀNH: Tổng thời gian xử lý là {(end_time - start_time).total_seconds():.2f} giây.")
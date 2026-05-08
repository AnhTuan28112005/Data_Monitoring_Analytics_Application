import pandas as pd
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

def clean_database():
    print("🧹 Đang bắt đầu quy trình làm sạch dữ liệu...")
    
    with engine.connect() as conn:
        # 1. Xóa các bản ghi trùng lặp trong bảng ohlcv_candles
        # Dựa trên symbol và time_timestamp
        conn.execute(text("""
            DELETE FROM ohlcv_candles a USING ohlcv_candles b 
            WHERE a.id < b.id 
            AND a.symbol = b.symbol 
            AND a.time_timestamp = b.time_timestamp;
        """))
        
        # 2. Xử lý missing values (nếu có dòng nào giá = 0 thì xóa hoặc nội suy)
        conn.execute(text("DELETE FROM ohlcv_candles WHERE open = 0 OR close = 0;"))
        conn.commit()
        
    print("✅ Đã xóa các bản ghi trùng lặp và làm sạch dữ liệu rác.")

if __name__ == "__main__":
    clean_database()
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

def check_quality():
    print("📊 BÁO CÁO CHẤT LƯỢNG DỮ LIỆU")
    print("-" * 30)
    
    with engine.connect() as conn:
        # 1. Kiểm tra tổng số dòng 
        res = conn.execute(text("SELECT symbol, COUNT(*) FROM ohlcv_candles GROUP BY symbol"))
        for row in res:
            print(f"🔹 {row[0]}: {row[1]} bản ghi")
            
        print("-" * 30)

        # 2. Kiểm tra dữ liệu mới nhất và đổi sang định dạng ngày tháng
        res_fresh = conn.execute(text("SELECT MAX(time_timestamp) FROM ohlcv_candles"))
        last_update_unix = res_fresh.fetchone()[0]
        
        if last_update_unix:
            last_update_dt = datetime.fromtimestamp(last_update_unix)
            print(f"🕒 Dữ liệu mới nhất: {last_update_dt.strftime('%d/%m/%Y %H:%M:%S')}")
        else:
            print("⚠️ Database hiện đang trống!")

if __name__ == "__main__":
    check_quality()
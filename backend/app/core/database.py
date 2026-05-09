from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base 
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base() 

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Khởi tạo database: Tự động xây dựng 6 bảng chuẩn theo pgAdmin."""
    try:
        # Vẫn giữ để hỗ trợ nếu sau này dùng ORM Model
        Base.metadata.create_all(bind=engine)
        
        with engine.connect() as conn:
            # 1. Bảng ohlcv_candles
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ohlcv_candles (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(20),
                    timeframe VARCHAR(10),
                    open DOUBLE PRECISION, high DOUBLE PRECISION, 
                    low DOUBLE PRECISION, close DOUBLE PRECISION,
                    volume DOUBLE PRECISION, time_timestamp BIGINT
                );
            """))

            # 2. Bảng alerts
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id SERIAL PRIMARY KEY,
                    alert_type VARCHAR(50),
                    message TEXT,
                    severity VARCHAR(20),
                    timestamp TIMESTAMPTZ,
                    symbol VARCHAR(20),
                    detail TEXT
                );
            """))

            # 3. Bảng news
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS news (
                    news_id VARCHAR(255) PRIMARY KEY,
                    title TEXT, source VARCHAR(100), url TEXT,
                    published_at TIMESTAMPTZ,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))

            # 4. Bảng market_insights
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS market_insights (
                    id SERIAL PRIMARY KEY,
                    asset VARCHAR(20),
                    content TEXT
                );
            """))

            # 5. Bảng daily_insights
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS daily_insights (
                    id SERIAL PRIMARY KEY,
                    report_date DATE,
                    content_json JSONB,
                    overall_sentiment VARCHAR(20)
                );
            """))

            # 6. Bảng prices
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS prices (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(20),
                    asset_class VARCHAR(20),
                    price DOUBLE PRECISION,
                    change_24h_pct DOUBLE PRECISION,
                    timestamp TIMESTAMPTZ
                );
            """))
            conn.commit()
        print(" [Database] Đã khởi tạo và đồng bộ 6 bảng thành công.")
    except Exception as e:
        print(f"[Database] Lỗi khi khởi tạo bảng: {e}")
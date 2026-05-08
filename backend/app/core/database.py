from sqlalchemy import create_engine
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
    """Khởi tạo database: Tự động tạo bảng."""
    try:
        Base.metadata.create_all(bind=engine)
        print(" [Database] Đã khởi tạo các bảng thành công.")
    except Exception as e:
        print(f"[Database] Lỗi khi khởi tạo bảng: {e}")
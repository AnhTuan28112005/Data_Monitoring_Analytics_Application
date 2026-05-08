from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text # Thêm cái này để query an toàn hơn
from app.core.database import get_db
import pandas as pd
import io

# Giữ nguyên prefix
router = APIRouter(prefix="/api/export", tags=["Data Export"])

# Thêm :path vào sau {symbol}
@router.get("/csv/{symbol:path}")
async def export_candles_csv(symbol: str, db: Session = Depends(get_db)):
    # In ra terminal để bồ debug xem nó có nhận được symbol không
    print(f"🔍 Đang truy vấn dữ liệu xuất cho: {symbol}")
    
    # Đọc dữ liệu từ Postgres
    # Tui khuyên dùng params để tránh lỗi SQL Injection nếu symbol có ký tự lạ
    query = text("SELECT * FROM ohlcv_candles WHERE symbol = :s ORDER BY time_timestamp ASC")
    df = pd.read_sql(query, db.bind, params={"s": symbol})
    
    # Nếu không có dữ liệu thì báo lỗi
    if df.empty:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu cho {symbol} trong database")
    
    # Chuyển thành CSV stream
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    # Chuẩn hóa tên file (thay / thành _)
    safe_filename = symbol.replace('/', '_')
    
    return StreamingResponse(
        iter([stream.getvalue()]), 
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={safe_filename}_history.csv"}
    )
from sqlalchemy.orm import Session
from loguru import logger
from sqlalchemy import text
import json
from datetime import datetime

class PersistenceService:
    @staticmethod
    def save_market_ticks(db: Session, ticks: list):
        """Lưu nến vào bảng ohlcv_candles (Khớp image_1b4470.png)."""
        try:
            for t in ticks:
                data = t.model_dump()
                query = text("""
                    INSERT INTO ohlcv_candles (symbol, timeframe, open, high, low, close, volume, time_timestamp)
                    VALUES (:symbol, :timeframe, :open, :high, :low, :close, :volume, :time_timestamp)
                """)
                db.execute(query, {
                    "symbol": data['symbol'],
                    "timeframe": "1m",
                    "open": data['price'],
                    "high": data['price'],
                    "low": data['price'],
                    "close": data['price'],
                    "volume": 0,
                    "time_timestamp": int(data['timestamp'].timestamp())
                })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Lỗi lưu ticks: {e}")

    @staticmethod
    def save_news(db: Session, item):
        """Lưu tin tức vào bảng news (Khớp image_1b4496.png)."""
        try:
            query = text("""
                INSERT INTO news (news_id, title, source, url, created_at)
                VALUES (:id, :title, :source, :url, NOW())
                ON CONFLICT (news_id) DO NOTHING;
            """)
            db.execute(query, {
                "id": str(item.id), 
                "title": item.title, 
                "source": item.source, 
                "url": item.url
            })
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Lỗi lưu news: {e}")

    @staticmethod
    def save_insight(db: Session, asset: str, content: str):
        """Lưu insight vào bảng market_insights (Khớp image_1b4758.png)."""
        try:
            query = text("INSERT INTO market_insights (asset, content) VALUES (:asset, :content)")
            db.execute(query, {"asset": asset, "content": content})
            db.commit()
            logger.info(f"💾 Đã lưu insight cho {asset}")
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Lỗi lưu insight: {e}")

    @staticmethod
    def save_alert(db: Session, alert_data: dict):
        """Lưu cảnh báo vào bảng alerts (Khớp image_1b479b.png)."""
        try:
            to_save = alert_data.copy()
            # Xử lý detail thành JSON string nếu nó là dict
            if isinstance(to_save.get('detail'), dict):
                to_save['detail'] = json.dumps(to_save['detail'])
            
            
            query = text("""
                INSERT INTO alerts (symbol, alert_type, severity, message, detail, timestamp)
                VALUES (:symbol, :alert_type, :severity, :message, :detail, to_timestamp(:time_timestamp))
            """)
            db.execute(query, to_save)
            db.commit()
            logger.info(f"🚨 Đã lưu cảnh báo {to_save['alert_type']} cho {to_save['symbol']}")
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Lỗi lưu alert: {e}")
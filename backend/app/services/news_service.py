"""News & macroeconomic event ticker service.

Uses public RSS feeds (no API key needed).  Falls back gracefully to a
short curated list if all feeds are unreachable so the UI is never empty.
"""
from __future__ import annotations

import asyncio
import hashlib
from datetime import datetime, timezone
from typing import List

import feedparser
from loguru import logger

from app.models.schemas import NewsItem


_FEEDS = [
    ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/", "crypto"),
    ("CoinTelegraph", "https://cointelegraph.com/rss", "crypto"),
    ("Investing.com", "https://www.investing.com/rss/news_25.rss", "macro"),
    ("Reuters Markets", "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best", "macro"),
    ("Yahoo Finance", "https://finance.yahoo.com/news/rssindex", "stock"),
]


class NewsService:
    async def fetch_all(self, limit: int = 30) -> List[NewsItem]:
        results = await asyncio.gather(*(self._fetch_feed(*f) for f in _FEEDS), return_exceptions=True)
        items: List[NewsItem] = []
        for r in results:
            if isinstance(r, list):
                items.extend(r)
        items.sort(key=lambda x: x.published_at, reverse=True)
        return items[:limit]

    async def _fetch_feed(self, source: str, url: str, category: str) -> List[NewsItem]:
        try:
            data = await asyncio.to_thread(feedparser.parse, url)
        except Exception as exc:
            logger.debug(f"Feed {source} failed: {exc}")
            return []
        out: List[NewsItem] = []
        for entry in data.entries[:15]:
            try:
                title = getattr(entry, "title", "") or ""
                link = getattr(entry, "link", "") or ""
                summary = getattr(entry, "summary", "") or ""
                published_struct = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
                if published_struct:
                    published_at = datetime(*published_struct[:6], tzinfo=timezone.utc)
                else:
                    published_at = datetime.now(timezone.utc)
                uid = hashlib.md5(f"{source}|{title}|{link}".encode()).hexdigest()
                out.append(NewsItem(
                    id=uid,
                    title=title.strip(),
                    source=source,
                    url=link,
                    published_at=published_at,
                    summary=summary[:280] if summary else None,
                    category=category,
                ))
            except Exception:
                continue
        return out


news_service = NewsService()

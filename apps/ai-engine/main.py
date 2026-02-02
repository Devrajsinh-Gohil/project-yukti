from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager
import asyncio
from services.mq_listener import listen_to_market_data
from services.mq_listener import listen_to_market_data
from routes import stream, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start Redis Listener
    task = asyncio.create_task(listen_to_market_data())
    yield
    # Shutdown logic (if any)
    task.cancel()

app = FastAPI(
    title="Project Yukti AI Engine",
    description="Financial Signal Generation & Analysis API",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS (Allow Frontend)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stream.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1/admin")

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "service": "yukti-ai-engine",
        "version": "0.1.0"
    }

from models import MarketRegion, SignalResponse, ChartResponse, NewsResponse
from services.signal_generator import get_market_signals, get_chart_data, get_ticker_news

# ... imports ...

@app.get("/api/v1/ping")
async def ping():
    return {"message": "pong"}

@app.get("/api/v1/signals", response_model=SignalResponse)
async def get_signals(market: MarketRegion = MarketRegion.IN):
    """
    Fetch AI-generated signals for a specific market.
    """
    return get_market_signals(market)

@app.get("/api/v1/chart/{ticker}", response_model=ChartResponse)
async def get_chart(ticker: str, range: str = "1mo", interval: str = None):
    """
    Fetch historical chart data for a ticker.
    Range options: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    Interval options: 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
    """
    return get_chart_data(ticker, range, interval)

@app.get("/api/v1/news/{ticker}", response_model=NewsResponse)
async def get_news(ticker: str):
    """
    Fetch real-time news for a ticker.
    """
    return get_ticker_news(ticker)

import httpx
from pydantic import BaseModel
from typing import List

class SearchResultItem(BaseModel):
    symbol: str
    name: str
    exchange: str
    type: str

class SearchResponse(BaseModel):
    results: List[SearchResultItem]

@app.get("/api/v1/search", response_model=SearchResponse)
async def search_ticker(q: str):
    """
    Search for tickers using Yahoo Finance Autocomplete.
    """
    if not q:
        return {"results": []}
    
    url = "https://query1.finance.yahoo.com/v1/finance/search"
    params = {
        "q": q,
        "quotesCount": 10,
        "newsCount": 0
    }
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, headers=headers)
            data = resp.json()
        
        items = []
        if 'quotes' in data:
            for quote in data['quotes']:
                # Filter out non-equity if desired, keeping simple for now
                items.append({
                    "symbol": quote.get('symbol'),
                    "name": quote.get('shortname') or quote.get('longname') or quote.get('symbol'),
                    "exchange": quote.get('exchange', 'Unknown'),
                    "type": quote.get('quoteType', 'Unknown')
                })
        return {"results": items}
    except Exception as e:
        print(f"Search API Error: {e}")
        return {"results": []}

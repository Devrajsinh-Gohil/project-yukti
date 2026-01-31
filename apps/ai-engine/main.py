from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Project Yukti AI Engine",
    description="Financial Signal Generation & Analysis API",
    version="0.1.0"
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

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "service": "yukti-ai-engine",
        "version": "0.1.0"
    }

from models import MarketRegion, SignalResponse, ChartResponse
from services.signal_generator import get_market_signals, get_chart_data

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
async def get_chart(ticker: str, range: str = "1mo"):
    """
    Fetch historical chart data for a ticker.
    Range options: 1m, 5m, 15m, 1H, D, 1M, 1Y, ALL
    """
    return get_chart_data(ticker, range)

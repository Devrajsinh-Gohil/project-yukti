from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime

class SignalAction(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    NEUTRAL = "NEUTRAL"

class MarketRegion(str, Enum):
    US = "US"
    IN = "IN"
    CRYPTO = "CRYPTO"

class SignalDriver(BaseModel):
    label: str = Field(..., description="Name of the factor (e.g. RSI, Volume)")
    value: float = Field(..., description="Impact score (0-100)")
    sentiment: str = Field(..., description="Bullish/Bearish/Neutral context")

class Signal(BaseModel):
    id: str
    ticker: str
    name: str
    price: str  # Kept as string for display formatting, or could be float
    action: SignalAction
    confidence: float = Field(..., ge=0, le=100)
    uncertainty: float = Field(..., description="Confidence interval margin (e.g. 5.2)")
    timestamp: str  # ISO string or formatted time
    model: str
    drivers: List[SignalDriver] = []
    
    class Config:
        populate_by_name = True

class ChartDataPoint(BaseModel):
    time: str | int # ISO Date or Timestamp
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = None

class ChartResponse(BaseModel):
    ticker: str
    region: str
    interval: str
    data: List[ChartDataPoint]

class SignalResponse(BaseModel):
    signals: List[Signal]
    market: MarketRegion
    count: int

# --- News Models ---
class NewsItem(BaseModel):
    id: str
    title: str
    source: str
    published_at: str
    url: str
    sentiment: str = "neutral" 
    tickers: List[str] = []

class NewsResponse(BaseModel):
    ticker: str
    news: List[NewsItem]

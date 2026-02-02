import yfinance as yf
import pandas as pd
import numpy as np
import random
from typing import List
from datetime import datetime
from models import Signal, SignalAction, SignalDriver, MarketRegion, SignalResponse, ChartResponse, ChartDataPoint, NewsItem, NewsResponse

# ... existing code ...

# Tickers
TICKERS_IN = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS"]
TICKERS_US = ["NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "AMD"]
TICKERS_CRYPTO = ["BTC-USD", "ETH-USD", "SOL-USD", "DOGE-USD", "XRP-USD", "BNB-USD", "ADA-USD", "AVAX-USD"]

DRIVERS = [
    "RSI Divergence", "Volume Breakout", "MACD Crossover", "Bollinger Band Squeeze",
    "Sector Momentum", "Institutional Buying", "Moving Average Support", "Earnings Surprise"
]

MODELS = ["Mean Reversion v2", "Momentum Alpha", "Trend Follower", "Volatility Breakout", "LSTM-Hybrid"]

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

from datetime import timedelta, timezone

def fetch_crypto_history(ticker: str, interval: str, period: str = "1mo") -> List[ChartDataPoint]:
    # Map Ticker to Binance Symbol (BTC-USD -> BTCUSDT)
    symbol = ticker.replace("-", "").replace("USD", "USDT")
    
    # Map Interval (yfinance -> binance)
    binance_interval = interval
    if interval == "1wk": binance_interval = "1w"
    if interval == "1mo": binance_interval = "1M"
    if interval == "max": binance_interval = "1w" 

    # Calculate Start Time based on Period
    now = datetime.now(timezone.utc)
    delta = timedelta(days=30) # Default 1mo
    
    if period == "1d": delta = timedelta(days=1)
    elif period == "5d": delta = timedelta(days=5)
    elif period == "1mo": delta = timedelta(days=30)
    elif period == "3mo": delta = timedelta(days=90)
    elif period == "6mo": delta = timedelta(days=180)
    elif period == "1y": delta = timedelta(days=365)
    elif period == "2y": delta = timedelta(days=730)
    elif period == "5y": delta = timedelta(days=1825)
    elif period == "max": delta = timedelta(days=365*5)
    elif period == "ytd": delta = now - datetime(now.year, 1, 1, tzinfo=timezone.utc)
    
    start_time = int((now - delta).timestamp() * 1000)
    
    url = "https://api.binance.com/api/v3/klines"
    all_points = []
    
    # Pagination Loop (Max 5 requests to avoid timeout/limits -> 5000 candles)
    current_start = start_time
    for _ in range(5):
        params = {
            "symbol": symbol,
            "interval": binance_interval,
            "limit": 1000,
            "startTime": current_start
        }
        
        try:
            with httpx.Client() as client:
                resp = client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
            
            if not data:
                break
                
            for k in data:
                # Binance Kline: [Open Time, Open, High, Low, Close, Vol, Close Time, ...]
                all_points.append(ChartDataPoint(
                    time=int(k[0] / 1000), # ms to seconds
                    open=float(k[1]),
                    high=float(k[2]),
                    low=float(k[3]),
                    close=float(k[4]),
                    volume=float(k[5])
                ))
            
            # Update start for next page (Close Time + 1ms)
            last_close_time = data[-1][6]
            current_start = last_close_time + 1
            
            # If we got fewer than limit, we reached the end
            if len(data) < 1000:
                break
                
        except Exception as e:
            print(f"Error fetching Binance data for {ticker}: {e}")
            break
            
    return all_points

def map_range_to_yf_interval(range_filter: str) -> tuple[str, str]:

    if range_filter == "5m":
        return "1d", "5m"
    elif range_filter == "15m":
        return "5d", "15m"
    elif range_filter == "1H":
         return "1mo", "1h"
    elif range_filter == "4H":
         return "3mo", "1h" # Fallback
    elif range_filter in ["D", "1Y"]:
        return "1y", "1d"
    elif range_filter == "ALL":
        return "max", "1wk"
    return "1mo", "1d" # Default

def parse_yf_history(hist: pd.DataFrame, interval: str) -> List[ChartDataPoint]:
    data_points = []
    for index, row in hist.iterrows():
        # index is datetime
        time_str = index.strftime("%Y-%m-%d")
        # For intraday (1m, 5m, 1h), we need timestamps or full ISO
        if interval in ["2m", "5m", "15m", "30m", "60m", "90m", "1h"]:
            # Lightweight charts likes UNIX timestamp number for intraday
            time_str = int(index.timestamp())
        
        data_points.append(ChartDataPoint(
            time=time_str,
            open=row['Open'],
            high=row['High'],
            low=row['Low'],
            close=row['Close'],
            volume=row['Volume']
        ))
    return data_points

def validate_interval_for_range(range_filter: str, interval: str) -> str:
    """Enforce logical bounds for interval based on range."""
    # 1d -> Intraday only
    if range_filter == "1d":
        if interval not in ["5m", "15m", "1h", "30m", "60m", "90m"]:
            return "5m"
    # 1mo -> Balance
    elif range_filter == "1mo":
         if interval in ["1m", "2m", "5m"]: # Too granular
             return "1h"
    # 1y -> Long term
    elif range_filter == "1y" or range_filter == "ytd":
         if interval in ["1m", "2m", "5m", "15m", "30m"]:
             return "1d"
             
    return interval

def get_chart_data(ticker: str, range_filter: str, interval_filter: str = None) -> ChartResponse:
    # Determine Interval
    period = range_filter
    interval = interval_filter
    
    if not interval:
        p, i = map_range_to_yf_interval(range_filter)
        period = p
        interval = i
    else:
        # Validate user/frontend provided interval
        interval = validate_interval_for_range(period, interval)
        
    if period == "ALL": period = "max"
        
    # ROUTING FOR CRYPTO
    if ticker in TICKERS_CRYPTO:
        # Pass period so fetcher can calculate start time and loop
        data_points = fetch_crypto_history(ticker, interval, period)
        if data_points:
             return ChartResponse(ticker=ticker, region="CRYPTO", interval=interval, data=data_points)

    try:
        stock = yf.Ticker(ticker)
        if ".NS" not in ticker and ticker in [t.replace(".NS", "") for t in TICKERS_IN]:
            stock = yf.Ticker(f"{ticker}.NS")
            
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return ChartResponse(ticker=ticker, region="Unknown", interval=interval, data=[])

        data_points = parse_yf_history(hist, interval)
            
        return ChartResponse(ticker=ticker, region="US", interval=interval, data=data_points)
            
    except Exception as e:
        print(f"Error fetching chart for {ticker}: {e}")
        return ChartResponse(ticker=ticker, region="Error", interval=interval or "1d", data=[])

def get_signal_from_technical(ticker: str) -> Signal:
    try:
        # Fetch data (1mo history to calculate indicators)
        stock = yf.Ticker(ticker)

        hist = stock.history(period="1mo")
        
        if hist.empty:
            raise ValueError(f"No historical data found for {ticker}")

        current_price = hist['Close'].iloc[-1]
        
        # Calculate RSI
        rsi_series = calculate_rsi(hist['Close'])
        rsi = rsi_series.iloc[-1] if not pd.isna(rsi_series.iloc[-1]) else 50.0

        # Calculate SMA
        sma_20 = hist['Close'].rolling(window=20).mean().iloc[-1]
        
        # Logic
        action = SignalAction.NEUTRAL
        confidence = 50.0
        
        drivers: List[SignalDriver] = []

        if rsi < 35:
            action = SignalAction.BUY
            confidence = 80 + (35 - rsi)
            drivers.append(SignalDriver(label="RSI Oversold", value=round(80 + (35-rsi)), sentiment="Bullish"))
        elif rsi > 70:
            action = SignalAction.SELL
            confidence = 80 + (rsi - 70)
            drivers.append(SignalDriver(label="RSI Overbought", value=round(80 + (rsi-70)), sentiment="Bearish"))
        else:
             # Trend check
             if current_price > sma_20:
                 action = SignalAction.BUY
                 confidence = 60.0
                 drivers.append(SignalDriver(label="Above 20 SMA", value=60, sentiment="Bullish"))
             else:
                 action = SignalAction.SELL
                 confidence = 60.0
                 drivers.append(SignalDriver(label="Below 20 SMA", value=60, sentiment="Bearish"))

        # Add random secondary driver for flavor
        secondary_driver = random.choice(DRIVERS) # NOSONAR
        if secondary_driver not in [d.label for d in drivers]:
             drivers.append(SignalDriver(label=secondary_driver, value=random.randint(40, 80), sentiment="Neutral"))
        
        # Clean ticker name
        clean_name = ticker.replace(".NS", "")
        currency = "₹" if ".NS" in ticker else "$"

        return Signal(
            id=f"sig_{ticker}_{int(datetime.now().timestamp())}",
            ticker=clean_name,
            name=f"{clean_name} Corp", # Can use stock.info['shortName'] but slow
            price=f"{currency}{current_price:,.2f}",
            action=action,
            confidence=round(min(confidence, 99.9), 1),
            uncertainty=round(random.uniform(2.0, 8.5), 1), # Still estimated
            timestamp=datetime.now().strftime("%I:%M %p"),
            model="Technical Analysis v1",
            drivers=drivers
        )

    except Exception as e:
        print(f"Error fetching {ticker}: {e}")
        # Fallback to mock if API fails
        return generate_mock_signal_fallback(ticker)

def generate_mock_signal_fallback(ticker: str) -> Signal:
    # ... allow fallback ...
    clean_name = ticker.replace(".NS", "")
    return Signal(
        id=f"err_{random.randint(1000, 9999)}",
        ticker=clean_name,
        name=clean_name,
        price="N/A",
        action=SignalAction.NEUTRAL,
        confidence=0,
        uncertainty=0,
        timestamp=datetime.now().strftime("%I:%M %p"),
        model="System Error",
        drivers=[]
    )

def get_market_signals(market: MarketRegion) -> SignalResponse:
    tickers = []
    if market == MarketRegion.IN:
        tickers = TICKERS_IN
    elif market == MarketRegion.US:
        tickers = TICKERS_US
    elif market == MarketRegion.CRYPTO:
        tickers = TICKERS_CRYPTO
    signals = []
    
    # Analyze all tickers
    for t in tickers:
        signals.append(get_signal_from_technical(t))
    
    return SignalResponse(
        signals=signals,
        market=market,
        count=len(signals)
    )

def get_ticker_news(ticker: str) -> NewsResponse:
    try:
        # Normalize ticker
        search_ticker = ticker
        if ".NS" not in ticker and ticker in [t.replace(".NS", "") for t in TICKERS_IN]:
            search_ticker = f"{ticker}.NS"
            
        stock = yf.Ticker(search_ticker)
        news_data = stock.news
        
        items = []
        for n in news_data:
            # Check if content is nested (some versions)
            item = n.get('content', n)
            
            sentiment = random.choice(["positive", "negative", "neutral"]) # Placeholder
            
            # Map Correct Keys
            provider = item.get('provider', {})
            source_name = provider.get('displayName', 'Yahoo Finance')
            
            # URL: Try clickThrough -> canonical
            url_obj = item.get('clickThroughUrl') or item.get('canonicalUrl') or {}
            url = url_obj.get('url', '#')
            
            # Title
            title = item.get('title', 'No Title')
            
            # Time: pubDate is widely used now
            published = item.get('pubDate') or datetime.now().isoformat()
            
            items.append(NewsItem(
                id=item.get('id', str(random.randint(1000,9999))),
                title=title,
                source=source_name,
                published_at=published,
                url=url,
                sentiment=sentiment,
                tickers=[ticker]
            ))
            
        return NewsResponse(ticker=ticker, news=items)
            
    except Exception as e:
        print(f"Error fetching news for {ticker}: {e}")
        return NewsResponse(ticker=ticker, news=[])

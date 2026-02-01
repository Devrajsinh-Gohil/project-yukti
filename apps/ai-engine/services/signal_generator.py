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

def get_chart_data(ticker: str, range_filter: str) -> ChartResponse:
    # Map range to yfinance period & interval
    # Ranges: 1m, 5m, 15m, 1H, 4H, D, 1W, 1M, 1Y, 5Y, ALL
    # yf periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    # yf intervals: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo
    
    period = "1mo"
    interval = "1d"
    
    if range_filter == "1m":
        period = "1d"
        interval = "1m"
    elif range_filter == "5m":
        period = "1d"
        interval = "5m"
    elif range_filter == "15m":
        period = "5d"
        interval = "15m"
    elif range_filter == "1H":
         period = "1mo" # 1 month of hourly data
         interval = "1h"
    elif range_filter == "4H":
         period = "3mo" # yfinance doesn't natively support 4h, use 1h and we could aggregate or just return 1h
         interval = "1h" # Fallback to 1h
    elif range_filter == "D":
        period = "1y"
        interval = "1d"
    elif range_filter == "1Y":
        period = "1y"
        interval = "1d"
    elif range_filter == "ALL":
        period = "max"
        interval = "1wk" # Efficient for all time
        
    try:
        stock = yf.Ticker(ticker)
        # Handle .NS if generic
        if ".NS" not in ticker and ticker in [t.replace(".NS", "") for t in TICKERS_IN]:
            stock = yf.Ticker(f"{ticker}.NS")
            
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return ChartResponse(ticker=ticker, region="Unknown", interval=interval, data=[])

        data_points = []
        for index, row in hist.iterrows():
            # index is datetime
            time_str = index.strftime("%Y-%m-%d")
            # For intraday (1m, 5m, 1h), we need timestamps or full ISO
            if interval in ["1m", "5m", "15m", "1h"]:
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
            
        return ChartResponse(
            ticker=ticker, 
            region="US", # Placeholder
            interval=interval, 
            data=data_points
        )
            
    except Exception as e:
        print(f"Error fetching chart for {ticker}: {e}")
        return ChartResponse(ticker=ticker, region="Error", interval=interval, data=[])

def get_signal_from_technical(ticker: str) -> Signal:
    try:
        # Fetch data (1mo history to calculate indicators)
        stock = yf.Ticker(ticker)

        hist = stock.history(period="1mo")
        
        if hist.empty:
            raise Exception("No data")

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
        secondary_driver = random.choice(DRIVERS)
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
    tickers = TICKERS_IN if market == MarketRegion.IN else TICKERS_US
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

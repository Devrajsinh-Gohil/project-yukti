import yfinance as yf
import json

def debug_news(ticker):
    stock = yf.Ticker(ticker)
    news = stock.news
    if news:
        item = news[0]
        # Check if it is a dictionary wrapper
        if 'content' in item:
            item = item['content']
            
        print("Keys:", item.keys())
        print("Title:", item.get('title', 'N/A'))
        print("Publisher:", item.get('publisher', 'N/A')) # Old key?
        print("Provider:", item.get('provider', 'N/A')) # New key?
        print("Link:", item.get('link', 'N/A'))
        print("Canonical:", item.get('canonicalUrl', 'N/A'))
        print("ClickThrough:", item.get('clickThroughUrl', 'N/A'))
        print("PublishTime:", item.get('providerPublishTime', 'N/A'))
    else:
        print("No news found")

if __name__ == "__main__":
    debug_news("RELIANCE.NS")

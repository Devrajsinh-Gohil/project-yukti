import asyncio
import redis.asyncio as redis
import os
import json
import logging

# Configure logger
logger = logging.getLogger("uvicorn")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Global Broadcaster
class StreamBroadcaster:
    def __init__(self):
        self.subscribers = []

    async def subscribe(self):
        queue = asyncio.Queue()
        self.subscribers.append(queue)
        try:
            while True:
                data = await queue.get()
                yield data
        except asyncio.CancelledError: # NOSONAR
            self.subscribers.remove(queue)
            raise

    def publish(self, data):
        for queue in self.subscribers:
            queue.put_nowait(data)

broadcaster = StreamBroadcaster()

async def listen_to_market_data():
    """
    Connects to Redis Pub/Sub and listens for market trades.
    Includes auto-reconnection logic.
    """
    while True:
        try:
            logger.info(f"🔌 Connecting to Redis at {REDIS_URL}...")
            r = redis.from_url(REDIS_URL, decode_responses=True)
            pubsub = r.pubsub()
            
            # Subscribe to all market trades
            await pubsub.psubscribe("market.trade.*")
            logger.info("✅ Subscribed to 'market.trade.*'")

            async for message in pubsub.listen():
                if message["type"] in ["message", "pmessage"]:
                    data = message["data"]
                    
                    try:
                        trade = json.loads(data)
                        # Broadcast to SSE clients
                        broadcaster.publish(json.dumps(trade))
                        
                        logger.debug(f"🔥 RELAY: {trade.get('symbol')} @ {trade.get('price')}")
                    except json.JSONDecodeError:
                        logger.error("Failed to decode trade JSON")
        except Exception as e:
            logger.error(f"❌ Redis Listener Error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)

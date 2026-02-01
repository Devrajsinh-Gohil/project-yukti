from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from services.mq_listener import broadcaster
import asyncio

router = APIRouter()

@router.get("/stream")
async def stream_market_data():
    """
    Server-Sent Events (SSE) endpoint for real-time market data.
    """
    return EventSourceResponse(
        broadcaster.subscribe()
    )

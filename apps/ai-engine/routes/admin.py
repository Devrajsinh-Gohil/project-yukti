from fastapi import APIRouter
from models import SystemStats
import random
import time

router = APIRouter()

START_TIME = time.time()

@router.get("/stats", response_model=SystemStats)
async def get_system_stats():
    """
    Get current system status and usage metrics.
    """
    return SystemStats(
        cpu_usage=round(random.uniform(10.0, 45.0), 1),
        memory_usage=round(random.uniform(20.0, 60.0), 1),
        active_connections=random.randint(5, 50),
        total_api_calls=random.randint(1000, 50000),
        uptime_seconds=int(time.time() - START_TIME)
    )

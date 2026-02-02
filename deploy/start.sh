#!/bin/bash
# deploy/start.sh

# Load env if exists
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

echo ">>> Pruning old images..."
docker system prune -f

echo ">>> Building and starting services..."
# Build without cache to ensure fresh code
docker compose build --no-cache

# Start in background
docker compose up -d

echo ">>> Services are running!"
docker compose ps

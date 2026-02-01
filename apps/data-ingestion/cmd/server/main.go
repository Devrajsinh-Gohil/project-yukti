package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/Devrajsinh-Gohil/project-yukti/apps/data-ingestion/internal/adapters/binance"
	"github.com/Devrajsinh-Gohil/project-yukti/apps/data-ingestion/internal/adapters/redis"
)

func main() {
	log.Println("Starting Data Ingestion Service (Binance Adapter)...")

	// 1. Initialize Adapters
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = os.Getenv("REDIS_URL") // Support legacy
	}
	if redisAddr == "" {
		// Fallback for local dev if env not set
		redisAddr = "localhost:6379"
	}
	redisPub := redis.NewRedisPublisher(redisAddr)
	defer redisPub.Close()

	binanceClient := binance.NewBinanceClient()

	// 2. Subscribe to Crypto Pairs
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pairs := []string{"btcusdt", "ethusdt", "solusdt"}
	for _, p := range pairs {
		if err := binanceClient.Subscribe(ctx, p); err != nil {
			log.Fatalf("Failed to subscribe to %s: %v", p, err)
		}
	}

	// 3. Consume Data (Firehose)
	go func() {
		for trade := range binanceClient.GetTrades() {
			log.Printf("Ingest: [%s] $%.2f (Size: %.4f)", trade.Symbol, trade.Price, trade.Size)

			// Publish to Redis
			if err := redisPub.PublishTrade(ctx, trade); err != nil {
				log.Printf("Error publishing to Redis: %v", err)
			}
		}
	}()

	// Graceful Shutdown Channel
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Block until signal received
	sig := <-sigChan
	log.Printf("Received signal: %v. Shutting down...", sig)
	binanceClient.Close()
}

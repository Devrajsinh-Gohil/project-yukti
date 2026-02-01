package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/Devrajsinh-Gohil/project-yukti/apps/data-ingestion/internal/domain"
	"github.com/redis/go-redis/v9"
)

// RedisPublisher implements ports.EventPublisher
type RedisPublisher struct {
	client *redis.Client
}

func NewRedisPublisher(addr string) *RedisPublisher {
	rdb := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	// Ping to check connection
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Printf("Warning: Failed to connect to Redis at %s: %v", addr, err)
	} else {
		log.Printf("Connected to Redis at %s", addr)
	}

	return &RedisPublisher{client: rdb}
}

func (p *RedisPublisher) PublishTrade(ctx context.Context, trade domain.Trade) error {
	payload, err := json.Marshal(trade)
	if err != nil {
		return fmt.Errorf("marshal error: %w", err)
	}

	// Topic: market.trade.{symbol} -> e.g. market.trade.btcusdt
	// Using a channel allows AI engine to subscribe to patterns or specific symbols
	channel := fmt.Sprintf("market.trade.%s", trade.Symbol)

	return p.client.Publish(ctx, channel, payload).Err()
}

func (p *RedisPublisher) Close() error {
	return p.client.Close()
}

package binance

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/Devrajsinh-Gohil/project-yukti/apps/data-ingestion/internal/domain"
	"github.com/gorilla/websocket"
	"github.com/shopspring/decimal"
)

const BaseURL = "wss://stream.binance.com:9443/ws"

// BinanceClient implements ports.IngestionProvider
type BinanceClient struct {
	tradeChan  chan domain.Trade
	subscribed []string
}

func NewBinanceClient() *BinanceClient {
	return &BinanceClient{
		tradeChan:  make(chan domain.Trade, 100), // Buffer for high throughput
		subscribed: []string{},
	}
}

func (c *BinanceClient) GetTrades() <-chan domain.Trade {
	return c.tradeChan
}

// Subscribe connects to the websocket for the given symbol (e.g., "BTCUSDT")
// Note: Binance typically uses lowercase for streams (btcusdt@trade)
func (c *BinanceClient) Subscribe(ctx context.Context, symbol string) error {
	c.subscribed = append(c.subscribed, symbol)
	// Start persistent listener for this symbol
	go c.listenLoop(ctx, symbol)
	return nil
}

func (c *BinanceClient) listenLoop(ctx context.Context, symbol string) {
	streamName := fmt.Sprintf("%s@trade", strings.ToLower(symbol))
	url := fmt.Sprintf("%s/%s", BaseURL, streamName)

	for {
		// Check context before dialing
		select {
		case <-ctx.Done():
			return
		default:
		}

		log.Printf("Connecting to Binance: %s", url)
		conn, _, err := websocket.DefaultDialer.Dial(url, nil)
		if err != nil {
			log.Printf("Error connecting to %s: %v. Retrying in 5s...", symbol, err)
			time.Sleep(5 * time.Second)
			continue
		}

		// Read loop
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("Read error for %s: %v", symbol, err)
				break // Return to outer dial loop
			}

			var event AggTradeEvent
			if err := json.Unmarshal(message, &event); err != nil {
				log.Printf("Unmarshal error: %v", err)
				continue
			}

			// Normalize to domain.Trade
			price, err := decimal.NewFromString(event.Price)
			if err != nil {
				log.Printf("Error parsing price '%s' for %s: %v", event.Price, symbol, err)
				continue
			}

			size, err := decimal.NewFromString(event.Quantity)
			if err != nil {
				log.Printf("Error parsing size '%s' for %s: %v", event.Quantity, symbol, err)
				continue
			}

			trade := domain.Trade{
				Symbol:    event.Symbol,
				Price:     price,
				Size:      size,
				Timestamp: time.UnixMilli(event.TradeTime),
				Exchange:  "Binance",
			}

			c.tradeChan <- trade
		}

		conn.Close()
		log.Printf("Connection lost for %s. Reconnecting...", symbol)
		time.Sleep(1 * time.Second)
	}
}

func (c *BinanceClient) Close() error {
	// Simple cleanup, context cancellation handles the loops
	return nil
}

// --- Internal Helper Types ---

// AggTradeEvent matches Binance JSON format
type AggTradeEvent struct {
	Type      string `json:"e"`
	EventTime int64  `json:"E"`
	Symbol    string `json:"s"`
	TradeID   int64  `json:"t"`
	Price     string `json:"p"`
	Quantity  string `json:"q"`
	TradeTime int64  `json:"T"`
	IsBuyer   bool   `json:"m"`
}

package ports

import (
	"context"

	"github.com/Devrajsinh-Gohil/project-yukti/apps/data-ingestion/internal/domain"
)

// IngestionProvider defines the contract for any source of market data (Binance, Alpaca, etc).
type IngestionProvider interface {
	// Subscribe starts listening for updates for a specific symbol.
	Subscribe(ctx context.Context, symbol string) error

	// GetTrades returns a read-only channel where normalized trades are sent.
	GetTrades() <-chan domain.Trade

	// Close cleans up connections.
	Close() error
}

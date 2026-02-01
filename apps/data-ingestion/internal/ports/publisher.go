package ports

import (
	"context"

	"github.com/Devrajsinh-Gohil/project-yukti/apps/data-ingestion/internal/domain"
)

// EventPublisher defines the contract for broadcasting market events.
type EventPublisher interface {
	// PublishTrade broadcasts a trade event to the system.
	PublishTrade(ctx context.Context, trade domain.Trade) error

	// Close cleans up connections.
	Close() error
}

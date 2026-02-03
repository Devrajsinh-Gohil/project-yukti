package domain

import (
	"time"

	"github.com/shopspring/decimal"
)

// Trade represents a single transaction on an exchange.
type Trade struct {
	Symbol    string          `json:"symbol"`
	Price     decimal.Decimal `json:"price"`
	Size      decimal.Decimal `json:"size"`
	Timestamp time.Time       `json:"timestamp"`
	Exchange  string          `json:"exchange"`
}

// Quote represents the current bid/ask.
type Quote struct {
	Symbol    string          `json:"symbol"`
	BidPrice  decimal.Decimal `json:"bid_price"`
	BidSize   decimal.Decimal `json:"bid_size"`
	AskPrice  decimal.Decimal `json:"ask_price"`
	AskSize   decimal.Decimal `json:"ask_size"`
	Timestamp time.Time       `json:"timestamp"`
}

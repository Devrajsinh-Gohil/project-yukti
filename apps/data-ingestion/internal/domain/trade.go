package domain

import "time"

// Trade represents a single transaction on an exchange.
type Trade struct {
	Symbol    string    `json:"symbol"`
	Price     float64   `json:"price"`
	Size      float64   `json:"size"`
	Timestamp time.Time `json:"timestamp"`
	Exchange  string    `json:"exchange"`
}

// Quote represents the current bid/ask.
type Quote struct {
	Symbol    string    `json:"symbol"`
	BidPrice  float64   `json:"bid_price"`
	BidSize   float64   `json:"bid_size"`
	AskPrice  float64   `json:"ask_price"`
	AskSize   float64   `json:"ask_size"`
	Timestamp time.Time `json:"timestamp"`
}

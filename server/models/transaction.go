package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Transaction represents a buy or sell transaction for a stock
type Transaction struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PortfolioID primitive.ObjectID `bson:"portfolio_id" json:"portfolioId"`
	UserID      primitive.ObjectID `bson:"user_id" json:"userId"`
	Symbol      string             `bson:"symbol" json:"symbol"`
	Action      string             `bson:"action" json:"action"`
	Shares      float64            `bson:"shares" json:"shares"`
	Price       float64            `bson:"price" json:"price"`
	Currency    string             `bson:"currency" json:"currency"`
	Fees        float64            `bson:"fees" json:"fees"`
	Date        time.Time          `bson:"date" json:"date"`
	CreatedAt   time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updatedAt"`
}

// TransactionRequest represents the request body for creating/updating a transaction
type TransactionRequest struct {
	Symbol   string    `json:"symbol" binding:"required"`
	Action   string    `json:"action" binding:"required,oneof=buy sell"`
	Shares   float64   `json:"shares" binding:"required,gt=0"`
	Price    float64   `json:"price" binding:"required,gt=0"`
	Currency string    `json:"currency" binding:"required,oneof=USD RMB"`
	Fees     float64   `json:"fees" binding:"gte=0"`
	Date     time.Time `json:"date" binding:"required"`
}

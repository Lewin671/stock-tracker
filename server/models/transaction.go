package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Transaction represents a buy or sell transaction for a stock
type Transaction struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PortfolioID primitive.ObjectID `bson:"portfolio_id" json:"portfolioId" binding:"required"`
	UserID      primitive.ObjectID `bson:"user_id" json:"userId" binding:"required"`
	Symbol      string             `bson:"symbol" json:"symbol" binding:"required"`
	Action      string             `bson:"action" json:"action" binding:"required,oneof=buy sell"`
	Shares      float64            `bson:"shares" json:"shares" binding:"required,gt=0"`
	Price       float64            `bson:"price" json:"price" binding:"required,gt=0"`
	Currency    string             `bson:"currency" json:"currency" binding:"required,oneof=USD RMB"`
	Fees        float64            `bson:"fees" json:"fees" binding:"gte=0"`
	Date        time.Time          `bson:"date" json:"date" binding:"required"`
	CreatedAt   time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updatedAt"`
}

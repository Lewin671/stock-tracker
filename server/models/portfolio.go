package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Portfolio represents a user's stock portfolio entry
type Portfolio struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID  `bson:"user_id" json:"userId" binding:"required"`
	Symbol       string              `bson:"symbol" json:"symbol" binding:"required"`
	AssetStyleID *primitive.ObjectID `bson:"asset_style_id,omitempty" json:"assetStyleId"` // Reference to AssetStyle
	AssetClass   string              `bson:"asset_class,omitempty" json:"assetClass"`      // Stock, ETF, Bond, Cash and Equivalents
	CreatedAt    time.Time           `bson:"created_at" json:"createdAt"`
	UpdatedAt    time.Time           `bson:"updated_at" json:"updatedAt"`
}

// UpdatePortfolioMetadataRequest represents the request body for updating portfolio metadata
type UpdatePortfolioMetadataRequest struct {
	AssetStyleID string `json:"assetStyleId" binding:"required"`
	AssetClass   string `json:"assetClass" binding:"required,oneof=Stock ETF Bond 'Cash and Equivalents'"`
}

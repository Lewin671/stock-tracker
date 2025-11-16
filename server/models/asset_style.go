package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AssetStyle represents a user-defined asset style classification
type AssetStyle struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"userId" binding:"required"`
	Name      string             `bson:"name" json:"name" binding:"required,max=50"`
	CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}

// AssetStyleRequest represents the request body for creating/updating an asset style
type AssetStyleRequest struct {
	Name string `json:"name" binding:"required,max=50"`
}

// AssetStyleResponse represents the response with usage count
type AssetStyleResponse struct {
	ID         string    `json:"id"`
	UserID     string    `json:"userId"`
	Name       string    `json:"name"`
	UsageCount int64     `json:"usageCount"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// DeleteAssetStyleRequest represents the request for deleting an asset style
type DeleteAssetStyleRequest struct {
	NewStyleID string `json:"newStyleId"` // Optional: required only if asset style is in use
}

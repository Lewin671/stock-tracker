package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Portfolio represents a user's stock portfolio entry
type Portfolio struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID `bson:"user_id" json:"userId" binding:"required"`
	Symbol    string             `bson:"symbol" json:"symbol" binding:"required"`
	CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}

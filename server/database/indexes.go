package database

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateIndexes creates all necessary database indexes
func CreateIndexes() error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Create indexes for Users collection
	if err := createUserIndexes(ctx); err != nil {
		return err
	}

	// Create indexes for Portfolios collection
	if err := createPortfolioIndexes(ctx); err != nil {
		return err
	}

	// Create indexes for Transactions collection
	if err := createTransactionIndexes(ctx); err != nil {
		return err
	}

	log.Println("Successfully created all database indexes")
	return nil
}

// createUserIndexes creates indexes for the users collection
func createUserIndexes(ctx context.Context) error {
	collection := Database.Collection("users")

	// Unique index on email
	emailIndex := mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	}

	_, err := collection.Indexes().CreateOne(ctx, emailIndex)
	if err != nil {
		return err
	}

	log.Println("Created index on users.email")
	return nil
}

// createPortfolioIndexes creates indexes for the portfolios collection
func createPortfolioIndexes(ctx context.Context) error {
	collection := Database.Collection("portfolios")

	// Index on user_id
	userIDIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}},
	}

	// Compound unique index on user_id + symbol
	userSymbolIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "symbol", Value: 1},
		},
		Options: options.Index().SetUnique(true),
	}

	indexes := []mongo.IndexModel{userIDIndex, userSymbolIndex}
	_, err := collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		return err
	}

	log.Println("Created indexes on portfolios collection")
	return nil
}

// createTransactionIndexes creates indexes for the transactions collection
func createTransactionIndexes(ctx context.Context) error {
	collection := Database.Collection("transactions")

	// Index on user_id
	userIDIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}},
	}

	// Index on portfolio_id
	portfolioIDIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "portfolio_id", Value: 1}},
	}

	// Compound index on user_id + symbol
	userSymbolIndex := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "symbol", Value: 1},
		},
	}

	// Index on date
	dateIndex := mongo.IndexModel{
		Keys: bson.D{{Key: "date", Value: 1}},
	}

	indexes := []mongo.IndexModel{
		userIDIndex,
		portfolioIDIndex,
		userSymbolIndex,
		dateIndex,
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		return err
	}

	log.Println("Created indexes on transactions collection")
	return nil
}

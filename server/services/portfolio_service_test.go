package services

import (
	"context"
	"stock-portfolio-tracker/database"
	"stock-portfolio-tracker/models"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// setupPortfolioTest sets up a test environment
func setupPortfolioTest(t *testing.T) (*PortfolioService, primitive.ObjectID, primitive.ObjectID, func()) {
	// Connect to test database
	mongoURI := "mongodb://localhost:27017/stock_portfolio_test"
	if err := database.Connect(mongoURI); err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	stockService := NewStockAPIService()
	currencyService := NewCurrencyService()
	service := NewPortfolioService(stockService, currencyService)
	
	userID := primitive.NewObjectID()
	assetStyleID := primitive.NewObjectID()

	// Create a test asset style
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	assetStyle := models.AssetStyle{
		ID:        assetStyleID,
		UserID:    userID,
		Name:      "Test Style",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err := database.Database.Collection("asset_styles").InsertOne(ctx, assetStyle)
	if err != nil {
		t.Fatalf("Failed to create test asset style: %v", err)
	}

	// Cleanup function
	cleanup := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Clean up test data
		database.Database.Collection("portfolios").DeleteMany(ctx, bson.M{"user_id": userID})
		database.Database.Collection("transactions").DeleteMany(ctx, bson.M{"user_id": userID})
		database.Database.Collection("asset_styles").DeleteMany(ctx, bson.M{"user_id": userID})
		database.Disconnect()
	}

	return service, userID, assetStyleID, cleanup
}

func TestUpdatePortfolioMetadata(t *testing.T) {
	service, userID, assetStyleID, cleanup := setupPortfolioTest(t)
	defer cleanup()

	// Create a portfolio
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	portfolio := models.Portfolio{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Symbol:    "AAPL",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err := database.Database.Collection("portfolios").InsertOne(ctx, portfolio)
	if err != nil {
		t.Fatalf("Failed to create portfolio: %v", err)
	}

	// Update portfolio metadata
	err = service.UpdatePortfolioMetadata(userID, portfolio.ID, assetStyleID, "Stock")
	if err != nil {
		t.Fatalf("Failed to update portfolio metadata: %v", err)
	}

	// Verify update
	var updated models.Portfolio
	err = database.Database.Collection("portfolios").FindOne(ctx, bson.M{"_id": portfolio.ID}).Decode(&updated)
	if err != nil {
		t.Fatalf("Failed to get updated portfolio: %v", err)
	}

	if updated.AssetStyleID == nil || *updated.AssetStyleID != assetStyleID {
		t.Errorf("Expected asset style ID %v, got %v", assetStyleID, updated.AssetStyleID)
	}

	if updated.AssetClass != "Stock" {
		t.Errorf("Expected asset class 'Stock', got '%s'", updated.AssetClass)
	}
}

func TestCheckPortfolioExists(t *testing.T) {
	service, userID, assetStyleID, cleanup := setupPortfolioTest(t)
	defer cleanup()

	// Check non-existent portfolio
	exists, portfolio, err := service.CheckPortfolioExists(userID, "AAPL")
	if err != nil {
		t.Fatalf("Failed to check portfolio: %v", err)
	}

	if exists {
		t.Error("Expected portfolio to not exist")
	}

	if portfolio != nil {
		t.Error("Expected nil portfolio")
	}

	// Create a portfolio
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	newPortfolio := models.Portfolio{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		Symbol:       "AAPL",
		AssetStyleID: &assetStyleID,
		AssetClass:   "Stock",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	_, err = database.Database.Collection("portfolios").InsertOne(ctx, newPortfolio)
	if err != nil {
		t.Fatalf("Failed to create portfolio: %v", err)
	}

	// Check existing portfolio
	exists, portfolio, err = service.CheckPortfolioExists(userID, "AAPL")
	if err != nil {
		t.Fatalf("Failed to check portfolio: %v", err)
	}

	if !exists {
		t.Error("Expected portfolio to exist")
	}

	if portfolio == nil {
		t.Error("Expected non-nil portfolio")
	}

	if portfolio.Symbol != "AAPL" {
		t.Errorf("Expected symbol 'AAPL', got '%s'", portfolio.Symbol)
	}
}

func TestCreatePortfolioWithMetadata(t *testing.T) {
	service, userID, assetStyleID, cleanup := setupPortfolioTest(t)
	defer cleanup()

	// Create portfolio with metadata
	portfolioID, err := service.CreatePortfolioWithMetadata(userID, "MSFT", assetStyleID, "Stock")
	if err != nil {
		t.Fatalf("Failed to create portfolio with metadata: %v", err)
	}

	// Verify creation
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var portfolio models.Portfolio
	err = database.Database.Collection("portfolios").FindOne(ctx, bson.M{"_id": portfolioID}).Decode(&portfolio)
	if err != nil {
		t.Fatalf("Failed to get created portfolio: %v", err)
	}

	if portfolio.Symbol != "MSFT" {
		t.Errorf("Expected symbol 'MSFT', got '%s'", portfolio.Symbol)
	}

	if portfolio.AssetStyleID == nil || *portfolio.AssetStyleID != assetStyleID {
		t.Errorf("Expected asset style ID %v, got %v", assetStyleID, portfolio.AssetStyleID)
	}

	if portfolio.AssetClass != "Stock" {
		t.Errorf("Expected asset class 'Stock', got '%s'", portfolio.AssetClass)
	}
}

func TestUpdatePortfolioMetadataInvalidAssetClass(t *testing.T) {
	service, userID, assetStyleID, cleanup := setupPortfolioTest(t)
	defer cleanup()

	// Create a portfolio
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	portfolio := models.Portfolio{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Symbol:    "AAPL",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err := database.Database.Collection("portfolios").InsertOne(ctx, portfolio)
	if err != nil {
		t.Fatalf("Failed to create portfolio: %v", err)
	}

	// Try to update with invalid asset class
	err = service.UpdatePortfolioMetadata(userID, portfolio.ID, assetStyleID, "InvalidClass")
	if err == nil {
		t.Error("Expected error for invalid asset class")
	}
}

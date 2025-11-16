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

// setupAnalyticsTest sets up a test environment
func setupAnalyticsTest(t *testing.T) (*AnalyticsService, primitive.ObjectID, func()) {
	// Connect to test database
	mongoURI := "mongodb://localhost:27017/stock_portfolio_test"
	if err := database.Connect(mongoURI); err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	stockService := NewStockAPIService()
	currencyService := NewCurrencyService()
	portfolioService := NewPortfolioService(stockService, currencyService)
	service := NewAnalyticsService(portfolioService, currencyService, stockService)

	userID := primitive.NewObjectID()

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

	return service, userID, cleanup
}

func TestGetGroupedDashboardMetricsByAssetStyle(t *testing.T) {
	service, userID, cleanup := setupAnalyticsTest(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create asset styles
	style1 := models.AssetStyle{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Name:      "Growth",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	style2 := models.AssetStyle{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Name:      "Value",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err := database.Database.Collection("asset_styles").InsertMany(ctx, []interface{}{style1, style2})
	if err != nil {
		t.Fatalf("Failed to create asset styles: %v", err)
	}

	// Create portfolios with different asset styles
	portfolio1 := models.Portfolio{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		Symbol:       "AAPL",
		AssetStyleID: &style1.ID,
		AssetClass:   "Stock",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	portfolio2 := models.Portfolio{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		Symbol:       "MSFT",
		AssetStyleID: &style2.ID,
		AssetClass:   "Stock",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	_, err = database.Database.Collection("portfolios").InsertMany(ctx, []interface{}{portfolio1, portfolio2})
	if err != nil {
		t.Fatalf("Failed to create portfolios: %v", err)
	}

	// Note: In a real test, we would also create transactions and mock stock prices
	// For now, we just test that the method doesn't error

	// Get grouped metrics
	metrics, err := service.GetGroupedDashboardMetrics(userID, "USD", "assetStyle")
	if err != nil {
		t.Fatalf("Failed to get grouped dashboard metrics: %v", err)
	}

	if metrics.GroupBy != "assetStyle" {
		t.Errorf("Expected groupBy 'assetStyle', got '%s'", metrics.GroupBy)
	}

	if metrics.Currency != "USD" {
		t.Errorf("Expected currency 'USD', got '%s'", metrics.Currency)
	}
}

func TestGetGroupedDashboardMetricsByAssetClass(t *testing.T) {
	service, userID, cleanup := setupAnalyticsTest(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Create asset style
	style := models.AssetStyle{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Name:      "Default",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err := database.Database.Collection("asset_styles").InsertOne(ctx, style)
	if err != nil {
		t.Fatalf("Failed to create asset style: %v", err)
	}

	// Create portfolios with different asset classes
	portfolio1 := models.Portfolio{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		Symbol:       "AAPL",
		AssetStyleID: &style.ID,
		AssetClass:   "Stock",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	portfolio2 := models.Portfolio{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		Symbol:       "VOO",
		AssetStyleID: &style.ID,
		AssetClass:   "ETF",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	_, err = database.Database.Collection("portfolios").InsertMany(ctx, []interface{}{portfolio1, portfolio2})
	if err != nil {
		t.Fatalf("Failed to create portfolios: %v", err)
	}

	// Get grouped metrics
	metrics, err := service.GetGroupedDashboardMetrics(userID, "USD", "assetClass")
	if err != nil {
		t.Fatalf("Failed to get grouped dashboard metrics: %v", err)
	}

	if metrics.GroupBy != "assetClass" {
		t.Errorf("Expected groupBy 'assetClass', got '%s'", metrics.GroupBy)
	}
}

func TestGetGroupedDashboardMetricsInvalidGroupBy(t *testing.T) {
	service, userID, cleanup := setupAnalyticsTest(t)
	defer cleanup()

	// Try to get metrics with invalid groupBy
	_, err := service.GetGroupedDashboardMetrics(userID, "USD", "invalid")
	if err == nil {
		t.Error("Expected error for invalid groupBy parameter")
	}
}

func TestGetGroupedDashboardMetricsByCurrency(t *testing.T) {
	service, userID, cleanup := setupAnalyticsTest(t)
	defer cleanup()

	// Get grouped metrics by currency
	metrics, err := service.GetGroupedDashboardMetrics(userID, "USD", "currency")
	if err != nil {
		t.Fatalf("Failed to get grouped dashboard metrics: %v", err)
	}

	if metrics.GroupBy != "currency" {
		t.Errorf("Expected groupBy 'currency', got '%s'", metrics.GroupBy)
	}
}

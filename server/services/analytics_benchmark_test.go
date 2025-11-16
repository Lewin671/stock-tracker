package services

import (
	"context"
	"stock-portfolio-tracker/database"
	"stock-portfolio-tracker/models"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// BenchmarkGetGroupedDashboardMetrics benchmarks the grouping query performance
func BenchmarkGetGroupedDashboardMetrics(b *testing.B) {
	// Setup test database
	if err := database.Connect("mongodb://localhost:27017"); err != nil {
		b.Fatal("Failed to connect to database:", err)
	}
	defer database.Disconnect()

	// Create test user
	userID := primitive.NewObjectID()

	// Create asset styles
	assetStyleCollection := database.Database.Collection("asset_styles")
	ctx := context.Background()

	defaultStyle := models.AssetStyle{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Name:      "Default",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	growthStyle := models.AssetStyle{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Name:      "Growth",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	assetStyleCollection.InsertOne(ctx, defaultStyle)
	assetStyleCollection.InsertOne(ctx, growthStyle)

	// Create test portfolios
	portfolioCollection := database.Database.Collection("portfolios")
	portfolios := []interface{}{
		models.Portfolio{
			ID:           primitive.NewObjectID(),
			UserID:       userID,
			Symbol:       "AAPL",
			AssetStyleID: &defaultStyle.ID,
			AssetClass:   "Stock",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		models.Portfolio{
			ID:           primitive.NewObjectID(),
			UserID:       userID,
			Symbol:       "MSFT",
			AssetStyleID: &growthStyle.ID,
			AssetClass:   "Stock",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		models.Portfolio{
			ID:           primitive.NewObjectID(),
			UserID:       userID,
			Symbol:       "VOO",
			AssetStyleID: &defaultStyle.ID,
			AssetClass:   "ETF",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}
	portfolioCollection.InsertMany(ctx, portfolios)

	// Create services
	stockService := NewStockAPIService()
	currencyService := NewCurrencyService()
	portfolioService := NewPortfolioService(stockService, currencyService)
	analyticsService := NewAnalyticsService(portfolioService, currencyService, stockService)

	// Cleanup
	defer func() {
		assetStyleCollection.DeleteMany(ctx, primitive.M{"user_id": userID})
		portfolioCollection.DeleteMany(ctx, primitive.M{"user_id": userID})
	}()

	// Reset timer before benchmark
	b.ResetTimer()

	// Run benchmark
	for i := 0; i < b.N; i++ {
		_, err := analyticsService.GetGroupedDashboardMetrics(userID, "USD", "assetStyle")
		if err != nil {
			b.Fatal("GetGroupedDashboardMetrics failed:", err)
		}
	}
}

// BenchmarkGetGroupedDashboardMetricsByAssetClass benchmarks asset class grouping
func BenchmarkGetGroupedDashboardMetricsByAssetClass(b *testing.B) {
	// Setup test database
	if err := database.Connect("mongodb://localhost:27017"); err != nil {
		b.Fatal("Failed to connect to database:", err)
	}
	defer database.Disconnect()

	// Create test user
	userID := primitive.NewObjectID()

	// Create asset style
	assetStyleCollection := database.Database.Collection("asset_styles")
	ctx := context.Background()

	defaultStyle := models.AssetStyle{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Name:      "Default",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	assetStyleCollection.InsertOne(ctx, defaultStyle)

	// Create test portfolios
	portfolioCollection := database.Database.Collection("portfolios")
	portfolios := []interface{}{
		models.Portfolio{
			ID:           primitive.NewObjectID(),
			UserID:       userID,
			Symbol:       "AAPL",
			AssetStyleID: &defaultStyle.ID,
			AssetClass:   "Stock",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		models.Portfolio{
			ID:           primitive.NewObjectID(),
			UserID:       userID,
			Symbol:       "MSFT",
			AssetStyleID: &defaultStyle.ID,
			AssetClass:   "Stock",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
		models.Portfolio{
			ID:           primitive.NewObjectID(),
			UserID:       userID,
			Symbol:       "VOO",
			AssetStyleID: &defaultStyle.ID,
			AssetClass:   "ETF",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		},
	}
	portfolioCollection.InsertMany(ctx, portfolios)

	// Create services
	stockService := NewStockAPIService()
	currencyService := NewCurrencyService()
	portfolioService := NewPortfolioService(stockService, currencyService)
	analyticsService := NewAnalyticsService(portfolioService, currencyService, stockService)

	// Cleanup
	defer func() {
		assetStyleCollection.DeleteMany(ctx, primitive.M{"user_id": userID})
		portfolioCollection.DeleteMany(ctx, primitive.M{"user_id": userID})
	}()

	// Reset timer before benchmark
	b.ResetTimer()

	// Run benchmark
	for i := 0; i < b.N; i++ {
		_, err := analyticsService.GetGroupedDashboardMetrics(userID, "USD", "assetClass")
		if err != nil {
			b.Fatal("GetGroupedDashboardMetrics failed:", err)
		}
	}
}

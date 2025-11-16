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

// setupAssetStyleTest sets up a test environment
func setupAssetStyleTest(t *testing.T) (*AssetStyleService, primitive.ObjectID, func()) {
	// Connect to test database
	mongoURI := "mongodb://localhost:27017/stock_portfolio_test"
	if err := database.Connect(mongoURI); err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	service := NewAssetStyleService()
	userID := primitive.NewObjectID()

	// Cleanup function
	cleanup := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Clean up test data
		database.Database.Collection("asset_styles").DeleteMany(ctx, bson.M{"user_id": userID})
		database.Database.Collection("portfolios").DeleteMany(ctx, bson.M{"user_id": userID})
		database.Disconnect()
	}

	return service, userID, cleanup
}

func TestCreateAssetStyle(t *testing.T) {
	service, userID, cleanup := setupAssetStyleTest(t)
	defer cleanup()

	// Test creating a new asset style
	assetStyle, err := service.CreateAssetStyle(userID, "Growth Stocks")
	if err != nil {
		t.Fatalf("Failed to create asset style: %v", err)
	}

	if assetStyle.Name != "Growth Stocks" {
		t.Errorf("Expected name 'Growth Stocks', got '%s'", assetStyle.Name)
	}

	if assetStyle.UserID != userID {
		t.Errorf("Expected userID %v, got %v", userID, assetStyle.UserID)
	}
}

func TestCreateDuplicateAssetStyle(t *testing.T) {
	service, userID, cleanup := setupAssetStyleTest(t)
	defer cleanup()

	// Create first asset style
	_, err := service.CreateAssetStyle(userID, "Tech Stocks")
	if err != nil {
		t.Fatalf("Failed to create first asset style: %v", err)
	}

	// Try to create duplicate
	_, err = service.CreateAssetStyle(userID, "Tech Stocks")
	if err != ErrDuplicateAssetStyle {
		t.Errorf("Expected ErrDuplicateAssetStyle, got %v", err)
	}
}

func TestGetUserAssetStyles(t *testing.T) {
	service, userID, cleanup := setupAssetStyleTest(t)
	defer cleanup()

	// Create multiple asset styles
	names := []string{"Growth", "Value", "Dividend"}
	for _, name := range names {
		_, err := service.CreateAssetStyle(userID, name)
		if err != nil {
			t.Fatalf("Failed to create asset style '%s': %v", name, err)
		}
	}

	// Get all asset styles
	assetStyles, err := service.GetUserAssetStyles(userID)
	if err != nil {
		t.Fatalf("Failed to get asset styles: %v", err)
	}

	if len(assetStyles) != 3 {
		t.Errorf("Expected 3 asset styles, got %d", len(assetStyles))
	}
}

func TestUpdateAssetStyle(t *testing.T) {
	service, userID, cleanup := setupAssetStyleTest(t)
	defer cleanup()

	// Create asset style
	assetStyle, err := service.CreateAssetStyle(userID, "Old Name")
	if err != nil {
		t.Fatalf("Failed to create asset style: %v", err)
	}

	// Update asset style
	err = service.UpdateAssetStyle(userID, assetStyle.ID, "New Name")
	if err != nil {
		t.Fatalf("Failed to update asset style: %v", err)
	}

	// Verify update
	updated, err := service.GetAssetStyleByID(userID, assetStyle.ID)
	if err != nil {
		t.Fatalf("Failed to get updated asset style: %v", err)
	}

	if updated.Name != "New Name" {
		t.Errorf("Expected name 'New Name', got '%s'", updated.Name)
	}
}

func TestDeleteAssetStyleWithReassignment(t *testing.T) {
	service, userID, cleanup := setupAssetStyleTest(t)
	defer cleanup()

	// Create two asset styles
	style1, err := service.CreateAssetStyle(userID, "Style 1")
	if err != nil {
		t.Fatalf("Failed to create style 1: %v", err)
	}

	style2, err := service.CreateAssetStyle(userID, "Style 2")
	if err != nil {
		t.Fatalf("Failed to create style 2: %v", err)
	}

	// Create a portfolio using style1
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	portfolio := models.Portfolio{
		ID:           primitive.NewObjectID(),
		UserID:       userID,
		Symbol:       "AAPL",
		AssetStyleID: &style1.ID,
		AssetClass:   "Stock",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	_, err = database.Database.Collection("portfolios").InsertOne(ctx, portfolio)
	if err != nil {
		t.Fatalf("Failed to create portfolio: %v", err)
	}

	// Try to delete style1 without providing replacement (should fail)
	err = service.DeleteAssetStyle(userID, style1.ID, primitive.NilObjectID)
	if err != ErrAssetStyleInUse {
		t.Errorf("Expected ErrAssetStyleInUse, got %v", err)
	}

	// Delete style1 with reassignment to style2
	err = service.DeleteAssetStyle(userID, style1.ID, style2.ID)
	if err != nil {
		t.Fatalf("Failed to delete asset style with reassignment: %v", err)
	}

	// Verify portfolio was reassigned
	var updatedPortfolio models.Portfolio
	err = database.Database.Collection("portfolios").FindOne(ctx, bson.M{"_id": portfolio.ID}).Decode(&updatedPortfolio)
	if err != nil {
		t.Fatalf("Failed to get updated portfolio: %v", err)
	}

	if updatedPortfolio.AssetStyleID == nil || *updatedPortfolio.AssetStyleID != style2.ID {
		t.Errorf("Expected portfolio to be reassigned to style2")
	}
}

func TestCreateDefaultAssetStyle(t *testing.T) {
	service, userID, cleanup := setupAssetStyleTest(t)
	defer cleanup()

	// Create default asset style
	assetStyle, err := service.CreateDefaultAssetStyle(userID)
	if err != nil {
		t.Fatalf("Failed to create default asset style: %v", err)
	}

	if assetStyle.Name != "Default" {
		t.Errorf("Expected name 'Default', got '%s'", assetStyle.Name)
	}
}

func TestGetAssetStyleUsageCount(t *testing.T) {
	service, userID, cleanup := setupAssetStyleTest(t)
	defer cleanup()

	// Create asset style
	assetStyle, err := service.CreateAssetStyle(userID, "Test Style")
	if err != nil {
		t.Fatalf("Failed to create asset style: %v", err)
	}

	// Initially should have 0 usage
	count, err := service.GetAssetStyleUsageCount(assetStyle.ID)
	if err != nil {
		t.Fatalf("Failed to get usage count: %v", err)
	}

	if count != 0 {
		t.Errorf("Expected usage count 0, got %d", count)
	}

	// Create portfolios using this style
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	for i := 0; i < 3; i++ {
		portfolio := models.Portfolio{
			ID:           primitive.NewObjectID(),
			UserID:       userID,
			Symbol:       "TEST" + string(rune(i)),
			AssetStyleID: &assetStyle.ID,
			AssetClass:   "Stock",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		_, err = database.Database.Collection("portfolios").InsertOne(ctx, portfolio)
		if err != nil {
			t.Fatalf("Failed to create portfolio: %v", err)
		}
	}

	// Should now have 3 usages
	count, err = service.GetAssetStyleUsageCount(assetStyle.ID)
	if err != nil {
		t.Fatalf("Failed to get usage count: %v", err)
	}

	if count != 3 {
		t.Errorf("Expected usage count 3, got %d", count)
	}
}

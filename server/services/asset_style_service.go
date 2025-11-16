package services

import (
	"context"
	"errors"
	"fmt"
	"stock-portfolio-tracker/database"
	"stock-portfolio-tracker/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	ErrDuplicateAssetStyle = errors.New("asset style name already exists")
	ErrAssetStyleInUse     = errors.New("asset style is in use, please provide a replacement style ID")
	ErrAssetStyleNotFound  = errors.New("asset style not found")
	ErrDefaultAssetStyle   = errors.New("cannot delete the default asset style")
)

// AssetStyleService handles asset style operations
type AssetStyleService struct{}

// NewAssetStyleService creates a new AssetStyleService instance
func NewAssetStyleService() *AssetStyleService {
	return &AssetStyleService{}
}

// CreateAssetStyle creates a new asset style for a user
func (s *AssetStyleService) CreateAssetStyle(userID primitive.ObjectID, name string) (*models.AssetStyle, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("asset_styles")

	// Check if asset style with same name already exists for this user
	var existing models.AssetStyle
	err := collection.FindOne(ctx, bson.M{
		"user_id": userID,
		"name":    name,
	}).Decode(&existing)

	if err == nil {
		// Asset style with this name already exists
		return nil, ErrDuplicateAssetStyle
	}

	if err != mongo.ErrNoDocuments {
		return nil, fmt.Errorf("failed to check existing asset style: %w", err)
	}

	// Create new asset style
	assetStyle := &models.AssetStyle{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Name:      name,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err = collection.InsertOne(ctx, assetStyle)
	if err != nil {
		return nil, fmt.Errorf("failed to create asset style: %w", err)
	}

	return assetStyle, nil
}

// GetUserAssetStyles returns all asset styles for a user
func (s *AssetStyleService) GetUserAssetStyles(userID primitive.ObjectID) ([]models.AssetStyle, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("asset_styles")

	cursor, err := collection.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch asset styles: %w", err)
	}
	defer cursor.Close(ctx)

	var assetStyles []models.AssetStyle
	if err := cursor.All(ctx, &assetStyles); err != nil {
		return nil, fmt.Errorf("failed to decode asset styles: %w", err)
	}

	return assetStyles, nil
}

// UpdateAssetStyle updates an asset style name
func (s *AssetStyleService) UpdateAssetStyle(userID primitive.ObjectID, styleID primitive.ObjectID, name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("asset_styles")

	// Check if asset style exists and belongs to user
	var existing models.AssetStyle
	err := collection.FindOne(ctx, bson.M{
		"_id":     styleID,
		"user_id": userID,
	}).Decode(&existing)

	if err == mongo.ErrNoDocuments {
		return ErrAssetStyleNotFound
	}
	if err != nil {
		return fmt.Errorf("failed to find asset style: %w", err)
	}

	// Check if new name conflicts with another asset style
	var duplicate models.AssetStyle
	err = collection.FindOne(ctx, bson.M{
		"user_id": userID,
		"name":    name,
		"_id":     bson.M{"$ne": styleID},
	}).Decode(&duplicate)

	if err == nil {
		// Another asset style with this name exists
		return ErrDuplicateAssetStyle
	}

	if err != mongo.ErrNoDocuments {
		return fmt.Errorf("failed to check duplicate name: %w", err)
	}

	// Update the asset style
	update := bson.M{
		"$set": bson.M{
			"name":       name,
			"updated_at": time.Now(),
		},
	}

	result, err := collection.UpdateOne(ctx, bson.M{
		"_id":     styleID,
		"user_id": userID,
	}, update)

	if err != nil {
		return fmt.Errorf("failed to update asset style: %w", err)
	}

	if result.MatchedCount == 0 {
		return ErrAssetStyleNotFound
	}

	return nil
}

// DeleteAssetStyle deletes an asset style and optionally reassigns portfolios
func (s *AssetStyleService) DeleteAssetStyle(userID primitive.ObjectID, styleID primitive.ObjectID, newStyleID primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	assetStyleCollection := database.Database.Collection("asset_styles")

	// Check if asset style exists and belongs to user
	var assetStyle models.AssetStyle
	err := assetStyleCollection.FindOne(ctx, bson.M{
		"_id":     styleID,
		"user_id": userID,
	}).Decode(&assetStyle)

	if err == mongo.ErrNoDocuments {
		return ErrAssetStyleNotFound
	}
	if err != nil {
		return fmt.Errorf("failed to find asset style: %w", err)
	}

	// Check if this is the default asset style
	if assetStyle.Name == "Default" {
		return ErrDefaultAssetStyle
	}

	// Check usage count
	usageCount, err := s.GetAssetStyleUsageCount(styleID)
	if err != nil {
		return fmt.Errorf("failed to check usage count: %w", err)
	}

	// If asset style is in use, require a replacement
	if usageCount > 0 {
		if newStyleID.IsZero() {
			return ErrAssetStyleInUse
		}

		// Verify new style exists and belongs to user
		var newStyle models.AssetStyle
		err = assetStyleCollection.FindOne(ctx, bson.M{
			"_id":     newStyleID,
			"user_id": userID,
		}).Decode(&newStyle)

		if err == mongo.ErrNoDocuments {
			return fmt.Errorf("replacement asset style not found")
		}
		if err != nil {
			return fmt.Errorf("failed to verify replacement asset style: %w", err)
		}

		// Reassign all portfolios to new style
		portfolioCollection := database.Database.Collection("portfolios")
		_, err = portfolioCollection.UpdateMany(ctx, bson.M{
			"user_id":        userID,
			"asset_style_id": styleID,
		}, bson.M{
			"$set": bson.M{
				"asset_style_id": newStyleID,
				"updated_at":     time.Now(),
			},
		})

		if err != nil {
			return fmt.Errorf("failed to reassign portfolios: %w", err)
		}
	}

	// Delete the asset style
	result, err := assetStyleCollection.DeleteOne(ctx, bson.M{
		"_id":     styleID,
		"user_id": userID,
	})

	if err != nil {
		return fmt.Errorf("failed to delete asset style: %w", err)
	}

	if result.DeletedCount == 0 {
		return ErrAssetStyleNotFound
	}

	return nil
}

// GetAssetStyleUsageCount returns the number of portfolios using this style
func (s *AssetStyleService) GetAssetStyleUsageCount(styleID primitive.ObjectID) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("portfolios")

	count, err := collection.CountDocuments(ctx, bson.M{
		"asset_style_id": styleID,
	})

	if err != nil {
		return 0, fmt.Errorf("failed to count portfolios: %w", err)
	}

	return count, nil
}

// CreateDefaultAssetStyle creates the default asset style for a new user
func (s *AssetStyleService) CreateDefaultAssetStyle(userID primitive.ObjectID) (*models.AssetStyle, error) {
	return s.CreateAssetStyle(userID, "Default")
}

// GetAssetStyleByID returns an asset style by ID
func (s *AssetStyleService) GetAssetStyleByID(userID primitive.ObjectID, styleID primitive.ObjectID) (*models.AssetStyle, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("asset_styles")

	var assetStyle models.AssetStyle
	err := collection.FindOne(ctx, bson.M{
		"_id":     styleID,
		"user_id": userID,
	}).Decode(&assetStyle)

	if err == mongo.ErrNoDocuments {
		return nil, ErrAssetStyleNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find asset style: %w", err)
	}

	return &assetStyle, nil
}

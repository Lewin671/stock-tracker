package migrations

import (
	"context"
	"fmt"
	"stock-portfolio-tracker/database"
	"stock-portfolio-tracker/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// MigrateAssetMetadata migrates existing portfolios to include asset metadata
func MigrateAssetMetadata() error {
	fmt.Println("Starting asset metadata migration...")

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	usersCollection := database.Database.Collection("users")
	assetStylesCollection := database.Database.Collection("asset_styles")
	portfoliosCollection := database.Database.Collection("portfolios")

	// Get all users
	cursor, err := usersCollection.Find(ctx, bson.M{})
	if err != nil {
		return fmt.Errorf("failed to fetch users: %w", err)
	}
	defer cursor.Close(ctx)

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		return fmt.Errorf("failed to decode users: %w", err)
	}

	fmt.Printf("Found %d users to migrate\n", len(users))

	// For each user
	for _, user := range users {
		fmt.Printf("Migrating user: %s (%s)\n", user.Email, user.ID.Hex())

		// Check if user already has a "Default" asset style
		var existingStyle models.AssetStyle
		err := assetStylesCollection.FindOne(ctx, bson.M{
			"user_id": user.ID,
			"name":    "Default",
		}).Decode(&existingStyle)

		var defaultStyleID primitive.ObjectID

		if err == mongo.ErrNoDocuments {
			// Create "Default" asset style for this user
			defaultStyle := models.AssetStyle{
				ID:        primitive.NewObjectID(),
				UserID:    user.ID,
				Name:      "Default",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			_, err = assetStylesCollection.InsertOne(ctx, defaultStyle)
			if err != nil {
				fmt.Printf("Warning: Failed to create default asset style for user %s: %v\n", user.ID.Hex(), err)
				continue
			}

			defaultStyleID = defaultStyle.ID
			fmt.Printf("Created default asset style for user %s\n", user.ID.Hex())
		} else if err != nil {
			fmt.Printf("Warning: Failed to check existing asset style for user %s: %v\n", user.ID.Hex(), err)
			continue
		} else {
			defaultStyleID = existingStyle.ID
			fmt.Printf("User %s already has default asset style\n", user.ID.Hex())
		}

		// Update all portfolios for this user that don't have asset metadata
		result, err := portfoliosCollection.UpdateMany(ctx, bson.M{
			"user_id": user.ID,
			"$or": []bson.M{
				{"asset_style_id": bson.M{"$exists": false}},
				{"asset_style_id": nil},
			},
		}, bson.M{
			"$set": bson.M{
				"asset_style_id": defaultStyleID,
				"asset_class":    "Stock", // Default to Stock
				"updated_at":     time.Now(),
			},
		})

		if err != nil {
			fmt.Printf("Warning: Failed to update portfolios for user %s: %v\n", user.ID.Hex(), err)
			continue
		}

		fmt.Printf("Updated %d portfolios for user %s\n", result.ModifiedCount, user.ID.Hex())
	}

	fmt.Println("Asset metadata migration completed successfully")
	return nil
}

package handlers

import (
	"net/http"
	"stock-portfolio-tracker/models"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AssetStyleHandler handles asset style-related requests
type AssetStyleHandler struct {
	assetStyleService *services.AssetStyleService
}

// NewAssetStyleHandler creates a new AssetStyleHandler instance
func NewAssetStyleHandler(assetStyleService *services.AssetStyleService) *AssetStyleHandler {
	return &AssetStyleHandler{
		assetStyleService: assetStyleService,
	}
}

// GetAssetStyles returns all asset styles for the authenticated user
func (h *AssetStyleHandler) GetAssetStyles(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	userID, ok := userIDInterface.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Invalid user ID format",
			},
		})
		return
	}

	// Get asset styles
	assetStyles, err := h.assetStyleService.GetUserAssetStyles(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to fetch asset styles",
				"details": err.Error(),
			},
		})
		return
	}

	// Build response with usage counts
	responses := make([]models.AssetStyleResponse, 0, len(assetStyles))
	for _, style := range assetStyles {
		usageCount, err := h.assetStyleService.GetAssetStyleUsageCount(style.ID)
		if err != nil {
			// Log error but continue
			usageCount = 0
		}

		responses = append(responses, models.AssetStyleResponse{
			ID:         style.ID.Hex(),
			UserID:     style.UserID.Hex(),
			Name:       style.Name,
			UsageCount: usageCount,
			CreatedAt:  style.CreatedAt,
			UpdatedAt:  style.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"assetStyles": responses,
	})
}

// CreateAssetStyle creates a new asset style
func (h *AssetStyleHandler) CreateAssetStyle(c *gin.Context) {
	// Get user ID from context
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	userID, ok := userIDInterface.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Invalid user ID format",
			},
		})
		return
	}

	// Parse request body
	var req models.AssetStyleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid asset style data",
				"details": err.Error(),
			},
		})
		return
	}

	// Create asset style
	assetStyle, err := h.assetStyleService.CreateAssetStyle(userID, req.Name)
	if err != nil {
		if err == services.ErrDuplicateAssetStyle {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "DUPLICATE_ASSET_STYLE",
					"message": "Asset style name already exists",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to create asset style",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Asset style created successfully",
		"assetStyle": models.AssetStyleResponse{
			ID:         assetStyle.ID.Hex(),
			UserID:     assetStyle.UserID.Hex(),
			Name:       assetStyle.Name,
			UsageCount: 0,
			CreatedAt:  assetStyle.CreatedAt,
			UpdatedAt:  assetStyle.UpdatedAt,
		},
	})
}

// UpdateAssetStyle updates an existing asset style
func (h *AssetStyleHandler) UpdateAssetStyle(c *gin.Context) {
	// Get user ID from context
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	userID, ok := userIDInterface.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Invalid user ID format",
			},
		})
		return
	}

	// Get asset style ID from URL
	styleIDStr := c.Param("id")
	styleID, err := primitive.ObjectIDFromHex(styleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid asset style ID",
			},
		})
		return
	}

	// Parse request body
	var req models.AssetStyleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid asset style data",
				"details": err.Error(),
			},
		})
		return
	}

	// Update asset style
	err = h.assetStyleService.UpdateAssetStyle(userID, styleID, req.Name)
	if err != nil {
		if err == services.ErrAssetStyleNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "NOT_FOUND",
					"message": "Asset style not found",
				},
			})
			return
		}
		if err == services.ErrDuplicateAssetStyle {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "DUPLICATE_ASSET_STYLE",
					"message": "Asset style name already exists",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to update asset style",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Asset style updated successfully",
	})
}

// DeleteAssetStyle deletes an asset style
func (h *AssetStyleHandler) DeleteAssetStyle(c *gin.Context) {
	// Get user ID from context
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "UNAUTHORIZED",
				"message": "User not authenticated",
			},
		})
		return
	}

	userID, ok := userIDInterface.(primitive.ObjectID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Invalid user ID format",
			},
		})
		return
	}

	// Get asset style ID from URL
	styleIDStr := c.Param("id")
	styleID, err := primitive.ObjectIDFromHex(styleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid asset style ID",
			},
		})
		return
	}

	// Parse request body (optional newStyleId for reassignment)
	var req models.DeleteAssetStyleRequest
	_ = c.ShouldBindJSON(&req) // Ignore error as body is optional

	var newStyleID primitive.ObjectID
	if req.NewStyleID != "" {
		newStyleID, err = primitive.ObjectIDFromHex(req.NewStyleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": "Invalid replacement asset style ID",
				},
			})
			return
		}
	}

	// Delete asset style
	err = h.assetStyleService.DeleteAssetStyle(userID, styleID, newStyleID)
	if err != nil {
		if err == services.ErrAssetStyleNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "NOT_FOUND",
					"message": "Asset style not found",
				},
			})
			return
		}
		if err == services.ErrAssetStyleInUse {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "ASSET_STYLE_IN_USE",
					"message": "Asset style is in use. Please provide a replacement style ID",
				},
			})
			return
		}
		if err == services.ErrDefaultAssetStyle {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "CANNOT_DELETE_DEFAULT",
					"message": "Cannot delete the default asset style",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to delete asset style",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Asset style deleted successfully",
	})
}

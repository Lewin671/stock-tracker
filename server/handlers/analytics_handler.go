package handlers

import (
	"net/http"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AnalyticsHandler handles analytics-related requests
type AnalyticsHandler struct {
	analyticsService *services.AnalyticsService
}

// NewAnalyticsHandler creates a new AnalyticsHandler instance
func NewAnalyticsHandler(analyticsService *services.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsService: analyticsService,
	}
}

// GetDashboard returns dashboard metrics for the authenticated user
func (h *AnalyticsHandler) GetDashboard(c *gin.Context) {
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

	// Get currency from query parameter (default to USD)
	currency := c.DefaultQuery("currency", "USD")
	
	// Validate currency
	if currency != "USD" && currency != "RMB" && currency != "CNY" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid currency parameter. Must be USD or RMB",
			},
		})
		return
	}

	// Get dashboard metrics
	metrics, err := h.analyticsService.GetDashboardMetrics(userID, currency)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to fetch dashboard metrics",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// GetPerformance returns historical performance data for the authenticated user
func (h *AnalyticsHandler) GetPerformance(c *gin.Context) {
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

	// Get period from query parameter (default to 1M)
	period := c.DefaultQuery("period", "1M")
	
	// Validate period
	validPeriods := map[string]bool{"1M": true, "3M": true, "6M": true, "1Y": true}
	if !validPeriods[period] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid period parameter. Must be 1M, 3M, 6M, or 1Y",
			},
		})
		return
	}

	// Get currency from query parameter (default to USD)
	currency := c.DefaultQuery("currency", "USD")
	
	// Validate currency
	if currency != "USD" && currency != "RMB" && currency != "CNY" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid currency parameter. Must be USD or RMB",
			},
		})
		return
	}

	// Get historical performance
	performance, err := h.analyticsService.GetHistoricalPerformance(userID, period, currency)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to fetch historical performance",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"period":      period,
		"currency":    currency,
		"performance": performance,
	})
}

package handlers

import (
	"fmt"
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

	// Get groupBy parameter (optional)
	groupBy := c.DefaultQuery("groupBy", "none")

	// Validate groupBy parameter
	validGroupBy := map[string]bool{
		"assetStyle": true,
		"assetClass": true,
		"currency":   true,
		"none":       true,
	}

	if !validGroupBy[groupBy] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid groupBy parameter. Must be assetStyle, assetClass, currency, or none",
			},
		})
		return
	}

	// If groupBy is specified and not "none", use grouped metrics
	if groupBy != "none" {
		groupedMetrics, err := h.analyticsService.GetGroupedDashboardMetrics(userID, currency, groupBy)
		if err != nil {
			// Log the detailed error for debugging
			fmt.Printf("Error fetching grouped dashboard metrics for user %s: %v\n", userID.Hex(), err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":    "INTERNAL_SERVER_ERROR",
					"message": "Failed to fetch dashboard metrics",
					"details": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusOK, groupedMetrics)
		return
	}

	// Get dashboard metrics (ungrouped)
	metrics, err := h.analyticsService.GetDashboardMetrics(userID, currency)
	if err != nil {
		// Log the detailed error for debugging
		fmt.Printf("Error fetching dashboard metrics for user %s: %v\n", userID.Hex(), err)
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
	
	// Validate period (now including ALL)
	validPeriods := map[string]bool{"1M": true, "3M": true, "6M": true, "1Y": true, "ALL": true}
	if !validPeriods[period] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid period parameter. Must be 1M, 3M, 6M, 1Y, or ALL",
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

	// Get historical performance with metrics
	response, err := h.analyticsService.GetHistoricalPerformanceWithMetrics(userID, period, currency)
	if err != nil {
		// Log the detailed error for debugging
		fmt.Printf("Error fetching historical performance for user %s: %v\n", userID.Hex(), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to fetch historical performance",
				"details": err.Error(),
			},
		})
		return
	}
	
	// Handle case where no data is available
	if response.Performance == nil || len(response.Performance) == 0 {
		fmt.Printf("No performance data available for user %s, period %s\n", userID.Hex(), period)
		// Return empty response with zero metrics
		response.Performance = []services.PerformanceDataPoint{}
		if response.Metrics == nil {
			response.Metrics = &services.PerformanceMetrics{}
		}
	}

	c.JSON(http.StatusOK, response)
}

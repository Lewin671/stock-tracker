package handlers

import (
	"fmt"
	"net/http"
	"stock-portfolio-tracker/services"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// BacktestHandler handles backtest-related requests
type BacktestHandler struct {
	backtestService *services.BacktestService
}

// NewBacktestHandler creates a new BacktestHandler instance
func NewBacktestHandler(backtestService *services.BacktestService) *BacktestHandler {
	return &BacktestHandler{
		backtestService: backtestService,
	}
}

// GetBacktest returns backtest results for the authenticated user
func (h *BacktestHandler) GetBacktest(c *gin.Context) {
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

	// Get query parameters
	startDateStr := c.Query("startDate")
	endDateStr := c.Query("endDate")
	currency := c.DefaultQuery("currency", "USD")
	benchmark := c.Query("benchmark")

	// Validate required parameters
	if startDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "startDate parameter is required",
			},
		})
		return
	}

	if endDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "endDate parameter is required",
			},
		})
		return
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": fmt.Sprintf("Invalid startDate format. Expected YYYY-MM-DD: %v", err),
			},
		})
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": fmt.Sprintf("Invalid endDate format. Expected YYYY-MM-DD: %v", err),
			},
		})
		return
	}

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

	// Run backtest
	fmt.Printf("[BacktestHandler] Running backtest for user %s from %s to %s\n",
		userID.Hex(), startDateStr, endDateStr)

	result, err := h.backtestService.RunBacktest(userID, startDate, endDate, currency, benchmark)
	if err != nil {
		fmt.Printf("[BacktestHandler] Error running backtest: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "BACKTEST_ERROR",
				"message": fmt.Sprintf("Failed to run backtest: %v", err),
			},
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

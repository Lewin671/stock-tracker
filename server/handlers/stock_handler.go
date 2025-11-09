package handlers

import (
	"net/http"
	"stock-portfolio-tracker/services"
	"strings"

	"github.com/gin-gonic/gin"
)

// StockHandler handles stock-related requests
type StockHandler struct {
	stockService *services.StockAPIService
}

// NewStockHandler creates a new StockHandler instance
func NewStockHandler(stockService *services.StockAPIService) *StockHandler {
	return &StockHandler{
		stockService: stockService,
	}
}

// SearchStock handles stock symbol search
func (h *StockHandler) SearchStock(c *gin.Context) {
	symbol := c.Param("symbol")
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Stock symbol is required",
			},
		})
		return
	}
	
	// Get stock info (which includes search functionality)
	info, err := h.stockService.GetStockInfo(symbol)
	if err != nil {
		if err == services.ErrStockNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "NOT_FOUND",
					"message": "Stock not found",
				},
			})
			return
		}
		
		if err == services.ErrInvalidSymbol {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": "Invalid stock symbol format",
				},
			})
			return
		}
		
		if err == services.ErrExternalAPI {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": gin.H{
					"code":    "EXTERNAL_API_ERROR",
					"message": "Failed to fetch stock data from external API",
				},
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to search stock",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, info)
}

// GetStockInfo handles fetching stock information
func (h *StockHandler) GetStockInfo(c *gin.Context) {
	symbol := c.Param("symbol")
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Stock symbol is required",
			},
		})
		return
	}
	
	info, err := h.stockService.GetStockInfo(symbol)
	if err != nil {
		if err == services.ErrStockNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "NOT_FOUND",
					"message": "Stock not found",
				},
			})
			return
		}
		
		if err == services.ErrInvalidSymbol {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": "Invalid stock symbol format",
				},
			})
			return
		}
		
		if err == services.ErrExternalAPI {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": gin.H{
					"code":    "EXTERNAL_API_ERROR",
					"message": "Failed to fetch stock data from external API",
				},
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to get stock information",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, info)
}

// GetStockHistory handles fetching historical stock data
func (h *StockHandler) GetStockHistory(c *gin.Context) {
	symbol := c.Param("symbol")
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Stock symbol is required",
			},
		})
		return
	}
	
	// Get period from query parameter, default to 1Y
	period := c.DefaultQuery("period", "1Y")
	period = strings.ToUpper(period)
	
	// Validate period
	validPeriods := map[string]bool{"1M": true, "3M": true, "6M": true, "1Y": true}
	if !validPeriods[period] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid period. Valid values are: 1M, 3M, 6M, 1Y",
			},
		})
		return
	}
	
	data, err := h.stockService.GetHistoricalData(symbol, period)
	if err != nil {
		if err == services.ErrStockNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "NOT_FOUND",
					"message": "Stock not found",
				},
			})
			return
		}
		
		if err == services.ErrInvalidSymbol {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": "Invalid stock symbol format",
				},
			})
			return
		}
		
		if err == services.ErrInvalidPeriod {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": "Invalid period parameter",
				},
			})
			return
		}
		
		if err == services.ErrExternalAPI {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": gin.H{
					"code":    "EXTERNAL_API_ERROR",
					"message": "Failed to fetch historical data from external API",
				},
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to get historical data",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"symbol": symbol,
		"period": period,
		"data":   data,
	})
}

package handlers

import (
	"net/http"
	"stock-portfolio-tracker/services"
	"strings"

	"github.com/gin-gonic/gin"
)

// CurrencyHandler handles currency-related requests
type CurrencyHandler struct {
	currencyService *services.CurrencyService
}

// NewCurrencyHandler creates a new CurrencyHandler instance
func NewCurrencyHandler(currencyService *services.CurrencyService) *CurrencyHandler {
	return &CurrencyHandler{
		currencyService: currencyService,
	}
}

// GetExchangeRate handles fetching exchange rate between two currencies
func (h *CurrencyHandler) GetExchangeRate(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")
	
	// Normalize currency codes to uppercase
	from = strings.ToUpper(strings.TrimSpace(from))
	to = strings.ToUpper(strings.TrimSpace(to))
	
	// Validate currency codes
	if from == "" || to == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Both 'from' and 'to' currency codes are required",
			},
		})
		return
	}
	
	// Validate currency code format (should be 3 letters)
	if len(from) != 3 || len(to) != 3 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Currency codes must be 3 letters (e.g., USD, CNY)",
			},
		})
		return
	}
	
	// Get exchange rate
	rate, err := h.currencyService.GetExchangeRate(from, to)
	if err != nil {
		if err == services.ErrInvalidCurrencyCode {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": "Invalid currency code",
				},
			})
			return
		}
		
		if err == services.ErrExchangeRateNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "NOT_FOUND",
					"message": "Exchange rate not found for the specified currency pair",
				},
			})
			return
		}
		
		if err == services.ErrCurrencyAPIError {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": gin.H{
					"code":    "EXTERNAL_API_ERROR",
					"message": "Failed to fetch exchange rate from external API",
				},
			})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to get exchange rate",
			},
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"from": from,
		"to":   to,
		"rate": rate,
	})
}

package handlers

import (
	"net/http"
	"stock-portfolio-tracker/models"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PortfolioHandler handles portfolio-related requests
type PortfolioHandler struct {
	portfolioService *services.PortfolioService
}

// NewPortfolioHandler creates a new PortfolioHandler instance
func NewPortfolioHandler(portfolioService *services.PortfolioService) *PortfolioHandler {
	return &PortfolioHandler{
		portfolioService: portfolioService,
	}
}

// GetHoldings returns all holdings for the authenticated user
func (h *PortfolioHandler) GetHoldings(c *gin.Context) {
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

	// Get currency parameter (default to USD)
	currency := c.DefaultQuery("currency", "USD")
	if currency != "USD" && currency != "RMB" {
		currency = "USD"
	}

	// Get holdings
	holdings, err := h.portfolioService.GetUserHoldings(userID, currency)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to fetch holdings",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"holdings": holdings,
	})
}

// AddTransaction adds a new transaction
func (h *PortfolioHandler) AddTransaction(c *gin.Context) {
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
	var req models.TransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid transaction data",
				"details": err.Error(),
			},
		})
		return
	}

	// Convert request to transaction model
	transaction := &models.Transaction{
		Symbol:   req.Symbol,
		Action:   req.Action,
		Shares:   req.Shares,
		Price:    req.Price,
		Currency: req.Currency,
		Fees:     req.Fees,
		Date:     req.Date,
	}

	// Add transaction
	if err := h.portfolioService.AddTransaction(userID, transaction); err != nil {
		// Handle specific errors
		if err == services.ErrInsufficientShares {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "INSUFFICIENT_SHARES",
					"message": "Insufficient shares for sell transaction",
				},
			})
			return
		}
		if err == services.ErrFutureDate {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": "Transaction date cannot be in the future",
				},
			})
			return
		}
		if err == services.ErrInvalidTransaction {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": err.Error(),
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to add transaction",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Transaction added successfully",
		"transaction": transaction,
	})
}

// UpdateTransaction updates an existing transaction
func (h *PortfolioHandler) UpdateTransaction(c *gin.Context) {
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

	// Get transaction ID from URL
	txIDStr := c.Param("id")
	txID, err := primitive.ObjectIDFromHex(txIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid transaction ID",
			},
		})
		return
	}

	// Parse request body
	var req models.TransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid transaction data",
				"details": err.Error(),
			},
		})
		return
	}

	// Convert request to transaction model
	transaction := &models.Transaction{
		Symbol:   req.Symbol,
		Action:   req.Action,
		Shares:   req.Shares,
		Price:    req.Price,
		Currency: req.Currency,
		Fees:     req.Fees,
		Date:     req.Date,
	}

	// Update transaction
	if err := h.portfolioService.UpdateTransaction(userID, txID, transaction); err != nil {
		// Handle specific errors
		if err == services.ErrTransactionNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "NOT_FOUND",
					"message": "Transaction not found",
				},
			})
			return
		}
		if err == services.ErrInsufficientShares {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "INSUFFICIENT_SHARES",
					"message": "Insufficient shares for sell transaction",
				},
			})
			return
		}
		if err == services.ErrFutureDate {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": gin.H{
					"code":    "VALIDATION_ERROR",
					"message": "Transaction date cannot be in the future",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to update transaction",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Transaction updated successfully",
		"transaction": transaction,
	})
}

// DeleteTransaction deletes a transaction
func (h *PortfolioHandler) DeleteTransaction(c *gin.Context) {
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

	// Get transaction ID from URL
	txIDStr := c.Param("id")
	txID, err := primitive.ObjectIDFromHex(txIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Invalid transaction ID",
			},
		})
		return
	}

	// Delete transaction
	if err := h.portfolioService.DeleteTransaction(userID, txID); err != nil {
		if err == services.ErrTransactionNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": gin.H{
					"code":    "NOT_FOUND",
					"message": "Transaction not found",
				},
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to delete transaction",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Transaction deleted successfully",
	})
}

// GetTransactionsBySymbol returns all transactions for a specific symbol
func (h *PortfolioHandler) GetTransactionsBySymbol(c *gin.Context) {
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

	// Get symbol from URL
	symbol := c.Param("symbol")
	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "Symbol is required",
			},
		})
		return
	}

	// Get transactions
	transactions, err := h.portfolioService.GetTransactionsBySymbol(userID, symbol)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_SERVER_ERROR",
				"message": "Failed to fetch transactions",
				"details": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
	})
}

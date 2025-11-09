package routes

import (
	"stock-portfolio-tracker/handlers"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
)

// SetupCurrencyRoutes sets up currency-related routes
func SetupCurrencyRoutes(router *gin.Engine, currencyService *services.CurrencyService) {
	currencyHandler := handlers.NewCurrencyHandler(currencyService)
	
	currencyGroup := router.Group("/api/currency")
	{
		currencyGroup.GET("/rate", currencyHandler.GetExchangeRate)
	}
}

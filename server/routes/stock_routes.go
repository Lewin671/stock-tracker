package routes

import (
	"stock-portfolio-tracker/handlers"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
)

// SetupStockRoutes sets up stock-related routes
func SetupStockRoutes(router *gin.Engine, stockService *services.StockAPIService) {
	stockHandler := handlers.NewStockHandler(stockService)
	
	stockGroup := router.Group("/api/stocks")
	{
		stockGroup.GET("/search/:symbol", stockHandler.SearchStock)
		stockGroup.GET("/:symbol/info", stockHandler.GetStockInfo)
		stockGroup.GET("/:symbol/history", stockHandler.GetStockHistory)
	}
}

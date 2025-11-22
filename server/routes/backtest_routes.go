package routes

import (
	"stock-portfolio-tracker/handlers"
	"stock-portfolio-tracker/middleware"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
)

// SetupBacktestRoutes configures backtest-related routes
func SetupBacktestRoutes(router *gin.Engine, backtestService *services.BacktestService, authService *services.AuthService) {
	backtestHandler := handlers.NewBacktestHandler(backtestService)

	// Backtest routes group - all protected
	backtestGroup := router.Group("/api/backtest")
	backtestGroup.Use(middleware.AuthMiddleware(authService))
	{
		// Run backtest
		backtestGroup.GET("", backtestHandler.GetBacktest)
	}
}

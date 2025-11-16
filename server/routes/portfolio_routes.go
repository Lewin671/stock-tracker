package routes

import (
	"stock-portfolio-tracker/handlers"
	"stock-portfolio-tracker/middleware"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
)

// SetupPortfolioRoutes configures portfolio-related routes
func SetupPortfolioRoutes(router *gin.Engine, portfolioService *services.PortfolioService, authService *services.AuthService) {
	portfolioHandler := handlers.NewPortfolioHandler(portfolioService)

	// Portfolio routes group - all protected
	portfolioGroup := router.Group("/api/portfolio")
	portfolioGroup.Use(middleware.AuthMiddleware(authService))
	{
		// Holdings
		portfolioGroup.GET("/holdings", portfolioHandler.GetHoldings)

		// Transactions
		portfolioGroup.POST("/transactions", portfolioHandler.AddTransaction)
		portfolioGroup.PUT("/transactions/:id", portfolioHandler.UpdateTransaction)
		portfolioGroup.DELETE("/transactions/:id", portfolioHandler.DeleteTransaction)
		portfolioGroup.GET("/transactions/:symbol", portfolioHandler.GetTransactionsBySymbol)
	}

	// Portfolios routes group - all protected
	portfoliosGroup := router.Group("/api/portfolios")
	portfoliosGroup.Use(middleware.AuthMiddleware(authService))
	{
		portfoliosGroup.GET("/:id", portfolioHandler.GetPortfolio)
		portfoliosGroup.PUT("/:id/metadata", portfolioHandler.UpdatePortfolioMetadata)
		portfoliosGroup.GET("/check/:symbol", portfolioHandler.CheckPortfolio)
	}
}

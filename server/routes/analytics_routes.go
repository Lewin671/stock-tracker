package routes

import (
	"stock-portfolio-tracker/handlers"
	"stock-portfolio-tracker/middleware"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
)

// SetupAnalyticsRoutes configures analytics-related routes
func SetupAnalyticsRoutes(router *gin.Engine, analyticsService *services.AnalyticsService, authService *services.AuthService) {
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)

	// Analytics routes group - all protected
	analyticsGroup := router.Group("/api/analytics")
	analyticsGroup.Use(middleware.AuthMiddleware(authService))
	{
		// Dashboard metrics
		analyticsGroup.GET("/dashboard", analyticsHandler.GetDashboard)

		// Historical performance
		analyticsGroup.GET("/performance", analyticsHandler.GetPerformance)
	}
}

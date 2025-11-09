package routes

import (
	"stock-portfolio-tracker/handlers"
	"stock-portfolio-tracker/middleware"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
)

// SetupAuthRoutes configures authentication routes
func SetupAuthRoutes(router *gin.Engine, authService *services.AuthService) {
	authHandler := handlers.NewAuthHandler(authService)

	// Auth routes group with stricter rate limiting (10 requests per minute)
	authGroup := router.Group("/api/auth")
	authGroup.Use(middleware.AuthRateLimiter())
	{
		// Public routes
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)

		// Protected routes
		authGroup.GET("/me", middleware.AuthMiddleware(authService), authHandler.GetCurrentUser)
	}
}

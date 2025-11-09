package main

import (
	"log"
	"os"
	"stock-portfolio-tracker/database"
	"stock-portfolio-tracker/middleware"
	"stock-portfolio-tracker/routes"
	"stock-portfolio-tracker/services"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Connect to MongoDB
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI environment variable is required")
	}

	if err := database.Connect(mongoURI); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Disconnect()

	// Create database indexes
	if err := database.CreateIndexes(); err != nil {
		log.Fatal("Failed to create database indexes:", err)
	}

	// Initialize services
	authService := services.NewAuthService()
	stockService := services.NewStockAPIService()
	portfolioService := services.NewPortfolioService(stockService)
	currencyService := services.NewCurrencyService()
	analyticsService := services.NewAnalyticsService(portfolioService, currencyService, stockService)
	
	// Start cache cleanup for stock service (run every 10 minutes)
	stockService.StartCacheCleanup(10 * time.Minute)
	
	// Start cache cleanup for currency service (run every 30 minutes)
	currencyService.StartCacheCleanup(30 * time.Minute)

	// Initialize Gin router
	router := gin.Default()

	// Configure CORS middleware
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}
	
	corsConfig := cors.Config{
		AllowOrigins:     []string{corsOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	router.Use(cors.New(corsConfig))

	// Apply request logging middleware
	router.Use(middleware.RequestLoggingMiddleware())

	// Apply input validation and sanitization middleware
	router.Use(middleware.BodySizeLimitMiddleware())
	router.Use(middleware.InputSanitizationMiddleware())

	// Apply global rate limiting (100 requests per minute per IP)
	router.Use(middleware.GlobalRateLimiter())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		// Check database health
		if err := database.HealthCheck(); err != nil {
			c.JSON(503, gin.H{
				"status": "unhealthy",
				"error":  "database connection failed",
			})
			return
		}

		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// Setup routes
	routes.SetupAuthRoutes(router, authService)
	routes.SetupStockRoutes(router, stockService)
	routes.SetupPortfolioRoutes(router, portfolioService, authService)
	routes.SetupCurrencyRoutes(router, currencyService)
	routes.SetupAnalyticsRoutes(router, analyticsService, authService)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

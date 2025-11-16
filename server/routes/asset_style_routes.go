package routes

import (
	"stock-portfolio-tracker/handlers"
	"stock-portfolio-tracker/middleware"
	"stock-portfolio-tracker/services"

	"github.com/gin-gonic/gin"
)

// SetupAssetStyleRoutes sets up the asset style routes
func SetupAssetStyleRoutes(router *gin.Engine, authService *services.AuthService) {
	assetStyleService := services.NewAssetStyleService()
	assetStyleHandler := handlers.NewAssetStyleHandler(assetStyleService)

	// Asset style routes (all require authentication)
	assetStyleGroup := router.Group("/api/asset-styles")
	assetStyleGroup.Use(middleware.AuthMiddleware(authService))
	{
		assetStyleGroup.GET("", assetStyleHandler.GetAssetStyles)
		assetStyleGroup.POST("", assetStyleHandler.CreateAssetStyle)
		assetStyleGroup.PUT("/:id", assetStyleHandler.UpdateAssetStyle)
		assetStyleGroup.DELETE("/:id", assetStyleHandler.DeleteAssetStyle)
	}
}

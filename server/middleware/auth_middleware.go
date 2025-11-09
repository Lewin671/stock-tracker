package middleware

import (
	"net/http"
	"stock-portfolio-tracker/services"
	"strings"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuthMiddleware validates JWT tokens and attaches user ID to context
func AuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authorization header is required",
				},
			})
			c.Abort()
			return
		}

		// Check for Bearer token format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authorization header must be in format: Bearer <token>",
				},
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate token and get user
		user, err := authService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Invalid or expired token",
				},
			})
			c.Abort()
			return
		}

		// Attach user ID to context for downstream handlers
		c.Set("userID", user.ID)
		c.Set("user", user)

		c.Next()
	}
}

// GetUserID extracts the user ID from the Gin context
func GetUserID(c *gin.Context) (primitive.ObjectID, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return primitive.NilObjectID, false
	}

	id, ok := userID.(primitive.ObjectID)
	return id, ok
}

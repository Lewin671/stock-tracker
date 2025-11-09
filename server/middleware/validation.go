package middleware

import (
	"bytes"
	"io"
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	maxBodySize = 1 << 20 // 1 MB
)

// RequestLoggingMiddleware logs all incoming requests with timestamp and user info
func RequestLoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()
		
		// Get user ID from context if available (set by auth middleware)
		userID, exists := c.Get("userID")
		userIDStr := "anonymous"
		if exists {
			userIDStr = userID.(string)
		}
		
		// Log request details
		log.Printf("[%s] %s %s - User: %s - IP: %s",
			startTime.Format(time.RFC3339),
			c.Request.Method,
			c.Request.URL.Path,
			userIDStr,
			c.ClientIP(),
		)
		
		// Process request
		c.Next()
		
		// Log response details
		duration := time.Since(startTime)
		log.Printf("[%s] %s %s - Status: %d - Duration: %v - User: %s",
			time.Now().Format(time.RFC3339),
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			duration,
			userIDStr,
		)
	}
}

// BodySizeLimitMiddleware validates request body size limits
func BodySizeLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only check for requests with body
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			if c.Request.ContentLength > maxBodySize {
				c.JSON(413, gin.H{
					"error": gin.H{
						"code":    "PAYLOAD_TOO_LARGE",
						"message": "Request body too large. Maximum size is 1MB.",
					},
				})
				c.Abort()
				return
			}
			
			// Read and limit body
			body, err := io.ReadAll(io.LimitReader(c.Request.Body, maxBodySize+1))
			if err != nil {
				c.JSON(400, gin.H{
					"error": gin.H{
						"code":    "INVALID_REQUEST",
						"message": "Failed to read request body.",
					},
				})
				c.Abort()
				return
			}
			
			if len(body) > maxBodySize {
				c.JSON(413, gin.H{
					"error": gin.H{
						"code":    "PAYLOAD_TOO_LARGE",
						"message": "Request body too large. Maximum size is 1MB.",
					},
				})
				c.Abort()
				return
			}
			
			// Restore body for further processing
			c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
		}
		
		c.Next()
	}
}

// SanitizeInput sanitizes string inputs to prevent injection attacks
func sanitizeString(input string) string {
	// Trim whitespace
	input = strings.TrimSpace(input)
	
	// Remove null bytes
	input = strings.ReplaceAll(input, "\x00", "")
	
	// Remove control characters except newlines and tabs
	var sanitized strings.Builder
	for _, r := range input {
		if r == '\n' || r == '\t' || r >= 32 {
			sanitized.WriteRune(r)
		}
	}
	
	return sanitized.String()
}

// InputSanitizationMiddleware sanitizes string inputs in query parameters and form data
func InputSanitizationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Sanitize query parameters
		query := c.Request.URL.Query()
		for key, values := range query {
			for i, value := range values {
				query[key][i] = sanitizeString(value)
			}
		}
		c.Request.URL.RawQuery = query.Encode()
		
		// Note: JSON body sanitization should be done at the handler level
		// after binding to structs, as we don't want to modify the raw JSON
		
		c.Next()
	}
}

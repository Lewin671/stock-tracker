package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimiter struct {
	requests map[string][]time.Time
	mu       sync.Mutex
	limit    int
	window   time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
	
	// Start cleanup goroutine to remove old entries
	go rl.cleanup()
	
	return rl
}

func (rl *rateLimiter) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, timestamps := range rl.requests {
			// Remove timestamps older than the window
			validTimestamps := []time.Time{}
			for _, ts := range timestamps {
				if now.Sub(ts) < rl.window {
					validTimestamps = append(validTimestamps, ts)
				}
			}
			
			if len(validTimestamps) == 0 {
				delete(rl.requests, ip)
			} else {
				rl.requests[ip] = validTimestamps
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *rateLimiter) allow(key string) (allowed bool, remaining int, resetTime time.Time) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	now := time.Now()
	
	// Get existing timestamps for this key
	timestamps, exists := rl.requests[key]
	if !exists {
		timestamps = []time.Time{}
	}
	
	// Remove timestamps outside the window
	validTimestamps := []time.Time{}
	for _, ts := range timestamps {
		if now.Sub(ts) < rl.window {
			validTimestamps = append(validTimestamps, ts)
		}
	}
	
	// Calculate remaining requests
	remaining = rl.limit - len(validTimestamps)
	
	// Calculate reset time (oldest timestamp + window)
	if len(validTimestamps) > 0 {
		resetTime = validTimestamps[0].Add(rl.window)
	} else {
		resetTime = now.Add(rl.window)
	}
	
	// Check if limit is exceeded
	if len(validTimestamps) >= rl.limit {
		return false, 0, resetTime
	}
	
	// Add current timestamp
	validTimestamps = append(validTimestamps, now)
	rl.requests[key] = validTimestamps
	
	return true, remaining - 1, resetTime
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(limit int, window time.Duration) gin.HandlerFunc {
	limiter := newRateLimiter(limit, window)
	
	return func(c *gin.Context) {
		// Use user ID if authenticated, otherwise use IP
		key := c.ClientIP()
		if userID, exists := c.Get("userID"); exists {
			key = fmt.Sprintf("user:%v", userID)
		}
		
		allowed, remaining, resetTime := limiter.allow(key)
		
		// Add rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))
		
		if !allowed {
			retryAfter := int(time.Until(resetTime).Seconds())
			if retryAfter < 0 {
				retryAfter = 0
			}
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": fmt.Sprintf("Too many requests. Please try again in %d seconds.", retryAfter),
					"retryAfter": retryAfter,
				},
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// getEnvInt reads an integer from environment variable with a default value
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// GlobalRateLimiter creates a rate limiter with configurable requests per minute
// Default: 500 requests per minute (can be overridden with RATE_LIMIT_GLOBAL env var)
func GlobalRateLimiter() gin.HandlerFunc {
	limit := getEnvInt("RATE_LIMIT_GLOBAL", 500)
	return RateLimitMiddleware(limit, 1*time.Minute)
}

// AuthRateLimiter creates a stricter rate limiter for auth endpoints
// Default: 30 requests per minute (can be overridden with RATE_LIMIT_AUTH env var)
func AuthRateLimiter() gin.HandlerFunc {
	limit := getEnvInt("RATE_LIMIT_AUTH", 30)
	return RateLimitMiddleware(limit, 1*time.Minute)
}

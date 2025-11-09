package middleware

import (
	"net/http"
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

func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	
	now := time.Now()
	
	// Get existing timestamps for this IP
	timestamps, exists := rl.requests[ip]
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
	
	// Check if limit is exceeded
	if len(validTimestamps) >= rl.limit {
		return false
	}
	
	// Add current timestamp
	validTimestamps = append(validTimestamps, now)
	rl.requests[ip] = validTimestamps
	
	return true
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(limit int, window time.Duration) gin.HandlerFunc {
	limiter := newRateLimiter(limit, window)
	
	return func(c *gin.Context) {
		ip := c.ClientIP()
		
		if !limiter.allow(ip) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": "Too many requests. Please try again later.",
				},
			})
			c.Abort()
			return
		}
		
		c.Next()
	}
}

// GlobalRateLimiter creates a rate limiter with 100 requests per minute
func GlobalRateLimiter() gin.HandlerFunc {
	return RateLimitMiddleware(100, 1*time.Minute)
}

// AuthRateLimiter creates a stricter rate limiter for auth endpoints (10 requests per minute)
func AuthRateLimiter() gin.HandlerFunc {
	return RateLimitMiddleware(10, 1*time.Minute)
}

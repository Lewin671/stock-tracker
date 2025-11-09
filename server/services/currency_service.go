package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

var (
	ErrCurrencyAPIError     = errors.New("currency API error")
	ErrInvalidCurrencyCode  = errors.New("invalid currency code")
	ErrExchangeRateNotFound = errors.New("exchange rate not found")
)

// CachedExchangeRate represents a cached exchange rate with expiration
type CachedExchangeRate struct {
	Rate      float64
	ExpiresAt time.Time
}

// CurrencyService handles currency conversion operations
type CurrencyService struct {
	httpClient         *http.Client
	apiKey             string
	rateCache          map[string]*CachedExchangeRate
	cacheMutex         sync.RWMutex
	rateCacheDuration  time.Duration
}

// ExchangeRateAPIResponse represents the response from ExchangeRate-API
type exchangeRateAPIResponse struct {
	Result           string             `json:"result"`
	BaseCode         string             `json:"base_code"`
	ConversionRates  map[string]float64 `json:"conversion_rates"`
	TimeLastUpdateUnix int64            `json:"time_last_update_unix"`
}

// NewCurrencyService creates a new CurrencyService instance
func NewCurrencyService() *CurrencyService {
	apiKey := os.Getenv("EXCHANGE_RATE_API_KEY")
	
	return &CurrencyService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		apiKey:            apiKey,
		rateCache:         make(map[string]*CachedExchangeRate),
		rateCacheDuration: 1 * time.Hour,
	}
}

// getCachedRate retrieves exchange rate from cache if available and not expired
func (s *CurrencyService) getCachedRate(cacheKey string) (float64, bool) {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()
	
	cached, exists := s.rateCache[cacheKey]
	if !exists {
		return 0, false
	}
	
	if time.Now().After(cached.ExpiresAt) {
		return 0, false
	}
	
	return cached.Rate, true
}

// setCachedRate stores exchange rate in cache with expiration
func (s *CurrencyService) setCachedRate(cacheKey string, rate float64) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	
	s.rateCache[cacheKey] = &CachedExchangeRate{
		Rate:      rate,
		ExpiresAt: time.Now().Add(s.rateCacheDuration),
	}
}

// getLastCachedRate retrieves the last cached rate even if expired (for fallback)
func (s *CurrencyService) getLastCachedRate(cacheKey string) (float64, bool) {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()
	
	cached, exists := s.rateCache[cacheKey]
	if !exists {
		return 0, false
	}
	
	return cached.Rate, true
}

// GetExchangeRate fetches the exchange rate from one currency to another
func (s *CurrencyService) GetExchangeRate(from, to string) (float64, error) {
	// Validate currency codes
	if from == "" || to == "" {
		return 0, ErrInvalidCurrencyCode
	}
	
	// If same currency, return 1
	if from == to {
		return 1.0, nil
	}
	
	// Create cache key
	cacheKey := fmt.Sprintf("%s_%s", from, to)
	
	// Check cache first
	if rate, found := s.getCachedRate(cacheKey); found {
		return rate, nil
	}
	
	// If API key is not configured, try to use last cached rate
	if s.apiKey == "" {
		if rate, found := s.getLastCachedRate(cacheKey); found {
			log.Printf("WARNING: ExchangeRate-API key not configured, using stale cached rate for %s", cacheKey)
			return rate, nil
		}
		return 0, fmt.Errorf("%w: API key not configured", ErrCurrencyAPIError)
	}
	
	// Fetch from ExchangeRate-API
	url := fmt.Sprintf("https://v6.exchangerate-api.com/v6/%s/latest/%s", s.apiKey, from)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %w", err)
	}
	
	resp, err := s.httpClient.Do(req)
	if err != nil {
		// If API call fails, try to use last cached rate
		if rate, found := s.getLastCachedRate(cacheKey); found {
			log.Printf("WARNING: ExchangeRate-API request failed, using stale cached rate for %s: %v", cacheKey, err)
			return rate, nil
		}
		return 0, fmt.Errorf("%w: %v", ErrCurrencyAPIError, err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		// If API call fails, try to use last cached rate
		if rate, found := s.getLastCachedRate(cacheKey); found {
			log.Printf("WARNING: ExchangeRate-API returned status %d, using stale cached rate for %s", resp.StatusCode, cacheKey)
			return rate, nil
		}
		return 0, fmt.Errorf("%w: status code %d", ErrCurrencyAPIError, resp.StatusCode)
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		// If reading fails, try to use last cached rate
		if rate, found := s.getLastCachedRate(cacheKey); found {
			log.Printf("WARNING: Failed to read ExchangeRate-API response, using stale cached rate for %s: %v", cacheKey, err)
			return rate, nil
		}
		return 0, fmt.Errorf("failed to read response: %w", err)
	}
	
	var apiResp exchangeRateAPIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		// If parsing fails, try to use last cached rate
		if rate, found := s.getLastCachedRate(cacheKey); found {
			log.Printf("WARNING: Failed to parse ExchangeRate-API response, using stale cached rate for %s: %v", cacheKey, err)
			return rate, nil
		}
		return 0, fmt.Errorf("failed to parse response: %w", err)
	}
	
	if apiResp.Result != "success" {
		// If API returns error, try to use last cached rate
		if rate, found := s.getLastCachedRate(cacheKey); found {
			log.Printf("WARNING: ExchangeRate-API returned error result, using stale cached rate for %s", cacheKey)
			return rate, nil
		}
		return 0, fmt.Errorf("%w: API returned error result", ErrCurrencyAPIError)
	}
	
	// Get the conversion rate for the target currency
	rate, exists := apiResp.ConversionRates[to]
	if !exists {
		return 0, ErrExchangeRateNotFound
	}
	
	// Cache the result
	s.setCachedRate(cacheKey, rate)
	
	return rate, nil
}

// ConvertAmount converts an amount from one currency to another
func (s *CurrencyService) ConvertAmount(amount float64, from, to string) (float64, error) {
	rate, err := s.GetExchangeRate(from, to)
	if err != nil {
		return 0, err
	}
	
	return amount * rate, nil
}

// cleanupExpiredCache removes expired entries from cache
func (s *CurrencyService) cleanupExpiredCache() {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	
	now := time.Now()
	
	for key, cached := range s.rateCache {
		if now.After(cached.ExpiresAt) {
			delete(s.rateCache, key)
		}
	}
}

// StartCacheCleanup starts a background goroutine to periodically clean expired cache entries
func (s *CurrencyService) StartCacheCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			s.cleanupExpiredCache()
		}
	}()
}

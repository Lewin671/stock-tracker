package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

var (
	ErrStockNotFound    = errors.New("stock not found")
	ErrExternalAPI      = errors.New("external API error")
	ErrInvalidSymbol    = errors.New("invalid stock symbol")
	ErrInvalidPeriod    = errors.New("invalid period parameter")
)

// StockInfo represents stock information
type StockInfo struct {
	Symbol       string  `json:"symbol"`
	Name         string  `json:"name"`
	CurrentPrice float64 `json:"currentPrice"`
	Currency     string  `json:"currency"`
	Sector       string  `json:"sector,omitempty"`
}

// HistoricalPrice represents a historical price data point
type HistoricalPrice struct {
	Date  time.Time `json:"date"`
	Price float64   `json:"price"`
}

// CachedStockData represents cached stock information with expiration
type CachedStockData struct {
	Data      *StockInfo
	ExpiresAt time.Time
}

// CachedHistoricalData represents cached historical data with expiration
type CachedHistoricalData struct {
	Data      []HistoricalPrice
	ExpiresAt time.Time
}

// StockAPIService handles stock data operations
type StockAPIService struct {
	httpClient           *http.Client
	stockCache           map[string]*CachedStockData
	historicalCache      map[string]*CachedHistoricalData
	cacheMutex           sync.RWMutex
	stockCacheDuration   time.Duration
}

// NewStockAPIService creates a new StockAPIService instance
func NewStockAPIService() *StockAPIService {
	return &StockAPIService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		stockCache:         make(map[string]*CachedStockData),
		historicalCache:    make(map[string]*CachedHistoricalData),
		stockCacheDuration: 5 * time.Minute,
	}
}

// IsUSStock checks if a symbol is a US stock
// US stocks have no suffix or common US patterns
func (s *StockAPIService) IsUSStock(symbol string) bool {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
	// Check if it has Chinese exchange suffixes
	if strings.HasSuffix(symbol, ".SS") || strings.HasSuffix(symbol, ".SZ") {
		return false
	}
	
	// Check if it has other common non-US suffixes
	nonUSSuffixes := []string{".HK", ".L", ".T", ".TO", ".AX", ".PA", ".DE"}
	for _, suffix := range nonUSSuffixes {
		if strings.HasSuffix(symbol, suffix) {
			return false
		}
	}
	
	// If no suffix or only contains letters (typical US pattern), consider it US
	return true
}

// IsChinaStock checks if a symbol is a Chinese stock
// Chinese stocks have .SS (Shanghai) or .SZ (Shenzhen) suffix
func (s *StockAPIService) IsChinaStock(symbol string) bool {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	return strings.HasSuffix(symbol, ".SS") || strings.HasSuffix(symbol, ".SZ")
}

// Yahoo Finance API response structures
type yahooChartResponse struct {
	Chart struct {
		Result []struct {
			Meta struct {
				Symbol             string  `json:"symbol"`
				Currency           string  `json:"currency"`
				RegularMarketPrice float64 `json:"regularMarketPrice"`
				LongName           string  `json:"longName"`
				ShortName          string  `json:"shortName"`
			} `json:"meta"`
			Timestamp  []int64 `json:"timestamp"`
			Indicators struct {
				Quote []struct {
					Close []float64 `json:"close"`
				} `json:"quote"`
			} `json:"indicators"`
		} `json:"result"`
		Error interface{} `json:"error"`
	} `json:"chart"`
}



// fetchFromYahooChart calls Yahoo Finance Chart API with the specified parameters
func (s *StockAPIService) fetchFromYahooChart(symbol string, period1, period2 int64) (*yahooChartResponse, error) {
	url := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%d&period2=%d&interval=1d",
		symbol, period1, period2,
	)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrExternalAPI, err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: status code %d", ErrExternalAPI, resp.StatusCode)
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	var chartResp yahooChartResponse
	if err := json.Unmarshal(body, &chartResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	
	if len(chartResp.Chart.Result) == 0 {
		return nil, ErrStockNotFound
	}
	
	return &chartResp, nil
}

// extractStockInfo extracts StockInfo from Yahoo Chart API response
func (s *StockAPIService) extractStockInfo(response *yahooChartResponse) (*StockInfo, error) {
	if len(response.Chart.Result) == 0 {
		return nil, ErrStockNotFound
	}
	
	result := response.Chart.Result[0]
	meta := result.Meta
	
	// Validate that we have a valid price
	if meta.RegularMarketPrice <= 0 {
		return nil, ErrStockNotFound
	}
	
	// Prioritize longName, then shortName, finally symbol
	name := meta.LongName
	if name == "" {
		name = meta.ShortName
	}
	if name == "" {
		name = meta.Symbol
	}
	
	// Get currency from meta, or infer from symbol suffix
	currency := strings.ToUpper(meta.Currency)
	if currency == "" {
		if strings.HasSuffix(meta.Symbol, ".SS") || strings.HasSuffix(meta.Symbol, ".SZ") {
			currency = "CNY"
		} else {
			currency = "USD"
		}
	}
	
	return &StockInfo{
		Symbol:       meta.Symbol,
		Name:         name,
		CurrentPrice: meta.RegularMarketPrice,
		Currency:     currency,
	}, nil
}

// extractHistoricalData extracts historical price data from Yahoo Chart API response
func (s *StockAPIService) extractHistoricalData(response *yahooChartResponse) ([]HistoricalPrice, error) {
	if len(response.Chart.Result) == 0 {
		return nil, ErrStockNotFound
	}
	
	result := response.Chart.Result[0]
	
	if len(result.Indicators.Quote) == 0 {
		return nil, ErrStockNotFound
	}
	
	timestamps := result.Timestamp
	closes := result.Indicators.Quote[0].Close
	
	// Verify arrays have matching lengths
	if len(timestamps) != len(closes) {
		return nil, fmt.Errorf("mismatched data length")
	}
	
	historicalData := make([]HistoricalPrice, 0, len(timestamps))
	for i := 0; i < len(timestamps); i++ {
		// Filter out zero prices
		if closes[i] == 0 {
			continue
		}
		
		historicalData = append(historicalData, HistoricalPrice{
			Date:  time.Unix(timestamps[i], 0),
			Price: closes[i],
		})
	}
	
	return historicalData, nil
}















// getCachedStockInfo retrieves stock info from cache if available and not expired
func (s *StockAPIService) getCachedStockInfo(symbol string) (*StockInfo, bool) {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()
	
	cached, exists := s.stockCache[symbol]
	if !exists {
		return nil, false
	}
	
	if time.Now().After(cached.ExpiresAt) {
		return nil, false
	}
	
	return cached.Data, true
}

// setCachedStockInfo stores stock info in cache with expiration
func (s *StockAPIService) setCachedStockInfo(symbol string, info *StockInfo) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	
	s.stockCache[symbol] = &CachedStockData{
		Data:      info,
		ExpiresAt: time.Now().Add(s.stockCacheDuration),
	}
}

// getCachedHistoricalData retrieves historical data from cache if available and not expired
func (s *StockAPIService) getCachedHistoricalData(cacheKey string) ([]HistoricalPrice, bool) {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()
	
	cached, exists := s.historicalCache[cacheKey]
	if !exists {
		return nil, false
	}
	
	if time.Now().After(cached.ExpiresAt) {
		return nil, false
	}
	
	return cached.Data, true
}

// setCachedHistoricalData stores historical data in cache with expiration
func (s *StockAPIService) setCachedHistoricalData(cacheKey string, data []HistoricalPrice) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	
	s.historicalCache[cacheKey] = &CachedHistoricalData{
		Data:      data,
		ExpiresAt: time.Now().Add(s.stockCacheDuration),
	}
}

// cleanupExpiredCache removes expired entries from cache
func (s *StockAPIService) cleanupExpiredCache() {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	
	now := time.Now()
	
	// Clean stock info cache
	for symbol, cached := range s.stockCache {
		if now.After(cached.ExpiresAt) {
			delete(s.stockCache, symbol)
		}
	}
	
	// Clean historical data cache
	for key, cached := range s.historicalCache {
		if now.After(cached.ExpiresAt) {
			delete(s.historicalCache, key)
		}
	}
}

// GetStockInfo fetches stock information with caching
func (s *StockAPIService) GetStockInfo(symbol string) (*StockInfo, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
	if symbol == "" {
		return nil, ErrInvalidSymbol
	}
	
	// Check cache first
	if cached, found := s.getCachedStockInfo(symbol); found {
		return cached, nil
	}
	
	// Fetch from Yahoo Finance Chart API
	// Use a short time range (last 1 day) to get current price
	endTime := time.Now()
	startTime := endTime.AddDate(0, 0, -1)
	
	response, err := s.fetchFromYahooChart(symbol, startTime.Unix(), endTime.Unix())
	if err != nil {
		return nil, err
	}
	
	// Extract stock info from response
	info, err := s.extractStockInfo(response)
	if err != nil {
		return nil, err
	}
	
	// Cache the result
	s.setCachedStockInfo(symbol, info)
	
	return info, nil
}

// GetHistoricalData fetches historical price data with caching
func (s *StockAPIService) GetHistoricalData(symbol string, period string) ([]HistoricalPrice, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
	if symbol == "" {
		return nil, ErrInvalidSymbol
	}
	
	// Validate period
	validPeriods := map[string]bool{"1M": true, "3M": true, "6M": true, "1Y": true}
	if !validPeriods[period] {
		return nil, ErrInvalidPeriod
	}
	
	// Create cache key with symbol and period
	cacheKey := fmt.Sprintf("%s_%s", symbol, period)
	
	// Check cache first
	if cached, found := s.getCachedHistoricalData(cacheKey); found {
		return cached, nil
	}
	
	// Calculate time range based on period
	endTime := time.Now()
	var startTime time.Time
	
	switch period {
	case "1M":
		startTime = endTime.AddDate(0, -1, 0)
	case "3M":
		startTime = endTime.AddDate(0, -3, 0)
	case "6M":
		startTime = endTime.AddDate(0, -6, 0)
	case "1Y":
		startTime = endTime.AddDate(-1, 0, 0)
	}
	
	// Fetch from Yahoo Finance Chart API
	response, err := s.fetchFromYahooChart(symbol, startTime.Unix(), endTime.Unix())
	if err != nil {
		return nil, err
	}
	
	// Extract historical data from response
	data, err := s.extractHistoricalData(response)
	if err != nil {
		return nil, err
	}
	
	// Cache the result
	s.setCachedHistoricalData(cacheKey, data)
	
	return data, nil
}

// StartCacheCleanup starts a background goroutine to periodically clean expired cache entries
func (s *StockAPIService) StartCacheCleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			s.cleanupExpiredCache()
		}
	}()
}

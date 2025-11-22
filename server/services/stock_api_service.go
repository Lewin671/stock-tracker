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

// IsCashSymbol checks if a symbol represents cash
func (s *StockAPIService) IsCashSymbol(symbol string) bool {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	return symbol == "CASH_USD" || symbol == "CASH_RMB"
}

// getCashInfo returns fixed info for cash holdings
func (s *StockAPIService) getCashInfo(symbol string) *StockInfo {
	var currency string
	var name string
	
	if symbol == "CASH_USD" {
		currency = "USD"
		name = "Cash - USD"
	} else {
		currency = "CNY" // RMB uses CNY currency code
		name = "Cash - RMB"
	}
	
	return &StockInfo{
		Symbol:       symbol,
		Name:         name,
		CurrentPrice: 1.0,
		Currency:     currency,
	}
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

// Eastmoney API response structures
type eastmoneyResponse struct {
	Data struct {
		F58 string `json:"f58"` // 股票名称
	} `json:"data"`
	RC  int    `json:"rc"`  // 返回码，0 表示成功
	RT  int    `json:"rt"`  // 响应类型
	Msg string `json:"msg"` // 消息
}



// fetchFromYahooChart calls Yahoo Finance Chart API with the specified parameters
func (s *StockAPIService) fetchFromYahooChart(symbol string, period1, period2 int64) (*yahooChartResponse, error) {
	url := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%d&period2=%d&interval=1d",
		symbol, period1, period2,
	)
	
	fmt.Printf("[StockAPI] HTTP GET: %s\n", url)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("[StockAPI] ERROR: Failed to create HTTP request: %v\n", err)
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	
	startTime := time.Now()
	resp, err := s.httpClient.Do(req)
	duration := time.Since(startTime)
	
	if err != nil {
		fmt.Printf("[StockAPI] ERROR: HTTP request failed after %v: %v\n", duration, err)
		return nil, fmt.Errorf("%w: %v", ErrExternalAPI, err)
	}
	defer resp.Body.Close()
	
	fmt.Printf("[StockAPI] HTTP response received in %v, status: %d\n", duration, resp.StatusCode)
	
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[StockAPI] ERROR: Non-OK status code: %d\n", resp.StatusCode)
		return nil, fmt.Errorf("%w: status code %d", ErrExternalAPI, resp.StatusCode)
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("[StockAPI] ERROR: Failed to read response body: %v\n", err)
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	
	fmt.Printf("[StockAPI] Response body size: %d bytes\n", len(body))
	
	var chartResp yahooChartResponse
	if err := json.Unmarshal(body, &chartResp); err != nil {
		fmt.Printf("[StockAPI] ERROR: Failed to parse JSON response: %v\n", err)
		fmt.Printf("[StockAPI] Response body preview: %s\n", string(body[:min(len(body), 500)]))
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	
	if len(chartResp.Chart.Result) == 0 {
		fmt.Printf("[StockAPI] ERROR: Empty result set from Yahoo Finance for symbol %s\n", symbol)
		if chartResp.Chart.Error != nil {
			fmt.Printf("[StockAPI] Yahoo Finance error: %v\n", chartResp.Chart.Error)
		}
		return nil, ErrStockNotFound
	}
	
	fmt.Printf("[StockAPI] Successfully parsed response, got %d result(s)\n", len(chartResp.Chart.Result))
	
	return &chartResp, nil
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
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

// convertToEastmoneySecID converts Yahoo Finance format symbol to Eastmoney secid format
// Example: 600000.SS -> 1.600000, 000001.SZ -> 0.000001
func (s *StockAPIService) convertToEastmoneySecID(symbol string) (string, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
	fmt.Printf("[StockAPI] Converting symbol to Eastmoney secid: %s\n", symbol)
	
	// Split symbol and suffix
	parts := strings.Split(symbol, ".")
	if len(parts) != 2 {
		fmt.Printf("[StockAPI] ERROR: Invalid symbol format for Eastmoney conversion: %s\n", symbol)
		return "", fmt.Errorf("invalid symbol format: %s", symbol)
	}
	
	stockCode := parts[0]
	suffix := parts[1]
	
	var marketCode string
	switch suffix {
	case "SS":
		marketCode = "1" // Shanghai Stock Exchange
	case "SZ":
		marketCode = "0" // Shenzhen Stock Exchange
	default:
		fmt.Printf("[StockAPI] ERROR: Unsupported exchange suffix for Eastmoney: %s\n", suffix)
		return "", fmt.Errorf("unsupported exchange suffix: %s", suffix)
	}
	
	secid := fmt.Sprintf("%s.%s", marketCode, stockCode)
	fmt.Printf("[StockAPI] Converted %s to Eastmoney secid: %s\n", symbol, secid)
	
	return secid, nil
}

// fetchStockNameFromEastmoney fetches stock name from Eastmoney API for Chinese stocks
func (s *StockAPIService) fetchStockNameFromEastmoney(symbol string) (string, error) {
	fmt.Printf("[StockAPI] Fetching stock name from Eastmoney for symbol: %s\n", symbol)
	
	// Convert symbol to Eastmoney secid format
	secid, err := s.convertToEastmoneySecID(symbol)
	if err != nil {
		fmt.Printf("[StockAPI] ERROR: Failed to convert symbol to secid: %v\n", err)
		return "", err
	}
	
	// Build request URL
	url := fmt.Sprintf("http://push2.eastmoney.com/api/qt/stock/get?secid=%s&fields=f58", secid)
	fmt.Printf("[StockAPI] Eastmoney HTTP GET: %s\n", url)
	
	// Create HTTP request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("[StockAPI] ERROR: Failed to create Eastmoney HTTP request: %v\n", err)
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	
	// Create a client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	// Execute request
	startTime := time.Now()
	resp, err := client.Do(req)
	duration := time.Since(startTime)
	
	if err != nil {
		fmt.Printf("[StockAPI] ERROR: Eastmoney HTTP request failed after %v: %v\n", duration, err)
		return "", fmt.Errorf("%w: %v", ErrExternalAPI, err)
	}
	defer resp.Body.Close()
	
	fmt.Printf("[StockAPI] Eastmoney HTTP response received in %v, status: %d\n", duration, resp.StatusCode)
	
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[StockAPI] ERROR: Eastmoney non-OK status code: %d\n", resp.StatusCode)
		return "", fmt.Errorf("%w: status code %d", ErrExternalAPI, resp.StatusCode)
	}
	
	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("[StockAPI] ERROR: Failed to read Eastmoney response body: %v\n", err)
		return "", fmt.Errorf("failed to read response: %w", err)
	}
	
	fmt.Printf("[StockAPI] Eastmoney response body size: %d bytes\n", len(body))
	
	// Parse JSON response
	var eastmoneyResp eastmoneyResponse
	if err := json.Unmarshal(body, &eastmoneyResp); err != nil {
		fmt.Printf("[StockAPI] ERROR: Failed to parse Eastmoney JSON response: %v\n", err)
		fmt.Printf("[StockAPI] Response body preview: %s\n", string(body[:min(len(body), 500)]))
		return "", fmt.Errorf("failed to parse response: %w", err)
	}
	
	// Check return code
	if eastmoneyResp.RC != 0 {
		fmt.Printf("[StockAPI] ERROR: Eastmoney API returned error code: %d, message: %s\n", 
			eastmoneyResp.RC, eastmoneyResp.Msg)
		return "", fmt.Errorf("eastmoney API error: %s", eastmoneyResp.Msg)
	}
	
	// Extract stock name
	stockName := strings.TrimSpace(eastmoneyResp.Data.F58)
	if stockName == "" {
		fmt.Printf("[StockAPI] WARNING: Eastmoney returned empty stock name for %s\n", symbol)
		return "", fmt.Errorf("empty stock name returned")
	}
	
	fmt.Printf("[StockAPI] Successfully fetched stock name from Eastmoney: %s -> %s\n", symbol, stockName)
	
	return stockName, nil
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
	
	fmt.Printf("[StockAPI] GetStockInfo called for symbol: %s\n", symbol)
	
	if symbol == "" {
		fmt.Printf("[StockAPI] ERROR: Empty symbol provided\n")
		return nil, ErrInvalidSymbol
	}
	
	// Check if it's a cash symbol
	if s.IsCashSymbol(symbol) {
		fmt.Printf("[StockAPI] Cash symbol detected: %s, returning fixed price\n", symbol)
		return s.getCashInfo(symbol), nil
	}
	
	// Check cache first
	if cached, found := s.getCachedStockInfo(symbol); found {
		fmt.Printf("[StockAPI] Cache HIT for %s (price: %.2f)\n", symbol, cached.CurrentPrice)
		return cached, nil
	}
	fmt.Printf("[StockAPI] Cache MISS for %s, fetching from external APIs\n", symbol)
	
	// Use a short time range (last 1 day) to get current price
	endTime := time.Now()
	startTime := endTime.AddDate(0, 0, -1)
	
	// Check if it's a Chinese stock
	isChinaStock := s.IsChinaStock(symbol)
	
	var info *StockInfo
	
	if isChinaStock {
		// For Chinese stocks, fetch from both Yahoo Finance and Eastmoney concurrently
		fmt.Printf("[StockAPI] Chinese stock detected: %s, fetching from both Yahoo Finance and Eastmoney\n", symbol)
		
		// Create channels for concurrent API calls
		type yahooResult struct {
			info *StockInfo
			err  error
		}
		type eastmoneyResult struct {
			name string
			err  error
		}
		
		yahooChan := make(chan yahooResult, 1)
		eastmoneyChan := make(chan eastmoneyResult, 1)
		
		// Fetch from Yahoo Finance concurrently
		go func() {
			fmt.Printf("[StockAPI] [Goroutine] Calling Yahoo Finance API for %s\n", symbol)
			response, err := s.fetchFromYahooChart(symbol, startTime.Unix(), endTime.Unix())
			if err != nil {
				fmt.Printf("[StockAPI] [Goroutine] Yahoo Finance API call failed: %v\n", err)
				yahooChan <- yahooResult{nil, err}
				return
			}
			
			stockInfo, err := s.extractStockInfo(response)
			if err != nil {
				fmt.Printf("[StockAPI] [Goroutine] Failed to extract stock info: %v\n", err)
				yahooChan <- yahooResult{nil, err}
				return
			}
			
			fmt.Printf("[StockAPI] [Goroutine] Yahoo Finance fetch successful\n")
			yahooChan <- yahooResult{stockInfo, nil}
		}()
		
		// Fetch from Eastmoney concurrently
		go func() {
			fmt.Printf("[StockAPI] [Goroutine] Calling Eastmoney API for %s\n", symbol)
			name, err := s.fetchStockNameFromEastmoney(symbol)
			if err != nil {
				fmt.Printf("[StockAPI] [Goroutine] Eastmoney API call failed: %v\n", err)
				eastmoneyChan <- eastmoneyResult{"", err}
				return
			}
			
			fmt.Printf("[StockAPI] [Goroutine] Eastmoney fetch successful: %s\n", name)
			eastmoneyChan <- eastmoneyResult{name, nil}
		}()
		
		// Wait for both results
		yahooRes := <-yahooChan
		eastmoneyRes := <-eastmoneyChan
		
		// Yahoo Finance result is critical
		if yahooRes.err != nil {
			fmt.Printf("[StockAPI] ERROR: Yahoo Finance API call failed for %s: %v\n", symbol, yahooRes.err)
			return nil, yahooRes.err
		}
		
		info = yahooRes.info
		
		// Use Eastmoney name if available, otherwise fallback to Yahoo Finance name
		if eastmoneyRes.err == nil && eastmoneyRes.name != "" {
			fmt.Printf("[StockAPI] Using Eastmoney name: %s (replacing Yahoo name: %s)\n", 
				eastmoneyRes.name, info.Name)
			info.Name = eastmoneyRes.name
		} else {
			fmt.Printf("[StockAPI] WARNING: Eastmoney name fetch failed, falling back to Yahoo Finance name: %s (reason: %v)\n", 
				info.Name, eastmoneyRes.err)
		}
		
	} else {
		// For non-Chinese stocks, use Yahoo Finance only
		fmt.Printf("[StockAPI] Non-Chinese stock: %s, fetching from Yahoo Finance only\n", symbol)
		fmt.Printf("[StockAPI] Calling Yahoo Finance API for %s (period: %s to %s)\n", 
			symbol, startTime.Format("2006-01-02"), endTime.Format("2006-01-02"))
		
		response, err := s.fetchFromYahooChart(symbol, startTime.Unix(), endTime.Unix())
		if err != nil {
			fmt.Printf("[StockAPI] ERROR: Yahoo Finance API call failed for %s: %v\n", symbol, err)
			return nil, err
		}
		
		var err2 error
		info, err2 = s.extractStockInfo(response)
		if err2 != nil {
			fmt.Printf("[StockAPI] ERROR: Failed to extract stock info for %s: %v\n", symbol, err2)
			return nil, err2
		}
	}
	
	fmt.Printf("[StockAPI] Successfully fetched %s: price=%.2f, currency=%s, name=%s\n", 
		symbol, info.CurrentPrice, info.Currency, info.Name)
	
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
	validPeriods := map[string]bool{"1M": true, "3M": true, "6M": true, "1Y": true, "ALL": true}
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
	case "ALL":
		startTime = endTime.AddDate(-10, 0, 0)
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

package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
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
	tushareToken         string
	stockCache           map[string]*CachedStockData
	historicalCache      map[string]*CachedHistoricalData
	cacheMutex           sync.RWMutex
	stockCacheDuration   time.Duration
}

// NewStockAPIService creates a new StockAPIService instance
func NewStockAPIService() *StockAPIService {
	tushareToken := os.Getenv("TUSHARE_TOKEN")
	
	return &StockAPIService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		tushareToken:       tushareToken,
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
type yahooQuoteResponse struct {
	QuoteResponse struct {
		Result []struct {
			Symbol             string  `json:"symbol"`
			ShortName          string  `json:"shortName"`
			LongName           string  `json:"longName"`
			RegularMarketPrice float64 `json:"regularMarketPrice"`
			Currency           string  `json:"currency"`
			Sector             string  `json:"sector"`
		} `json:"result"`
		Error interface{} `json:"error"`
	} `json:"quoteResponse"`
}

type yahooChartResponse struct {
	Chart struct {
		Result []struct {
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

// GetStockInfoUS fetches stock information for US stocks from Yahoo Finance
func (s *StockAPIService) GetStockInfoUS(symbol string) (*StockInfo, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
	// Build Yahoo Finance API URL
	url := fmt.Sprintf("https://query1.finance.yahoo.com/v7/finance/quote?symbols=%s", symbol)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0")
	
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
	
	var quoteResp yahooQuoteResponse
	if err := json.Unmarshal(body, &quoteResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	
	if len(quoteResp.QuoteResponse.Result) == 0 {
		return nil, ErrStockNotFound
	}
	
	result := quoteResp.QuoteResponse.Result[0]
	
	// Use shortName or longName
	name := result.ShortName
	if name == "" {
		name = result.LongName
	}
	
	// Default to USD if currency not specified
	currency := result.Currency
	if currency == "" {
		currency = "USD"
	}
	
	return &StockInfo{
		Symbol:       result.Symbol,
		Name:         name,
		CurrentPrice: result.RegularMarketPrice,
		Currency:     strings.ToUpper(currency),
		Sector:       result.Sector,
	}, nil
}

// GetHistoricalDataUS fetches historical price data for US stocks from Yahoo Finance
func (s *StockAPIService) GetHistoricalDataUS(symbol string, period string) ([]HistoricalPrice, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
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
	default:
		return nil, ErrInvalidPeriod
	}
	
	// Build Yahoo Finance chart API URL
	url := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s?period1=%d&period2=%d&interval=1d",
		symbol,
		startTime.Unix(),
		endTime.Unix(),
	)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0")
	
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
	
	result := chartResp.Chart.Result[0]
	
	if len(result.Indicators.Quote) == 0 {
		return nil, ErrStockNotFound
	}
	
	timestamps := result.Timestamp
	closes := result.Indicators.Quote[0].Close
	
	if len(timestamps) != len(closes) {
		return nil, fmt.Errorf("mismatched data length")
	}
	
	historicalData := make([]HistoricalPrice, 0, len(timestamps))
	for i := 0; i < len(timestamps); i++ {
		// Skip null values
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

// Tushare API request/response structures
type tushareRequest struct {
	APIName string                 `json:"api_name"`
	Token   string                 `json:"token"`
	Params  map[string]interface{} `json:"params"`
	Fields  string                 `json:"fields"`
}

type tushareResponse struct {
	Code int `json:"code"`
	Msg  string `json:"msg"`
	Data struct {
		Fields []string        `json:"fields"`
		Items  [][]interface{} `json:"items"`
	} `json:"data"`
}

// convertTushareSymbol converts symbol format between Yahoo (.SS/.SZ) and Tushare format
// Yahoo: 600000.SS -> Tushare: 600000.SH
// Yahoo: 000001.SZ -> Tushare: 000001.SZ
func (s *StockAPIService) convertTushareSymbol(symbol string, toTushare bool) string {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	
	if toTushare {
		// Convert .SS to .SH for Tushare
		if strings.HasSuffix(symbol, ".SS") {
			return strings.Replace(symbol, ".SS", ".SH", 1)
		}
	} else {
		// Convert .SH to .SS for Yahoo format
		if strings.HasSuffix(symbol, ".SH") {
			return strings.Replace(symbol, ".SH", ".SS", 1)
		}
	}
	
	return symbol
}

// callTushareAPI makes a request to Tushare API
func (s *StockAPIService) callTushareAPI(apiName string, params map[string]interface{}, fields string) (*tushareResponse, error) {
	if s.tushareToken == "" {
		return nil, fmt.Errorf("%w: Tushare token not configured", ErrExternalAPI)
	}
	
	reqBody := tushareRequest{
		APIName: apiName,
		Token:   s.tushareToken,
		Params:  params,
		Fields:  fields,
	}
	
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}
	
	req, err := http.NewRequest("POST", "http://api.tushare.pro", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	req.Header.Set("Content-Type", "application/json")
	
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
	
	var tushareResp tushareResponse
	if err := json.Unmarshal(body, &tushareResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	
	if tushareResp.Code != 0 {
		return nil, fmt.Errorf("%w: %s", ErrExternalAPI, tushareResp.Msg)
	}
	
	return &tushareResp, nil
}

// GetStockInfoChina fetches stock information for Chinese stocks from Tushare
func (s *StockAPIService) GetStockInfoChina(symbol string) (*StockInfo, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	tushareSymbol := s.convertTushareSymbol(symbol, true)
	
	// Get daily quote data
	params := map[string]interface{}{
		"ts_code": tushareSymbol,
	}
	
	resp, err := s.callTushareAPI("daily", params, "ts_code,trade_date,close")
	if err != nil {
		return nil, err
	}
	
	if len(resp.Data.Items) == 0 {
		return nil, ErrStockNotFound
	}
	
	// Get the most recent price (first item is most recent)
	item := resp.Data.Items[0]
	
	var price float64
	if priceVal, ok := item[2].(float64); ok {
		price = priceVal
	} else if priceStr, ok := item[2].(string); ok {
		fmt.Sscanf(priceStr, "%f", &price)
	}
	
	// Get stock basic info for name
	basicParams := map[string]interface{}{
		"ts_code": tushareSymbol,
	}
	
	basicResp, err := s.callTushareAPI("stock_basic", basicParams, "ts_code,name")
	if err != nil {
		// If we can't get the name, still return with symbol as name
		return &StockInfo{
			Symbol:       symbol,
			Name:         symbol,
			CurrentPrice: price,
			Currency:     "CNY",
		}, nil
	}
	
	name := symbol
	if len(basicResp.Data.Items) > 0 && len(basicResp.Data.Items[0]) > 1 {
		if nameStr, ok := basicResp.Data.Items[0][1].(string); ok {
			name = nameStr
		}
	}
	
	return &StockInfo{
		Symbol:       symbol,
		Name:         name,
		CurrentPrice: price,
		Currency:     "CNY",
	}, nil
}

// GetHistoricalDataChina fetches historical price data for Chinese stocks from Tushare
func (s *StockAPIService) GetHistoricalDataChina(symbol string, period string) ([]HistoricalPrice, error) {
	symbol = strings.ToUpper(strings.TrimSpace(symbol))
	tushareSymbol := s.convertTushareSymbol(symbol, true)
	
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
	default:
		return nil, ErrInvalidPeriod
	}
	
	// Tushare uses YYYYMMDD format
	startDateStr := startTime.Format("20060102")
	endDateStr := endTime.Format("20060102")
	
	params := map[string]interface{}{
		"ts_code":    tushareSymbol,
		"start_date": startDateStr,
		"end_date":   endDateStr,
	}
	
	resp, err := s.callTushareAPI("daily", params, "trade_date,close")
	if err != nil {
		return nil, err
	}
	
	if len(resp.Data.Items) == 0 {
		return nil, ErrStockNotFound
	}
	
	historicalData := make([]HistoricalPrice, 0, len(resp.Data.Items))
	
	for _, item := range resp.Data.Items {
		if len(item) < 2 {
			continue
		}
		
		// Parse date (format: YYYYMMDD)
		var dateStr string
		if ds, ok := item[0].(string); ok {
			dateStr = ds
		} else {
			continue
		}
		
		date, err := time.Parse("20060102", dateStr)
		if err != nil {
			continue
		}
		
		// Parse price
		var price float64
		if priceVal, ok := item[1].(float64); ok {
			price = priceVal
		} else if priceStr, ok := item[1].(string); ok {
			fmt.Sscanf(priceStr, "%f", &price)
		}
		
		if price > 0 {
			historicalData = append(historicalData, HistoricalPrice{
				Date:  date,
				Price: price,
			})
		}
	}
	
	// Tushare returns data in descending order, reverse it to ascending
	for i, j := 0, len(historicalData)-1; i < j; i, j = i+1, j-1 {
		historicalData[i], historicalData[j] = historicalData[j], historicalData[i]
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
	
	var info *StockInfo
	var err error
	
	// Determine which API to use based on symbol
	if s.IsChinaStock(symbol) {
		info, err = s.GetStockInfoChina(symbol)
	} else if s.IsUSStock(symbol) {
		info, err = s.GetStockInfoUS(symbol)
	} else {
		return nil, ErrInvalidSymbol
	}
	
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
	
	var data []HistoricalPrice
	var err error
	
	// Determine which API to use based on symbol
	if s.IsChinaStock(symbol) {
		data, err = s.GetHistoricalDataChina(symbol, period)
	} else if s.IsUSStock(symbol) {
		data, err = s.GetHistoricalDataUS(symbol, period)
	} else {
		return nil, ErrInvalidSymbol
	}
	
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

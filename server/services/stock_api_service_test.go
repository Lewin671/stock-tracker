package services

import (
	"errors"
	"testing"
	"time"
)

// Test 7.1: 测试美股数据获取
func TestGetStockInfo_USStock(t *testing.T) {
	service := NewStockAPIService()
	
	// Test with AAPL
	info, err := service.GetStockInfo("AAPL")
	if err != nil {
		t.Fatalf("GetStockInfo failed: %v", err)
	}
	
	// Verify symbol
	if info.Symbol != "AAPL" {
		t.Errorf("Expected symbol 'AAPL', got '%s'", info.Symbol)
	}
	
	// Verify name is not empty
	if info.Name == "" {
		t.Error("Expected non-empty name")
	}
	
	// Verify currentPrice is positive
	if info.CurrentPrice <= 0 {
		t.Errorf("Expected positive currentPrice, got %f", info.CurrentPrice)
	}
	
	// Verify currency is USD
	if info.Currency != "USD" {
		t.Errorf("Expected currency 'USD', got '%s'", info.Currency)
	}
	
	t.Logf("AAPL Stock Info: Symbol=%s, Name=%s, Price=%f, Currency=%s", 
		info.Symbol, info.Name, info.CurrentPrice, info.Currency)
}

func TestGetHistoricalData_USStock_AllPeriods(t *testing.T) {
	service := NewStockAPIService()
	
	periods := []string{"1M", "3M", "6M", "1Y"}
	
	for _, period := range periods {
		t.Run(period, func(t *testing.T) {
			data, err := service.GetHistoricalData("AAPL", period)
			if err != nil {
				t.Fatalf("GetHistoricalData failed for period %s: %v", period, err)
			}
			
			// Verify data is not empty
			if len(data) == 0 {
				t.Errorf("Expected non-empty historical data for period %s", period)
			}
			
			// Verify data is sorted in ascending order by date
			for i := 1; i < len(data); i++ {
				if data[i].Date.Before(data[i-1].Date) {
					t.Errorf("Historical data not sorted in ascending order at index %d", i)
					break
				}
			}
			
			// Verify all prices are positive
			for i, point := range data {
				if point.Price <= 0 {
					t.Errorf("Invalid price at index %d: %f", i, point.Price)
				}
			}
			
			t.Logf("AAPL %s: %d data points, first date=%s, last date=%s", 
				period, len(data), data[0].Date.Format("2006-01-02"), data[len(data)-1].Date.Format("2006-01-02"))
		})
	}
}

// Test 7.2: 测试中国股票数据获取
func TestGetStockInfo_ChinaStock(t *testing.T) {
	service := NewStockAPIService()
	
	// Test with 600000.SS (Shanghai Pudong Development Bank)
	info, err := service.GetStockInfo("600000.SS")
	if err != nil {
		t.Fatalf("GetStockInfo failed: %v", err)
	}
	
	// Verify symbol
	if info.Symbol != "600000.SS" {
		t.Errorf("Expected symbol '600000.SS', got '%s'", info.Symbol)
	}
	
	// Verify name is not empty
	if info.Name == "" {
		t.Error("Expected non-empty name")
	}
	
	// Verify currentPrice is positive
	if info.CurrentPrice <= 0 {
		t.Errorf("Expected positive currentPrice, got %f", info.CurrentPrice)
	}
	
	// Verify currency is CNY
	if info.Currency != "CNY" {
		t.Errorf("Expected currency 'CNY', got '%s'", info.Currency)
	}
	
	t.Logf("600000.SS Stock Info: Symbol=%s, Name=%s, Price=%f, Currency=%s", 
		info.Symbol, info.Name, info.CurrentPrice, info.Currency)
}

func TestGetHistoricalData_ChinaStock_AllPeriods(t *testing.T) {
	service := NewStockAPIService()
	
	periods := []string{"1M", "3M", "6M", "1Y"}
	
	for _, period := range periods {
		t.Run(period, func(t *testing.T) {
			data, err := service.GetHistoricalData("600000.SS", period)
			if err != nil {
				t.Fatalf("GetHistoricalData failed for period %s: %v", period, err)
			}
			
			// Verify data is not empty
			if len(data) == 0 {
				t.Errorf("Expected non-empty historical data for period %s", period)
			}
			
			// Verify data is sorted in ascending order by date
			for i := 1; i < len(data); i++ {
				if data[i].Date.Before(data[i-1].Date) {
					t.Errorf("Historical data not sorted in ascending order at index %d", i)
					break
				}
			}
			
			// Verify all prices are positive
			for i, point := range data {
				if point.Price <= 0 {
					t.Errorf("Invalid price at index %d: %f", i, point.Price)
				}
			}
			
			// Verify data format is consistent with US stocks
			if len(data) > 0 {
				if data[0].Date.IsZero() {
					t.Error("Date should not be zero")
				}
			}
			
			t.Logf("600000.SS %s: %d data points, first date=%s, last date=%s", 
				period, len(data), data[0].Date.Format("2006-01-02"), data[len(data)-1].Date.Format("2006-01-02"))
		})
	}
}

// Test 7.3: 测试缓存机制
func TestCacheMechanism(t *testing.T) {
	service := NewStockAPIService()
	
	symbol := "AAPL"
	
	// First call - should fetch from API
	t.Log("First call - fetching from API")
	info1, err := service.GetStockInfo(symbol)
	if err != nil {
		t.Fatalf("First GetStockInfo failed: %v", err)
	}
	
	// Second call - should return from cache
	t.Log("Second call - should return from cache")
	startTime := time.Now()
	info2, err := service.GetStockInfo(symbol)
	if err != nil {
		t.Fatalf("Second GetStockInfo failed: %v", err)
	}
	duration := time.Since(startTime)
	
	// Verify data is the same
	if info1.Symbol != info2.Symbol || info1.CurrentPrice != info2.CurrentPrice {
		t.Error("Cached data should be identical to first call")
	}
	
	// Cache hit should be very fast (< 10ms)
	if duration > 10*time.Millisecond {
		t.Logf("Warning: Cache hit took %v, expected < 10ms", duration)
	} else {
		t.Logf("Cache hit took %v (fast as expected)", duration)
	}
	
	// Test cache expiration by manually setting a very short cache duration
	serviceShortCache := &StockAPIService{
		httpClient:         service.httpClient,
		stockCache:         make(map[string]*CachedStockData),
		historicalCache:    make(map[string]*CachedHistoricalData),
		stockCacheDuration: 1 * time.Second, // Very short cache
	}
	
	// First call
	t.Log("Testing cache expiration - first call")
	_, err = serviceShortCache.GetStockInfo(symbol)
	if err != nil {
		t.Fatalf("GetStockInfo failed: %v", err)
	}
	
	// Wait for cache to expire
	t.Log("Waiting for cache to expire (1 second)")
	time.Sleep(1100 * time.Millisecond)
	
	// Third call - should fetch from API again after expiration
	t.Log("After expiration - should fetch from API again")
	info3, err := serviceShortCache.GetStockInfo(symbol)
	if err != nil {
		t.Fatalf("GetStockInfo after expiration failed: %v", err)
	}
	
	if info3.Symbol != symbol {
		t.Errorf("Expected symbol %s after cache expiration", symbol)
	}
	
	t.Log("Cache expiration test passed")
}

func TestHistoricalDataCache(t *testing.T) {
	service := NewStockAPIService()
	
	symbol := "AAPL"
	period := "1M"
	
	// First call - should fetch from API
	data1, err := service.GetHistoricalData(symbol, period)
	if err != nil {
		t.Fatalf("First GetHistoricalData failed: %v", err)
	}
	
	// Second call - should return from cache
	startTime := time.Now()
	data2, err := service.GetHistoricalData(symbol, period)
	if err != nil {
		t.Fatalf("Second GetHistoricalData failed: %v", err)
	}
	duration := time.Since(startTime)
	
	// Verify data length is the same
	if len(data1) != len(data2) {
		t.Errorf("Cached data length mismatch: %d vs %d", len(data1), len(data2))
	}
	
	// Cache hit should be very fast
	if duration > 10*time.Millisecond {
		t.Logf("Warning: Cache hit took %v, expected < 10ms", duration)
	} else {
		t.Logf("Historical data cache hit took %v (fast as expected)", duration)
	}
}

// Test 7.4: 测试错误处理
func TestErrorHandling_InvalidSymbol(t *testing.T) {
	service := NewStockAPIService()
	
	// Test empty symbol
	_, err := service.GetStockInfo("")
	if err != ErrInvalidSymbol {
		t.Errorf("Expected ErrInvalidSymbol for empty symbol, got %v", err)
	}
	
	// Test whitespace-only symbol
	_, err = service.GetStockInfo("   ")
	if err != ErrInvalidSymbol {
		t.Errorf("Expected ErrInvalidSymbol for whitespace symbol, got %v", err)
	}
}

func TestErrorHandling_StockNotFound(t *testing.T) {
	service := NewStockAPIService()
	
	// Test with invalid/non-existent symbol
	_, err := service.GetStockInfo("INVALIDXYZ123")
	if err == nil {
		t.Error("Expected error for invalid symbol, got nil")
	}
	
	// Should return either ErrStockNotFound or ErrExternalAPI (404)
	if err != ErrStockNotFound && !errors.Is(err, ErrExternalAPI) {
		// Check if error message contains "external API error"
		if !contains(err.Error(), "external API error") {
			t.Errorf("Expected ErrStockNotFound or ErrExternalAPI for invalid symbol, got %v", err)
		}
	}
	
	t.Logf("Invalid symbol error: %v", err)
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestErrorHandling_InvalidPeriod(t *testing.T) {
	service := NewStockAPIService()
	
	invalidPeriods := []string{"", "1D", "2M", "5Y", "invalid"}
	
	for _, period := range invalidPeriods {
		t.Run(period, func(t *testing.T) {
			_, err := service.GetHistoricalData("AAPL", period)
			if err != ErrInvalidPeriod {
				t.Errorf("Expected ErrInvalidPeriod for period '%s', got %v", period, err)
			}
		})
	}
}

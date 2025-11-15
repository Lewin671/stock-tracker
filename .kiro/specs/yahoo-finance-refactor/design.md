# Design Document

## Overview

本设计文档描述了将 Stock Portfolio Tracker 系统的股票数据源统一迁移到 Yahoo Finance API 的技术方案。当前系统使用两个不同的数据源：Yahoo Finance（美股）和 Tushare（中国股票）。通过测试验证，Yahoo Finance API 可以同时支持美股和中国股票数据获取，因此可以简化架构，统一使用单一数据源。

重构的核心目标是：
1. 移除 Tushare API 依赖
2. 统一使用 Yahoo Finance Chart API（v8/finance/chart）
3. 保持现有 API 接口不变，确保向后兼容
4. 维持缓存机制以优化性能

## Architecture

### Current Architecture

```
┌─────────────────────────────────────────────────┐
│         Stock API Service                       │
│                                                  │
│  ┌──────────────┐      ┌──────────────┐        │
│  │  US Stocks   │      │China Stocks  │        │
│  │              │      │              │        │
│  │ GetStockInfo │      │GetStockInfo  │        │
│  │      US      │      │    China     │        │
│  │              │      │              │        │
│  │GetHistorical │      │GetHistorical │        │
│  │   DataUS     │      │  DataChina   │        │
│  └──────┬───────┘      └──────┬───────┘        │
│         │                     │                 │
└─────────┼─────────────────────┼─────────────────┘
          │                     │
          ▼                     ▼
  ┌───────────────┐    ┌────────────────┐
  │Yahoo Finance  │    │  Tushare API   │
  │     API       │    │                │
  │  (US Stocks)  │    │(Chinese Stocks)│
  └───────────────┘    └────────────────┘
```

### New Architecture (After Refactor)

```
┌─────────────────────────────────────────────────┐
│         Stock API Service                       │
│                                                  │
│  ┌──────────────────────────────────────┐      │
│  │    Unified Stock Data Handler        │      │
│  │                                       │      │
│  │  GetStockInfo(symbol)                │      │
│  │    - Calls Yahoo Chart API           │      │
│  │    - Extracts meta data              │      │
│  │    - Returns StockInfo               │      │
│  │                                       │      │
│  │  GetHistoricalData(symbol, period)   │      │
│  │    - Calls Yahoo Chart API           │      │
│  │    - Extracts timestamp & prices     │      │
│  │    - Returns []HistoricalPrice       │      │
│  │                                       │      │
│  └──────────────┬───────────────────────┘      │
│                 │                               │
│  ┌──────────────┴───────────────────────┐      │
│  │         Cache Layer                  │      │
│  │  - Stock Info Cache (5 min TTL)      │      │
│  │  - Historical Data Cache (5 min TTL) │      │
│  └──────────────────────────────────────┘      │
│                                                  │
└─────────────────┼────────────────────────────────┘
                  │
                  ▼
          ┌───────────────┐
          │Yahoo Finance  │
          │  Chart API    │
          │ (All Markets) │
          └───────────────┘
```

### Key Changes

1. **单一数据源**: 所有股票数据都从 Yahoo Finance Chart API 获取
2. **统一处理逻辑**: 不再区分美股和中国股票的处理流程
3. **简化代码**: 移除 Tushare 相关的所有代码和配置
4. **保持接口**: 公共方法签名和返回数据结构保持不变

## Components and Interfaces

### Yahoo Finance Chart API

#### Endpoint
```
GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
```

#### Query Parameters
- `period1`: Unix timestamp for start date
- `period2`: Unix timestamp for end date  
- `interval`: Data interval (e.g., "1d" for daily)

#### Request Headers
```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

#### Response Structure
```json
{
  "chart": {
    "result": [
      {
        "meta": {
          "symbol": "AAPL",
          "currency": "USD",
          "regularMarketPrice": 272.41,
          "longName": "Apple Inc.",
          "chartPreviousClose": 268.47
        },
        "timestamp": [1762785000, 1762871400, ...],
        "indicators": {
          "quote": [
            {
              "close": [269.43, 275.25, ...]
            }
          ]
        }
      }
    ],
    "error": null
  }
}
```

### StockAPIService Structure

#### Fields
```go
type StockAPIService struct {
    httpClient           *http.Client
    stockCache           map[string]*CachedStockData
    historicalCache      map[string]*CachedHistoricalData
    cacheMutex           sync.RWMutex
    stockCacheDuration   time.Duration
}
```

**Removed Fields:**
- `tushareToken string` - No longer needed

#### Public Methods

```go
// GetStockInfo fetches current stock information
func (s *StockAPIService) GetStockInfo(symbol string) (*StockInfo, error)

// GetHistoricalData fetches historical price data
func (s *StockAPIService) GetHistoricalData(symbol string, period string) ([]HistoricalPrice, error)

// IsUSStock checks if symbol is a US stock (kept for compatibility)
func (s *StockAPIService) IsUSStock(symbol string) bool

// IsChinaStock checks if symbol is a Chinese stock (kept for compatibility)
func (s *StockAPIService) IsChinaStock(symbol string) bool

// StartCacheCleanup starts background cache cleanup
func (s *StockAPIService) StartCacheCleanup(interval time.Duration)
```

#### Private Methods (New/Modified)

```go
// fetchFromYahooChart calls Yahoo Finance Chart API
func (s *StockAPIService) fetchFromYahooChart(symbol string, period1, period2 int64) (*yahooChartResponse, error)

// extractStockInfo extracts StockInfo from Yahoo Chart response
func (s *StockAPIService) extractStockInfo(response *yahooChartResponse) (*StockInfo, error)

// extractHistoricalData extracts historical prices from Yahoo Chart response
func (s *StockAPIService) extractHistoricalData(response *yahooChartResponse) ([]HistoricalPrice, error)

// Cache methods (unchanged)
func (s *StockAPIService) getCachedStockInfo(symbol string) (*StockInfo, bool)
func (s *StockAPIService) setCachedStockInfo(symbol string, info *StockInfo)
func (s *StockAPIService) getCachedHistoricalData(cacheKey string) ([]HistoricalPrice, bool)
func (s *StockAPIService) setCachedHistoricalData(cacheKey string, data []HistoricalPrice)
func (s *StockAPIService) cleanupExpiredCache()
```

**Removed Methods:**
- `GetStockInfoUS`
- `GetStockInfoChina`
- `GetHistoricalDataUS`
- `GetHistoricalDataChina`
- `callTushareAPI`
- `convertTushareSymbol`

### Data Structures

#### Response Structures

```go
// Yahoo Finance Chart API response
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
```

**Removed Structures:**
- `yahooQuoteResponse` - No longer using quote endpoint
- `tushareRequest`
- `tushareResponse`

#### Public Data Structures (Unchanged)

```go
type StockInfo struct {
    Symbol       string  `json:"symbol"`
    Name         string  `json:"name"`
    CurrentPrice float64 `json:"currentPrice"`
    Currency     string  `json:"currency"`
    Sector       string  `json:"sector,omitempty"`
}

type HistoricalPrice struct {
    Date  time.Time `json:"date"`
    Price float64   `json:"price"`
}

type CachedStockData struct {
    Data      *StockInfo
    ExpiresAt time.Time
}

type CachedHistoricalData struct {
    Data      []HistoricalPrice
    ExpiresAt time.Time
}
```

## Implementation Details

### GetStockInfo Implementation

```go
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
```

### GetHistoricalData Implementation

```go
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
    
    // Create cache key
    cacheKey := fmt.Sprintf("%s_%s", symbol, period)
    
    // Check cache first
    if cached, found := s.getCachedHistoricalData(cacheKey); found {
        return cached, nil
    }
    
    // Calculate time range
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
```

### Helper Methods

```go
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

func (s *StockAPIService) extractStockInfo(response *yahooChartResponse) (*StockInfo, error) {
    if len(response.Chart.Result) == 0 {
        return nil, ErrStockNotFound
    }
    
    result := response.Chart.Result[0]
    meta := result.Meta
    
    name := meta.LongName
    if name == "" {
        name = meta.ShortName
    }
    if name == "" {
        name = meta.Symbol
    }
    
    currency := strings.ToUpper(meta.Currency)
    if currency == "" {
        // Default based on symbol
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
    
    if len(timestamps) != len(closes) {
        return nil, fmt.Errorf("mismatched data length")
    }
    
    historicalData := make([]HistoricalPrice, 0, len(timestamps))
    for i := 0; i < len(timestamps); i++ {
        // Skip null or zero values
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
```

## Error Handling

### Error Types (Unchanged)

```go
var (
    ErrStockNotFound    = errors.New("stock not found")
    ErrExternalAPI      = errors.New("external API error")
    ErrInvalidSymbol    = errors.New("invalid stock symbol")
    ErrInvalidPeriod    = errors.New("invalid period parameter")
)
```

### Error Scenarios

1. **Invalid Symbol**: Return `ErrInvalidSymbol` when symbol is empty or malformed
2. **Stock Not Found**: Return `ErrStockNotFound` when Yahoo API returns no results
3. **API Error**: Return `ErrExternalAPI` with context when:
   - HTTP request fails
   - Non-200 status code received
   - Response parsing fails
4. **Network Timeout**: Return `ErrExternalAPI` when request exceeds 30-second timeout
5. **Invalid Period**: Return `ErrInvalidPeriod` when period parameter is not one of: 1M, 3M, 6M, 1Y

## Testing Strategy

### Unit Tests

1. **Test GetStockInfo**
   - Test with valid US stock symbol (AAPL)
   - Test with valid Chinese stock symbol (600000.SS)
   - Test with invalid symbol
   - Test cache hit scenario
   - Test API error handling

2. **Test GetHistoricalData**
   - Test with each valid period (1M, 3M, 6M, 1Y)
   - Test with invalid period
   - Test cache hit scenario
   - Test data extraction and ordering

3. **Test Helper Methods**
   - Test fetchFromYahooChart with various responses
   - Test extractStockInfo with different meta data
   - Test extractHistoricalData with various data arrays

### Integration Tests

1. **Live API Test**
   - Verify AAPL data can be fetched successfully
   - Verify 600000.SS (Chinese stock) data can be fetched successfully
   - Verify historical data for different periods

2. **Cache Test**
   - Verify cache stores and retrieves data correctly
   - Verify cache expiration works
   - Verify cache cleanup removes expired entries

### Manual Testing

1. Run the application and verify:
   - Dashboard displays correct stock prices
   - Holdings page shows accurate current values
   - Historical performance charts render correctly
   - Search functionality works for both US and Chinese stocks

## Migration Plan

### Phase 1: Code Refactoring
1. Update `yahooChartResponse` structure
2. Implement new helper methods (`fetchFromYahooChart`, `extractStockInfo`, `extractHistoricalData`)
3. Refactor `GetStockInfo` to use new implementation
4. Refactor `GetHistoricalData` to use new implementation

### Phase 2: Code Cleanup
1. Remove Tushare-related methods
2. Remove Tushare-related structures
3. Remove `tushareToken` field
4. Update `NewStockAPIService` constructor

### Phase 3: Configuration Cleanup
1. Remove `TUSHARE_TOKEN` from `.env.example`
2. Update documentation to remove Tushare references
3. Update deployment configuration

### Phase 4: Testing
1. Run unit tests
2. Run integration tests
3. Perform manual testing
4. Verify all existing functionality works

### Rollback Plan

If issues are discovered:
1. Revert code changes from git
2. Restore `TUSHARE_TOKEN` environment variable
3. Restart services

## Performance Considerations

### API Call Optimization

1. **Caching**: 5-minute cache TTL reduces API calls significantly
2. **Single Endpoint**: Using Chart API for both current and historical data reduces complexity
3. **Timeout**: 30-second timeout prevents hanging requests

### Expected Performance

- **Cache Hit**: < 1ms response time
- **Cache Miss**: 200-500ms response time (network latency + API processing)
- **API Rate Limits**: Yahoo Finance has informal rate limits; caching helps stay within limits

### Memory Usage

- Cache size depends on number of unique symbols and periods requested
- Each cached stock info: ~200 bytes
- Each cached historical data set: ~5-10 KB (depending on period)
- Periodic cleanup prevents unbounded growth

## Security Considerations

1. **No API Key Required**: Yahoo Finance Chart API doesn't require authentication
2. **User-Agent Header**: Required to avoid being blocked as a bot
3. **Input Validation**: Symbol and period parameters are validated before use
4. **Error Messages**: Don't expose internal implementation details to clients
5. **Timeout**: Prevents resource exhaustion from slow/hanging requests

## Backward Compatibility

### API Interface

All public methods maintain the same signatures:
- `GetStockInfo(symbol string) (*StockInfo, error)`
- `GetHistoricalData(symbol string, period string) ([]HistoricalPrice, error)`

### Data Structures

All public data structures remain unchanged:
- `StockInfo`
- `HistoricalPrice`
- Error types

### Behavior

- Same error types returned for same error conditions
- Same data format in responses
- Same caching behavior (5-minute TTL)
- Same supported periods (1M, 3M, 6M, 1Y)

### Breaking Changes

**None** - This is a pure internal refactoring. External interfaces remain identical.

## Documentation Updates

### Files to Update

1. **README.md**
   - Remove Tushare API references
   - Remove `TUSHARE_TOKEN` from environment variables section
   - Update "Data Sources" section to mention only Yahoo Finance

2. **server/.env.example**
   - Remove `TUSHARE_TOKEN=your-tushare-token-here`

3. **DEPLOYMENT.md**
   - Remove Tushare token configuration steps
   - Update environment variables list

4. **Design Document** (existing)
   - Update external APIs section
   - Remove Tushare from architecture diagrams

## Conclusion

这次重构将显著简化系统架构，通过统一使用 Yahoo Finance API 作为唯一数据源，减少了外部依赖和代码复杂度。重构保持了完全的向后兼容性，不会影响现有功能。通过保留缓存机制和优化 API 调用，系统性能将保持在相同水平。

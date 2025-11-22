package services

import (
	"fmt"
	"math"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// BacktestResponse represents the complete backtest result
type BacktestResponse struct {
	Period             BacktestPeriod      `json:"period"`
	Currency           string              `json:"currency"`
	Performance        []BacktestDataPoint `json:"performance"`
	Metrics            BacktestMetrics     `json:"metrics"`
	AssetContributions []AssetContribution `json:"assetContributions"`
	Benchmark          *BenchmarkInfo      `json:"benchmark,omitempty"`
}

// BacktestPeriod represents the backtest time period
type BacktestPeriod struct {
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
}

// BacktestDataPoint represents a single data point in the backtest
type BacktestDataPoint struct {
	Date            time.Time `json:"date"`
	PortfolioValue  float64   `json:"portfolioValue"`
	PortfolioReturn float64   `json:"portfolioReturn"`
	BenchmarkReturn float64   `json:"benchmarkReturn,omitempty"`
}

// BacktestMetrics represents calculated performance metrics
type BacktestMetrics struct {
	TotalReturn        float64 `json:"totalReturn"`
	TotalReturnPercent float64 `json:"totalReturnPercent"`
	AnnualizedReturn   float64 `json:"annualizedReturn"`
	MaxDrawdown        float64 `json:"maxDrawdown"`
	Volatility         float64 `json:"volatility"`
	SharpeRatio        float64 `json:"sharpeRatio"`
	ExcessReturn       float64 `json:"excessReturn,omitempty"`
}

// AssetContribution represents an asset's contribution to portfolio return
type AssetContribution struct {
	Symbol              string  `json:"symbol"`
	Name                string  `json:"name"`
	Weight              float64 `json:"weight"`
	Return              float64 `json:"return"`
	ReturnPercent       float64 `json:"returnPercent"`
	Contribution        float64 `json:"contribution"`
	ContributionPercent float64 `json:"contributionPercent"`
}

// BenchmarkInfo represents benchmark information
type BenchmarkInfo struct {
	Symbol      string  `json:"symbol"`
	Name        string  `json:"name"`
	TotalReturn float64 `json:"totalReturn"`
}

// BacktestService handles portfolio backtest calculations
type BacktestService struct {
	portfolioService *PortfolioService
	analyticsService *AnalyticsService
	currencyService  *CurrencyService
	stockService     *StockAPIService
}

// NewBacktestService creates a new BacktestService instance
func NewBacktestService(
	portfolioService *PortfolioService,
	analyticsService *AnalyticsService,
	currencyService *CurrencyService,
	stockService *StockAPIService,
) *BacktestService {
	return &BacktestService{
		portfolioService: portfolioService,
		analyticsService: analyticsService,
		currencyService:  currencyService,
		stockService:     stockService,
	}
}

// RunBacktest performs portfolio backtest
func (s *BacktestService) RunBacktest(
	userID primitive.ObjectID,
	startDate time.Time,
	endDate time.Time,
	currency string,
	benchmark string,
) (*BacktestResponse, error) {
	fmt.Printf("[Backtest] Starting backtest for user %s from %s to %s in %s\n",
		userID.Hex(), startDate.Format("2006-01-02"), endDate.Format("2006-01-02"), currency)

	// Validate parameters
	if err := s.validateBacktestParams(startDate, endDate, currency); err != nil {
		return nil, err
	}

	// Get current holdings
	holdings, err := s.portfolioService.GetUserHoldings(userID, currency)
	if err != nil {
		return nil, fmt.Errorf("failed to get user holdings: %w", err)
	}

	if len(holdings) == 0 {
		return nil, fmt.Errorf("no holdings found for user")
	}

	// Calculate portfolio weights
	weights := s.calculatePortfolioWeights(holdings)

	// Get historical prices for all assets
	historicalPrices, err := s.getHistoricalPrices(holdings, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get historical prices: %w", err)
	}

	// Calculate backtest performance
	performance, err := s.calculateBacktestPerformance(weights, historicalPrices, startDate, endDate, currency, holdings)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate backtest performance: %w", err)
	}

	if len(performance) == 0 {
		return nil, fmt.Errorf("no performance data generated")
	}

	// Calculate metrics
	metrics, err := s.calculateBacktestMetrics(performance, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate metrics: %w", err)
	}

	// Calculate asset contributions
	assetContributions, err := s.calculateAssetContributions(weights, historicalPrices, startDate, endDate, currency, holdings)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate asset contributions: %w", err)
	}

	// Get benchmark data if specified
	var benchmarkInfo *BenchmarkInfo
	if benchmark != "" {
		benchmarkData, err := s.getBenchmarkData(benchmark, startDate, endDate)
		if err != nil {
			fmt.Printf("[Backtest] Warning: failed to get benchmark data: %v\n", err)
		} else if len(benchmarkData) > 0 {
			// Add benchmark returns to performance data
			s.mergeBenchmarkData(performance, benchmarkData)

			// Calculate excess return
			benchmarkTotalReturn := benchmarkData[len(benchmarkData)-1].PortfolioReturn
			metrics.ExcessReturn = metrics.TotalReturnPercent - benchmarkTotalReturn

			benchmarkInfo = &BenchmarkInfo{
				Symbol:      benchmark,
				Name:        s.getBenchmarkName(benchmark),
				TotalReturn: benchmarkTotalReturn,
			}
		}
	}

	response := &BacktestResponse{
		Period: BacktestPeriod{
			StartDate: startDate,
			EndDate:   endDate,
		},
		Currency:           currency,
		Performance:        performance,
		Metrics:            *metrics,
		AssetContributions: assetContributions,
		Benchmark:          benchmarkInfo,
	}

	fmt.Printf("[Backtest] Backtest completed successfully with %d data points\n", len(performance))
	return response, nil
}

// validateBacktestParams validates backtest parameters
func (s *BacktestService) validateBacktestParams(startDate, endDate time.Time, currency string) error {
	// Validate currency
	if currency != "USD" && currency != "RMB" && currency != "CNY" {
		return fmt.Errorf("invalid currency: must be USD or RMB")
	}

	// Validate dates
	if startDate.After(endDate) {
		return fmt.Errorf("start date must be before end date")
	}

	if endDate.After(time.Now()) {
		return fmt.Errorf("end date cannot be in the future")
	}

	// Validate time range (1 month to 10 years)
	duration := endDate.Sub(startDate)
	oneMonth := 30 * 24 * time.Hour
	tenYears := 10 * 365 * 24 * time.Hour

	if duration < oneMonth {
		return fmt.Errorf("backtest period must be at least 1 month")
	}

	if duration > tenYears {
		return fmt.Errorf("backtest period cannot exceed 10 years")
	}

	return nil
}

// calculatePortfolioWeights calculates current portfolio weights
func (s *BacktestService) calculatePortfolioWeights(holdings []Holding) map[string]float64 {
	weights := make(map[string]float64)
	totalValue := 0.0

	// Calculate total portfolio value
	for _, holding := range holdings {
		totalValue += holding.CurrentValue
	}

	// Calculate weights
	if totalValue > 0 {
		for _, holding := range holdings {
			weights[holding.Symbol] = holding.CurrentValue / totalValue
		}
	}

	return weights
}

// getHistoricalPrices fetches historical prices for all assets
func (s *BacktestService) getHistoricalPrices(holdings []Holding, startDate, endDate time.Time) (map[string][]HistoricalPrice, error) {
	historicalPrices := make(map[string][]HistoricalPrice)

	// Determine period string based on date range
	duration := endDate.Sub(startDate)
	var period string
	if duration <= 30*24*time.Hour {
		period = "1M"
	} else if duration <= 90*24*time.Hour {
		period = "3M"
	} else if duration <= 180*24*time.Hour {
		period = "6M"
	} else if duration <= 365*24*time.Hour {
		period = "1Y"
	} else {
		period = "ALL"
	}

	for _, holding := range holdings {
		prices, err := s.stockService.GetHistoricalData(holding.Symbol, period)
		if err != nil {
			fmt.Printf("[Backtest] Warning: failed to fetch historical data for %s: %v\n", holding.Symbol, err)
			continue
		}

		// Filter prices to the specified date range
		var filteredPrices []HistoricalPrice
		for _, price := range prices {
			if (price.Date.After(startDate) || price.Date.Equal(startDate)) &&
				(price.Date.Before(endDate) || price.Date.Equal(endDate)) {
				filteredPrices = append(filteredPrices, price)
			}
		}

		if len(filteredPrices) > 0 {
			historicalPrices[holding.Symbol] = filteredPrices
		}
	}

	if len(historicalPrices) == 0 {
		return nil, fmt.Errorf("no historical data available for any holdings")
	}

	return historicalPrices, nil
}

// getBenchmarkName returns the display name for a benchmark symbol
func (s *BacktestService) getBenchmarkName(symbol string) string {
	benchmarkNames := map[string]string{
		"^GSPC":     "S&P 500",
		"^IXIC":     "NASDAQ",
		"^DJI":      "Dow Jones",
		"000001.SS": "Shanghai Composite",
		"399001.SZ": "Shenzhen Component",
	}

	if name, ok := benchmarkNames[symbol]; ok {
		return name
	}
	return symbol
}

// mergeBenchmarkData merges benchmark returns into performance data
func (s *BacktestService) mergeBenchmarkData(performance []BacktestDataPoint, benchmarkData []BacktestDataPoint) {
	// Create a map of benchmark returns by date
	benchmarkMap := make(map[string]float64)
	for _, point := range benchmarkData {
		dateKey := point.Date.Format("2006-01-02")
		benchmarkMap[dateKey] = point.PortfolioReturn
	}

	// Merge benchmark returns into performance data
	for i := range performance {
		dateKey := performance[i].Date.Format("2006-01-02")
		if benchmarkReturn, ok := benchmarkMap[dateKey]; ok {
			performance[i].BenchmarkReturn = benchmarkReturn
		}
	}
}

// calculateBacktestPerformance calculates daily portfolio values
func (s *BacktestService) calculateBacktestPerformance(
	weights map[string]float64,
	historicalPrices map[string][]HistoricalPrice,
	startDate time.Time,
	endDate time.Time,
	currency string,
	holdings []Holding,
) ([]BacktestDataPoint, error) {
	// Build a map of all unique dates from historical prices
	dateMap := make(map[string]time.Time)
	for _, prices := range historicalPrices {
		for _, price := range prices {
			dateKey := price.Date.Format("2006-01-02")
			if _, exists := dateMap[dateKey]; !exists {
				dateMap[dateKey] = price.Date
			}
		}
	}

	// Convert to sorted slice of dates
	dates := make([]time.Time, 0, len(dateMap))
	for _, date := range dateMap {
		dates = append(dates, date)
	}

	sort.Slice(dates, func(i, j int) bool {
		return dates[i].Before(dates[j])
	})

	if len(dates) == 0 {
		return nil, fmt.Errorf("no historical dates available")
	}

	// Calculate total current portfolio value (this will be our initial investment)
	totalCurrentValue := 0.0
	for _, holding := range holdings {
		totalCurrentValue += holding.CurrentValue
	}

	// Calculate the number of shares to hold for each asset based on start date prices
	// This simulates a "buy and hold" strategy
	shares := make(map[string]float64)
	for symbol, weight := range weights {
		prices, ok := historicalPrices[symbol]
		if !ok || len(prices) == 0 {
			fmt.Printf("[Backtest] Warning: no historical prices available for %s, skipping\n", symbol)
			continue
		}

		// Find the price at start date (or closest available date)
		startPrice := s.findPriceForDate(prices, startDate)
		if startPrice <= 0 {
			// Try to use the first available price if no price found at start date
			if len(prices) > 0 {
				startPrice = prices[0].Price
				fmt.Printf("[Backtest] Warning: no start price found for %s at %s, using first available price %.2f at %s\n", 
					symbol, startDate.Format("2006-01-02"), startPrice, prices[0].Date.Format("2006-01-02"))
			} else {
				fmt.Printf("[Backtest] Warning: no start price found for %s, skipping\n", symbol)
				continue
			}
		}

		// Calculate initial investment amount for this asset
		initialInvestment := weight * totalCurrentValue

		// Handle currency conversion for initial investment if needed
		symbolCurrency := "USD"
		if s.stockService.IsChinaStock(symbol) {
			symbolCurrency = "CNY"
		}

		// Convert initial investment to asset's currency
		investmentInAssetCurrency := initialInvestment
		if symbolCurrency != currency {
			converted, err := s.currencyService.ConvertAmount(initialInvestment, currency, symbolCurrency)
			if err != nil {
				fmt.Printf("[Backtest] Warning: failed to convert currency for %s: %v\n", symbol, err)
				continue
			}
			investmentInAssetCurrency = converted
		}

		// Calculate number of shares: investment amount / start price
		shares[symbol] = investmentInAssetCurrency / startPrice
		fmt.Printf("[Backtest] %s: weight=%.2f%%, investment=%.2f %s, startPrice=%.2f, shares=%.2f\n",
			symbol, weight*100, investmentInAssetCurrency, symbolCurrency, startPrice, shares[symbol])
	}

	if len(shares) == 0 {
		return nil, fmt.Errorf("no valid shares calculated for any asset")
	}

	// Calculate portfolio value for each date using fixed share counts
	performance := make([]BacktestDataPoint, 0, len(dates))

	for _, date := range dates {
		portfolioValue := 0.0

		// For each asset, calculate its value on this date: shares * price
		for symbol, shareCount := range shares {
			prices, ok := historicalPrices[symbol]
			if !ok {
				continue
			}

			// Find the price for this date (or closest previous date)
			price := s.findPriceForDate(prices, date)
			if price <= 0 {
				continue
			}

			// Calculate value in asset's currency: shares * price
			assetValue := shareCount * price

			// Handle currency conversion if needed
			symbolCurrency := "USD"
			if s.stockService.IsChinaStock(symbol) {
				symbolCurrency = "CNY"
			}

			if symbolCurrency != currency {
				convertedValue, err := s.currencyService.ConvertAmount(assetValue, symbolCurrency, currency)
				if err != nil {
					fmt.Printf("[Backtest] Warning: failed to convert currency for %s: %v\n", symbol, err)
				} else {
					assetValue = convertedValue
				}
			}

			portfolioValue += assetValue
		}

		performance = append(performance, BacktestDataPoint{
			Date:            date,
			PortfolioValue:  portfolioValue,
			PortfolioReturn: 0, // Will calculate after all points are collected
		})
	}

	// Calculate returns based on initial portfolio value
	if len(performance) > 0 {
		initialValue := performance[0].PortfolioValue
		fmt.Printf("[Backtest] Initial portfolio value: %.2f %s\n", initialValue, currency)

		for i := range performance {
			if initialValue > 0 {
				performance[i].PortfolioReturn = ((performance[i].PortfolioValue - initialValue) / initialValue) * 100
			}
		}

		fmt.Printf("[Backtest] Final portfolio value: %.2f %s, return: %.2f%%\n",
			performance[len(performance)-1].PortfolioValue,
			currency,
			performance[len(performance)-1].PortfolioReturn)
	}

	return performance, nil
}

// findPriceForDate finds the price for a specific date or the closest previous date
// If no previous date is found, it will use the closest future date within 30 days
func (s *BacktestService) findPriceForDate(prices []HistoricalPrice, targetDate time.Time) float64 {
	if len(prices) == 0 {
		return 0
	}

	var closestPrice float64
	var closestDate time.Time
	var closestFuturePrice float64
	var closestFutureDate time.Time

	for _, price := range prices {
		// If exact match, return immediately
		if price.Date.Format("2006-01-02") == targetDate.Format("2006-01-02") {
			return price.Price
		}

		// Track closest previous or equal date
		if (price.Date.Before(targetDate) || price.Date.Equal(targetDate)) {
			if closestDate.IsZero() || price.Date.After(closestDate) {
				closestDate = price.Date
				closestPrice = price.Price
			}
		}

		// Track closest future date (within 30 days) as fallback
		if price.Date.After(targetDate) {
			daysDiff := price.Date.Sub(targetDate).Hours() / 24
			if daysDiff <= 30 {
				if closestFutureDate.IsZero() || price.Date.Before(closestFutureDate) {
					closestFutureDate = price.Date
					closestFuturePrice = price.Price
				}
			}
		}
	}

	// Return closest previous price if found
	if closestPrice > 0 {
		return closestPrice
	}

	// Otherwise return closest future price as fallback
	return closestFuturePrice
}

// calculateBacktestMetrics calculates performance metrics
func (s *BacktestService) calculateBacktestMetrics(
	dataPoints []BacktestDataPoint,
	startDate time.Time,
	endDate time.Time,
) (*BacktestMetrics, error) {
	if len(dataPoints) == 0 {
		return nil, fmt.Errorf("no data points provided")
	}

	if len(dataPoints) == 1 {
		return &BacktestMetrics{
			TotalReturn:        0,
			TotalReturnPercent: 0,
			AnnualizedReturn:   0,
			MaxDrawdown:        0,
			Volatility:         0,
			SharpeRatio:        0,
		}, nil
	}

	initialValue := dataPoints[0].PortfolioValue
	finalValue := dataPoints[len(dataPoints)-1].PortfolioValue

	// Calculate total return
	totalReturn := finalValue - initialValue
	totalReturnPercent := 0.0
	if initialValue > 0 {
		totalReturnPercent = (totalReturn / initialValue) * 100
	}

	// Calculate annualized return
	days := endDate.Sub(startDate).Hours() / 24
	annualizedReturn := 0.0
	if days > 0 && initialValue > 0 {
		annualizedReturn = (math.Pow(finalValue/initialValue, 365/days) - 1) * 100
	}

	// Calculate maximum drawdown
	maxDrawdown := s.calculateMaxDrawdownFromDataPoints(dataPoints)

	// Calculate volatility (annualized standard deviation of daily returns)
	volatility := s.calculateVolatility(dataPoints)

	// Calculate Sharpe ratio (using 2% risk-free rate)
	riskFreeRate := 2.0
	sharpeRatio := 0.0
	if volatility > 0 {
		sharpeRatio = (annualizedReturn - riskFreeRate) / volatility
	}

	return &BacktestMetrics{
		TotalReturn:        totalReturn,
		TotalReturnPercent: totalReturnPercent,
		AnnualizedReturn:   annualizedReturn,
		MaxDrawdown:        maxDrawdown,
		Volatility:         volatility,
		SharpeRatio:        sharpeRatio,
	}, nil
}

// calculateMaxDrawdownFromDataPoints calculates maximum drawdown from backtest data points
func (s *BacktestService) calculateMaxDrawdownFromDataPoints(dataPoints []BacktestDataPoint) float64 {
	if len(dataPoints) <= 1 {
		return 0
	}

	peak := dataPoints[0].PortfolioValue
	maxDrawdown := 0.0

	for _, point := range dataPoints {
		// Update peak if current value is higher
		if point.PortfolioValue > peak {
			peak = point.PortfolioValue
		}

		// Calculate current drawdown from peak
		if peak > 0 {
			drawdown := ((peak - point.PortfolioValue) / peak) * 100
			if drawdown > maxDrawdown {
				maxDrawdown = drawdown
			}
		}
	}

	return -maxDrawdown // Return as negative value
}

// calculateVolatility calculates annualized volatility (standard deviation of returns)
func (s *BacktestService) calculateVolatility(dataPoints []BacktestDataPoint) float64 {
	if len(dataPoints) <= 1 {
		return 0
	}

	// Calculate daily returns
	dailyReturns := make([]float64, 0, len(dataPoints)-1)
	for i := 1; i < len(dataPoints); i++ {
		prevValue := dataPoints[i-1].PortfolioValue
		currValue := dataPoints[i].PortfolioValue

		if prevValue > 0 {
			dailyReturn := (currValue - prevValue) / prevValue
			dailyReturns = append(dailyReturns, dailyReturn)
		}
	}

	if len(dailyReturns) == 0 {
		return 0
	}

	// Calculate mean of daily returns
	sum := 0.0
	for _, ret := range dailyReturns {
		sum += ret
	}
	mean := sum / float64(len(dailyReturns))

	// Calculate variance
	variance := 0.0
	for _, ret := range dailyReturns {
		diff := ret - mean
		variance += diff * diff
	}
	variance /= float64(len(dailyReturns))

	// Calculate standard deviation
	stdDev := math.Sqrt(variance)

	// Annualize volatility (assuming 252 trading days per year)
	annualizedVolatility := stdDev * math.Sqrt(252) * 100

	return annualizedVolatility
}

// calculateAssetContributions calculates each asset's contribution to portfolio return
func (s *BacktestService) calculateAssetContributions(
	weights map[string]float64,
	historicalPrices map[string][]HistoricalPrice,
	startDate time.Time,
	endDate time.Time,
	currency string,
	holdings []Holding,
) ([]AssetContribution, error) {
	contributions := make([]AssetContribution, 0, len(weights))

	// Calculate total current portfolio value (initial investment)
	totalCurrentValue := 0.0
	for _, holding := range holdings {
		totalCurrentValue += holding.CurrentValue
	}

	// For each asset, calculate its contribution
	for symbol, weight := range weights {
		prices, ok := historicalPrices[symbol]
		if !ok || len(prices) == 0 {
			continue
		}

		// Get asset name
		var assetName string
		for _, holding := range holdings {
			if holding.Symbol == symbol {
				assetName = holding.Name
				break
			}
		}

		// Find start and end prices
		startPrice := s.findPriceForDate(prices, startDate)
		endPrice := s.findPriceForDate(prices, endDate)

		if startPrice <= 0 || endPrice <= 0 {
			continue
		}

		// Calculate asset return percentage
		assetReturnPercent := ((endPrice - startPrice) / startPrice) * 100

		// Calculate initial investment for this asset
		initialInvestment := weight * totalCurrentValue

		// Handle currency conversion
		symbolCurrency := "USD"
		if s.stockService.IsChinaStock(symbol) {
			symbolCurrency = "CNY"
		}

		// Convert initial investment to asset's currency
		investmentInAssetCurrency := initialInvestment
		if symbolCurrency != currency {
			converted, err := s.currencyService.ConvertAmount(initialInvestment, currency, symbolCurrency)
			if err != nil {
				fmt.Printf("[Backtest] Warning: failed to convert currency for %s: %v\n", symbol, err)
				continue
			}
			investmentInAssetCurrency = converted
		}

		// Calculate shares and values
		shares := investmentInAssetCurrency / startPrice
		assetInitialValue := shares * startPrice
		assetFinalValue := shares * endPrice
		assetReturn := assetFinalValue - assetInitialValue

		// Convert return back to portfolio currency
		if symbolCurrency != currency {
			convertedReturn, err := s.currencyService.ConvertAmount(assetReturn, symbolCurrency, currency)
			if err != nil {
				fmt.Printf("[Backtest] Warning: failed to convert return currency for %s: %v\n", symbol, err)
			} else {
				assetReturn = convertedReturn
			}
		}

		// Calculate contribution to portfolio return
		// Contribution = (asset return / initial portfolio value) * 100
		contributionPercent := (assetReturn / totalCurrentValue) * 100

		contributions = append(contributions, AssetContribution{
			Symbol:              symbol,
			Name:                assetName,
			Weight:              weight * 100, // Convert to percentage
			Return:              assetReturn,
			ReturnPercent:       assetReturnPercent,
			Contribution:        assetReturn,
			ContributionPercent: contributionPercent,
		})
	}

	// Sort by contribution (descending)
	sort.Slice(contributions, func(i, j int) bool {
		return contributions[i].Contribution > contributions[j].Contribution
	})

	return contributions, nil
}

// getBenchmarkData fetches and processes benchmark data
func (s *BacktestService) getBenchmarkData(
	benchmark string,
	startDate time.Time,
	endDate time.Time,
) ([]BacktestDataPoint, error) {
	// Determine period string based on date range
	duration := endDate.Sub(startDate)
	var period string
	if duration <= 30*24*time.Hour {
		period = "1M"
	} else if duration <= 90*24*time.Hour {
		period = "3M"
	} else if duration <= 180*24*time.Hour {
		period = "6M"
	} else if duration <= 365*24*time.Hour {
		period = "1Y"
	} else {
		period = "ALL"
	}

	// Fetch historical data for benchmark
	prices, err := s.stockService.GetHistoricalData(benchmark, period)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch benchmark data: %w", err)
	}

	// Filter prices to the specified date range
	var filteredPrices []HistoricalPrice
	for _, price := range prices {
		if (price.Date.After(startDate) || price.Date.Equal(startDate)) &&
			(price.Date.Before(endDate) || price.Date.Equal(endDate)) {
			filteredPrices = append(filteredPrices, price)
		}
	}

	if len(filteredPrices) == 0 {
		return nil, fmt.Errorf("no benchmark data available for the specified period")
	}

	// Sort by date
	sort.Slice(filteredPrices, func(i, j int) bool {
		return filteredPrices[i].Date.Before(filteredPrices[j].Date)
	})

	// Calculate benchmark returns
	benchmarkData := make([]BacktestDataPoint, 0, len(filteredPrices))
	initialPrice := filteredPrices[0].Price

	for _, price := range filteredPrices {
		benchmarkReturn := 0.0
		if initialPrice > 0 {
			benchmarkReturn = ((price.Price - initialPrice) / initialPrice) * 100
		}

		benchmarkData = append(benchmarkData, BacktestDataPoint{
			Date:            price.Date,
			PortfolioValue:  price.Price,
			PortfolioReturn: benchmarkReturn,
		})
	}

	return benchmarkData, nil
}

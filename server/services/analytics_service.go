package services

import (
	"context"
	"fmt"
	"sort"
	"stock-portfolio-tracker/database"
	"stock-portfolio-tracker/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// DashboardMetrics represents portfolio dashboard metrics
type DashboardMetrics struct {
	TotalValue       float64          `json:"totalValue"`
	TotalGain        float64          `json:"totalGain"`
	PercentageReturn float64          `json:"percentageReturn"`
	Allocation       []AllocationItem `json:"allocation"`
	Currency         string           `json:"currency"`
}

// AllocationItem represents a single allocation entry
type AllocationItem struct {
	Symbol     string  `json:"symbol"`
	Value      float64 `json:"value"`
	Percentage float64 `json:"percentage"`
}

// PerformanceDataPoint represents a time series data point
type PerformanceDataPoint struct {
	Date  time.Time `json:"date"`
	Value float64   `json:"value"`
}

// AnalyticsService handles analytics and performance calculations
type AnalyticsService struct {
	portfolioService *PortfolioService
	currencyService  *CurrencyService
	stockService     *StockAPIService
}

// NewAnalyticsService creates a new AnalyticsService instance
func NewAnalyticsService(portfolioService *PortfolioService, currencyService *CurrencyService, stockService *StockAPIService) *AnalyticsService {
	return &AnalyticsService{
		portfolioService: portfolioService,
		currencyService:  currencyService,
		stockService:     stockService,
	}
}

// GetDashboardMetrics calculates and returns dashboard metrics for a user
func (s *AnalyticsService) GetDashboardMetrics(userID primitive.ObjectID, currency string) (*DashboardMetrics, error) {
	// Validate currency
	if currency != "USD" && currency != "RMB" && currency != "CNY" {
		return nil, fmt.Errorf("invalid currency: must be USD or RMB")
	}
	
	// Normalize CNY to RMB
	if currency == "CNY" {
		currency = "RMB"
	}
	
	// Fetch user holdings
	holdings, err := s.portfolioService.GetUserHoldings(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch holdings: %w", err)
	}
	
	// If no holdings, return zero metrics
	if len(holdings) == 0 {
		return &DashboardMetrics{
			TotalValue:       0,
			TotalGain:        0,
			PercentageReturn: 0,
			Allocation:       []AllocationItem{},
			Currency:         currency,
		}, nil
	}
	
	// Calculate total portfolio value and cost basis
	var totalValue float64
	var totalCostBasis float64
	allocation := make([]AllocationItem, 0, len(holdings))
	
	for _, holding := range holdings {
		// Convert holding value to requested currency if needed
		holdingValue := holding.CurrentValue
		holdingCostBasis := holding.CostBasis
		
		if holding.Currency != currency {
			// Convert current value
			convertedValue, err := s.currencyService.ConvertAmount(holdingValue, holding.Currency, currency)
			if err != nil {
				return nil, fmt.Errorf("failed to convert currency for %s: %w", holding.Symbol, err)
			}
			holdingValue = convertedValue
			
			// Convert cost basis
			convertedCostBasis, err := s.currencyService.ConvertAmount(holdingCostBasis, holding.Currency, currency)
			if err != nil {
				return nil, fmt.Errorf("failed to convert currency for %s: %w", holding.Symbol, err)
			}
			holdingCostBasis = convertedCostBasis
		}
		
		totalValue += holdingValue
		totalCostBasis += holdingCostBasis
		
		// Add to allocation
		allocation = append(allocation, AllocationItem{
			Symbol:     holding.Symbol,
			Value:      holdingValue,
			Percentage: 0, // Will calculate after we have total
		})
	}
	
	// Calculate percentages for allocation
	for i := range allocation {
		if totalValue > 0 {
			allocation[i].Percentage = (allocation[i].Value / totalValue) * 100
		}
	}
	
	// Calculate total gain/loss
	totalGain := totalValue - totalCostBasis
	
	// Calculate percentage return
	percentageReturn := 0.0
	if totalCostBasis > 0 {
		percentageReturn = (totalGain / totalCostBasis) * 100
	}
	
	return &DashboardMetrics{
		TotalValue:       totalValue,
		TotalGain:        totalGain,
		PercentageReturn: percentageReturn,
		Allocation:       allocation,
		Currency:         currency,
	}, nil
}

// GetHistoricalPerformance calculates historical portfolio performance
func (s *AnalyticsService) GetHistoricalPerformance(userID primitive.ObjectID, period string, currency string) ([]PerformanceDataPoint, error) {
	// Validate period
	validPeriods := map[string]bool{"1M": true, "3M": true, "6M": true, "1Y": true}
	if !validPeriods[period] {
		return nil, fmt.Errorf("invalid period: must be 1M, 3M, 6M, or 1Y")
	}
	
	// Validate currency
	if currency != "USD" && currency != "RMB" && currency != "CNY" {
		return nil, fmt.Errorf("invalid currency: must be USD or RMB")
	}
	
	// Normalize CNY to RMB
	if currency == "CNY" {
		currency = "RMB"
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
	
	// Fetch all user transactions
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	collection := database.Database.Collection("transactions")
	cursor, err := collection.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch transactions: %w", err)
	}
	defer cursor.Close(ctx)
	
	var allTransactions []models.Transaction
	if err := cursor.All(ctx, &allTransactions); err != nil {
		return nil, fmt.Errorf("failed to decode transactions: %w", err)
	}
	
	// If no transactions, return empty data
	if len(allTransactions) == 0 {
		return []PerformanceDataPoint{}, nil
	}
	
	// Sort transactions by date
	sort.Slice(allTransactions, func(i, j int) bool {
		return allTransactions[i].Date.Before(allTransactions[j].Date)
	})
	
	// Get unique symbols from all transactions
	symbolSet := make(map[string]bool)
	for _, tx := range allTransactions {
		symbolSet[tx.Symbol] = true
	}
	
	symbols := make([]string, 0, len(symbolSet))
	for symbol := range symbolSet {
		symbols = append(symbols, symbol)
	}
	
	// Fetch historical prices for all symbols
	historicalPrices := make(map[string][]HistoricalPrice)
	for _, symbol := range symbols {
		prices, err := s.stockService.GetHistoricalData(symbol, period)
		if err != nil {
			// Log error but continue with other symbols
			fmt.Printf("Warning: failed to fetch historical data for %s: %v\n", symbol, err)
			continue
		}
		historicalPrices[symbol] = prices
	}
	
	// If no historical data available, return empty
	if len(historicalPrices) == 0 {
		return []PerformanceDataPoint{}, nil
	}
	
	// Build a map of dates to calculate portfolio value for each day
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
		// Only include dates within the period
		if date.After(startTime) || date.Equal(startTime) {
			dates = append(dates, date)
		}
	}
	
	sort.Slice(dates, func(i, j int) bool {
		return dates[i].Before(dates[j])
	})
	
	// Calculate portfolio value for each date
	performanceData := make([]PerformanceDataPoint, 0, len(dates))
	
	for _, date := range dates {
		portfolioValue := 0.0
		
		// For each symbol, calculate shares held on this date
		for symbol, prices := range historicalPrices {
			// Calculate shares held on this date
			sharesHeld := 0.0
			
			for _, tx := range allTransactions {
				// Only consider transactions up to this date
				if tx.Symbol == symbol && (tx.Date.Before(date) || tx.Date.Equal(date)) {
					if tx.Action == "buy" {
						sharesHeld += tx.Shares
					} else if tx.Action == "sell" {
						sharesHeld -= tx.Shares
					}
				}
			}
			
			// If no shares held, skip
			if sharesHeld <= 0 {
				continue
			}
			
			// Find the price for this date (or closest previous date)
			price := s.findPriceForDate(prices, date)
			if price <= 0 {
				continue
			}
			
			// Get the currency for this symbol
			symbolCurrency := "USD"
			if s.stockService.IsChinaStock(symbol) {
				symbolCurrency = "CNY"
			}
			
			// Calculate value
			value := sharesHeld * price
			
			// Convert to requested currency if needed
			if symbolCurrency != currency {
				convertedValue, err := s.currencyService.ConvertAmount(value, symbolCurrency, currency)
				if err != nil {
					// Log error but use unconverted value
					fmt.Printf("Warning: failed to convert currency for %s on %s: %v\n", symbol, date.Format("2006-01-02"), err)
				} else {
					value = convertedValue
				}
			}
			
			portfolioValue += value
		}
		
		performanceData = append(performanceData, PerformanceDataPoint{
			Date:  date,
			Value: portfolioValue,
		})
	}
	
	return performanceData, nil
}

// findPriceForDate finds the price for a specific date or the closest previous date
func (s *AnalyticsService) findPriceForDate(prices []HistoricalPrice, targetDate time.Time) float64 {
	if len(prices) == 0 {
		return 0
	}
	
	// Find exact match or closest previous date
	var closestPrice float64
	var closestDate time.Time
	
	for _, price := range prices {
		// If exact match, return immediately
		if price.Date.Format("2006-01-02") == targetDate.Format("2006-01-02") {
			return price.Price
		}
		
		// If this price is before target date and closer than previous closest
		if price.Date.Before(targetDate) || price.Date.Equal(targetDate) {
			if closestDate.IsZero() || price.Date.After(closestDate) {
				closestDate = price.Date
				closestPrice = price.Price
			}
		}
	}
	
	return closestPrice
}

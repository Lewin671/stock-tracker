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
	TotalValue        float64          `json:"totalValue"`
	TotalGain         float64          `json:"totalGain"`
	PercentageReturn  float64          `json:"percentageReturn"`
	DayChange         float64          `json:"dayChange"`
	DayChangePercent  float64          `json:"dayChangePercent"`
	Allocation        []AllocationItem `json:"allocation"`
	Currency          string           `json:"currency"`
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

// GroupedHolding represents holdings grouped by a dimension
type GroupedHolding struct {
	GroupName   string    `json:"groupName"`
	GroupValue  float64   `json:"groupValue"`
	Percentage  float64   `json:"percentage"`
	Holdings    []Holding `json:"holdings"`
}

// GroupedDashboardMetrics represents dashboard metrics grouped by specified dimension
type GroupedDashboardMetrics struct {
	TotalValue        float64          `json:"totalValue"`
	TotalGain         float64          `json:"totalGain"`
	PercentageReturn  float64          `json:"percentageReturn"`
	DayChange         float64          `json:"dayChange"`
	DayChangePercent  float64          `json:"dayChangePercent"`
	Groups            []GroupedHolding `json:"groups"`
	Currency          string           `json:"currency"`
	GroupBy           string           `json:"groupBy"`
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
	fmt.Printf("[Analytics] GetDashboardMetrics called - UserID: %s, Currency: %s\n", userID.Hex(), currency)
	
	// Validate currency
	if currency != "USD" && currency != "RMB" && currency != "CNY" {
		return nil, fmt.Errorf("invalid currency: must be USD or RMB")
	}
	
	// Normalize CNY to RMB
	if currency == "CNY" {
		currency = "RMB"
	}
	
	// Fetch user holdings in the requested currency
	fmt.Printf("[Analytics] Fetching holdings for user %s in currency %s\n", userID.Hex(), currency)
	holdings, err := s.portfolioService.GetUserHoldings(userID, currency)
	if err != nil {
		fmt.Printf("[Analytics] ERROR: Failed to fetch holdings for user %s: %v\n", userID.Hex(), err)
		return nil, fmt.Errorf("failed to fetch holdings: %w", err)
	}
	fmt.Printf("[Analytics] Successfully fetched %d holdings for user %s\n", len(holdings), userID.Hex())
	
	// If no holdings, return zero metrics
	if len(holdings) == 0 {
		return &DashboardMetrics{
			TotalValue:        0,
			TotalGain:         0,
			PercentageReturn:  0,
			DayChange:         0,
			DayChangePercent:  0,
			Allocation:        []AllocationItem{},
			Currency:          currency,
		}, nil
	}
	
	// Calculate total portfolio value, cost basis, and day change
	// Holdings are already in the requested currency from GetUserHoldings
	var totalValue float64
	var totalCostBasis float64
	var dayChange float64
	allocation := make([]AllocationItem, 0, len(holdings))
	
	// Get previous day's closing prices for all symbols
	previousDayValue := 0.0
	for _, holding := range holdings {
		fmt.Printf("[Analytics] Processing holding: %s (%.2f shares, value: %.2f %s)\n", 
			holding.Symbol, holding.Shares, holding.CurrentValue, holding.Currency)
		
		totalValue += holding.CurrentValue
		totalCostBasis += holding.CostBasis
		
		// Calculate previous day value for this holding
		prevDayPrice, err := s.getPreviousDayPrice(holding.Symbol)
		if err != nil {
			fmt.Printf("[Analytics] Warning: Could not get previous day price for %s: %v\n", holding.Symbol, err)
			// If we can't get previous day price, assume no change for this holding
			previousDayValue += holding.CurrentValue
		} else {
			prevValue := holding.Shares * prevDayPrice
			
			// Convert to target currency if needed
			symbolCurrency := "USD"
			if s.stockService.IsChinaStock(holding.Symbol) {
				symbolCurrency = "CNY"
			}
			
			if symbolCurrency != currency {
				convertedPrevValue, err := s.currencyService.ConvertAmount(prevValue, symbolCurrency, currency)
				if err != nil {
					fmt.Printf("[Analytics] Warning: Could not convert currency for %s: %v\n", holding.Symbol, err)
					previousDayValue += holding.CurrentValue
				} else {
					previousDayValue += convertedPrevValue
				}
			} else {
				previousDayValue += prevValue
			}
		}
		
		// Add to allocation
		allocation = append(allocation, AllocationItem{
			Symbol:     holding.Symbol,
			Value:      holding.CurrentValue,
			Percentage: 0, // Will calculate after we have total
		})
	}
	
	// Calculate day change
	dayChange = totalValue - previousDayValue
	
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
	
	// Calculate day change percentage
	dayChangePercent := 0.0
	if previousDayValue > 0 {
		dayChangePercent = (dayChange / previousDayValue) * 100
	}
	
	fmt.Printf("[Analytics] Dashboard metrics calculated - TotalValue: %.2f, TotalGain: %.2f, Return: %.2f%%, DayChange: %.2f (%.2f%%)\n", 
		totalValue, totalGain, percentageReturn, dayChange, dayChangePercent)
	
	return &DashboardMetrics{
		TotalValue:        totalValue,
		TotalGain:         totalGain,
		PercentageReturn:  percentageReturn,
		DayChange:         dayChange,
		DayChangePercent:  dayChangePercent,
		Allocation:        allocation,
		Currency:          currency,
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

// GetGroupedDashboardMetrics returns dashboard metrics grouped by specified dimension
// Optimized version using efficient data fetching and in-memory grouping
func (s *AnalyticsService) GetGroupedDashboardMetrics(userID primitive.ObjectID, currency string, groupBy string) (*GroupedDashboardMetrics, error) {
	fmt.Printf("[Analytics] GetGroupedDashboardMetrics called - UserID: %s, Currency: %s, GroupBy: %s\n", userID.Hex(), currency, groupBy)

	// Validate currency
	if currency != "USD" && currency != "RMB" && currency != "CNY" {
		return nil, fmt.Errorf("invalid currency: must be USD or RMB")
	}

	// Normalize CNY to RMB
	if currency == "CNY" {
		currency = "RMB"
	}

	// Validate groupBy parameter
	validGroupBy := map[string]bool{
		"assetStyle": true,
		"assetClass": true,
		"currency":   true,
		"none":       true,
	}

	if !validGroupBy[groupBy] {
		return nil, fmt.Errorf("invalid groupBy parameter: must be assetStyle, assetClass, currency, or none")
	}

	// Fetch user holdings (already optimized with proper indexes)
	holdings, err := s.portfolioService.GetUserHoldings(userID, currency)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch holdings: %w", err)
	}

	// If no holdings, return empty metrics
	if len(holdings) == 0 {
		return &GroupedDashboardMetrics{
			TotalValue:        0,
			TotalGain:         0,
			PercentageReturn:  0,
			DayChange:         0,
			DayChangePercent:  0,
			Groups:            []GroupedHolding{},
			Currency:          currency,
			GroupBy:           groupBy,
		}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Fetch portfolios and asset styles in parallel for better performance
	type portfolioResult struct {
		portfolios []models.Portfolio
		err        error
	}
	type assetStyleResult struct {
		assetStyles []models.AssetStyle
		err         error
	}

	portfolioChan := make(chan portfolioResult, 1)
	assetStyleChan := make(chan assetStyleResult, 1)

	// Fetch portfolios in goroutine
	go func() {
		portfolioCollection := database.Database.Collection("portfolios")
		cursor, err := portfolioCollection.Find(ctx, bson.M{"user_id": userID})
		if err != nil {
			portfolioChan <- portfolioResult{err: err}
			return
		}
		defer cursor.Close(ctx)

		var portfolios []models.Portfolio
		if err := cursor.All(ctx, &portfolios); err != nil {
			portfolioChan <- portfolioResult{err: err}
			return
		}
		portfolioChan <- portfolioResult{portfolios: portfolios}
	}()

	// Fetch asset styles in goroutine
	go func() {
		assetStyleCollection := database.Database.Collection("asset_styles")
		cursor, err := assetStyleCollection.Find(ctx, bson.M{"user_id": userID})
		if err != nil {
			assetStyleChan <- assetStyleResult{err: err}
			return
		}
		defer cursor.Close(ctx)

		var assetStyles []models.AssetStyle
		if err := cursor.All(ctx, &assetStyles); err != nil {
			assetStyleChan <- assetStyleResult{err: err}
			return
		}
		assetStyleChan <- assetStyleResult{assetStyles: assetStyles}
	}()

	// Wait for both results
	portfolioRes := <-portfolioChan
	assetStyleRes := <-assetStyleChan

	if portfolioRes.err != nil {
		return nil, fmt.Errorf("failed to fetch portfolios: %w", portfolioRes.err)
	}
	if assetStyleRes.err != nil {
		return nil, fmt.Errorf("failed to fetch asset styles: %w", assetStyleRes.err)
	}

	// Create lookup maps with pre-allocated capacity
	portfolioMap := make(map[string]*models.Portfolio, len(portfolioRes.portfolios))
	for i := range portfolioRes.portfolios {
		portfolioMap[portfolioRes.portfolios[i].Symbol] = &portfolioRes.portfolios[i]
	}

	assetStyleMap := make(map[primitive.ObjectID]string, len(assetStyleRes.assetStyles))
	for _, style := range assetStyleRes.assetStyles {
		assetStyleMap[style.ID] = style.Name
	}

	// Group holdings based on groupBy parameter
	var groups map[string][]Holding

	switch groupBy {
	case "assetStyle":
		groups = s.groupByAssetStyle(holdings, portfolioMap, assetStyleMap)
	case "assetClass":
		groups = s.groupByAssetClass(holdings, portfolioMap)
	case "currency":
		groups = s.groupByCurrency(holdings, portfolioMap)
	case "none":
		// No grouping, return all holdings in a single group
		groups = map[string][]Holding{"All Holdings": holdings}
	}

	// Calculate totals and group metrics in a single pass
	var totalValue float64
	var totalCostBasis float64
	var previousDayValue float64
	groupedHoldings := make([]GroupedHolding, 0, len(groups))

	for groupName, groupHoldings := range groups {
		var groupValue float64
		for _, holding := range groupHoldings {
			groupValue += holding.CurrentValue
			totalValue += holding.CurrentValue
			totalCostBasis += holding.CostBasis
			
			// Calculate previous day value for this holding
			prevDayPrice, err := s.getPreviousDayPrice(holding.Symbol)
			if err != nil {
				fmt.Printf("[Analytics] Warning: Could not get previous day price for %s: %v\n", holding.Symbol, err)
				previousDayValue += holding.CurrentValue
			} else {
				prevValue := holding.Shares * prevDayPrice
				
				// Convert to target currency if needed
				symbolCurrency := "USD"
				if s.stockService.IsChinaStock(holding.Symbol) {
					symbolCurrency = "CNY"
				}
				
				if symbolCurrency != currency {
					convertedPrevValue, err := s.currencyService.ConvertAmount(prevValue, symbolCurrency, currency)
					if err != nil {
						fmt.Printf("[Analytics] Warning: Could not convert currency for %s: %v\n", holding.Symbol, err)
						previousDayValue += holding.CurrentValue
					} else {
						previousDayValue += convertedPrevValue
					}
				} else {
					previousDayValue += prevValue
				}
			}
		}

		groupedHoldings = append(groupedHoldings, GroupedHolding{
			GroupName:  groupName,
			GroupValue: groupValue,
			Percentage: 0, // Will calculate after we have totalValue
			Holdings:   groupHoldings,
		})
	}

	// Calculate percentages in a second pass
	for i := range groupedHoldings {
		if totalValue > 0 {
			groupedHoldings[i].Percentage = (groupedHoldings[i].GroupValue / totalValue) * 100
		}
	}

	// Sort groups by value (descending)
	sort.Slice(groupedHoldings, func(i, j int) bool {
		return groupedHoldings[i].GroupValue > groupedHoldings[j].GroupValue
	})

	// Calculate total gain and percentage return
	totalGain := totalValue - totalCostBasis
	percentageReturn := 0.0
	if totalCostBasis > 0 {
		percentageReturn = (totalGain / totalCostBasis) * 100
	}
	
	// Calculate day change
	dayChange := totalValue - previousDayValue
	dayChangePercent := 0.0
	if previousDayValue > 0 {
		dayChangePercent = (dayChange / previousDayValue) * 100
	}

	return &GroupedDashboardMetrics{
		TotalValue:        totalValue,
		TotalGain:         totalGain,
		PercentageReturn:  percentageReturn,
		DayChange:         dayChange,
		DayChangePercent:  dayChangePercent,
		Groups:            groupedHoldings,
		Currency:          currency,
		GroupBy:           groupBy,
	}, nil
}

// groupByAssetStyle groups holdings by asset style
func (s *AnalyticsService) groupByAssetStyle(holdings []Holding, portfolioMap map[string]*models.Portfolio, assetStyleMap map[primitive.ObjectID]string) map[string][]Holding {
	groups := make(map[string][]Holding)

	for _, holding := range holdings {
		portfolio, exists := portfolioMap[holding.Symbol]
		if !exists || portfolio.AssetStyleID == nil {
			// No portfolio or no asset style, use "Uncategorized"
			groups["Uncategorized"] = append(groups["Uncategorized"], holding)
			continue
		}

		styleName, exists := assetStyleMap[*portfolio.AssetStyleID]
		if !exists {
			styleName = "Unknown"
		}

		groups[styleName] = append(groups[styleName], holding)
	}

	return groups
}

// groupByAssetClass groups holdings by asset class
func (s *AnalyticsService) groupByAssetClass(holdings []Holding, portfolioMap map[string]*models.Portfolio) map[string][]Holding {
	groups := make(map[string][]Holding)

	for _, holding := range holdings {
		portfolio, exists := portfolioMap[holding.Symbol]
		if !exists || portfolio.AssetClass == "" {
			// No portfolio or no asset class, use "Uncategorized"
			groups["Uncategorized"] = append(groups["Uncategorized"], holding)
			continue
		}

		groups[portfolio.AssetClass] = append(groups[portfolio.AssetClass], holding)
	}

	return groups
}

// groupByCurrency groups holdings by currency
func (s *AnalyticsService) groupByCurrency(holdings []Holding, portfolioMap map[string]*models.Portfolio) map[string][]Holding {
	groups := make(map[string][]Holding)

	for _, holding := range holdings {
		// Use the holding's currency (which is already converted to target currency)
		// We need to determine the original currency from the portfolio
		portfolio, exists := portfolioMap[holding.Symbol]
		if !exists {
			groups["Unknown"] = append(groups["Unknown"], holding)
			continue
		}

		// Determine currency based on symbol (US stocks vs China stocks)
		currency := "USD"
		if s.stockService.IsChinaStock(portfolio.Symbol) {
			currency = "RMB"
		}

		groups[currency] = append(groups[currency], holding)
	}

	return groups
}

// getPreviousDayPrice fetches the previous trading day's closing price for a symbol
func (s *AnalyticsService) getPreviousDayPrice(symbol string) (float64, error) {
	// Fetch 5 days of historical data to ensure we get at least 2 data points
	// (accounting for weekends and holidays)
	historicalData, err := s.stockService.GetHistoricalData(symbol, "1M")
	if err != nil {
		return 0, fmt.Errorf("failed to fetch historical data: %w", err)
	}
	
	if len(historicalData) < 2 {
		return 0, fmt.Errorf("insufficient historical data")
	}
	
	// Sort by date descending to get most recent prices
	sort.Slice(historicalData, func(i, j int) bool {
		return historicalData[i].Date.After(historicalData[j].Date)
	})
	
	// The second most recent price is the previous day's close
	// (most recent is today's price, which might be intraday)
	return historicalData[1].Price, nil
}

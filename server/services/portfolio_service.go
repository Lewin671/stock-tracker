package services

import (
	"context"
	"errors"
	"fmt"
	"stock-portfolio-tracker/database"
	"stock-portfolio-tracker/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	ErrInsufficientShares = errors.New("insufficient shares for sell transaction")
	ErrUnauthorized       = errors.New("unauthorized to modify this transaction")
	ErrTransactionNotFound = errors.New("transaction not found")
	ErrInvalidTransaction = errors.New("invalid transaction data")
	ErrFutureDate         = errors.New("transaction date cannot be in the future")
)

// Holding represents a calculated portfolio holding
type Holding struct {
	Symbol          string  `json:"symbol"`
	Shares          float64 `json:"shares"`
	CostBasis       float64 `json:"costBasis"`
	CurrentPrice    float64 `json:"currentPrice"`
	CurrentValue    float64 `json:"currentValue"`
	GainLoss        float64 `json:"gainLoss"`
	GainLossPercent float64 `json:"gainLossPercent"`
	Currency        string  `json:"currency"`
}

// PortfolioService handles portfolio and transaction operations
type PortfolioService struct {
	stockService *StockAPIService
}

// NewPortfolioService creates a new PortfolioService instance
func NewPortfolioService(stockService *StockAPIService) *PortfolioService {
	return &PortfolioService{
		stockService: stockService,
	}
}

// AddTransaction adds a new transaction to the user's portfolio
func (s *PortfolioService) AddTransaction(userID primitive.ObjectID, tx *models.Transaction) error {
	// Validate transaction data
	if err := s.validateTransaction(tx); err != nil {
		return err
	}

	// For sell transactions, check if user has sufficient shares
	if tx.Action == "sell" {
		if err := s.validateSellTransaction(userID, tx); err != nil {
			return err
		}
	}

	// Get or create portfolio for this symbol
	portfolioID, err := s.getOrCreatePortfolio(userID, tx.Symbol)
	if err != nil {
		return fmt.Errorf("failed to get or create portfolio: %w", err)
	}

	// Set transaction fields
	tx.ID = primitive.NewObjectID()
	tx.PortfolioID = portfolioID
	tx.UserID = userID
	tx.CreatedAt = time.Now()
	tx.UpdatedAt = time.Now()

	// Insert transaction into database
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("transactions")
	_, err = collection.InsertOne(ctx, tx)
	if err != nil {
		return fmt.Errorf("failed to insert transaction: %w", err)
	}

	return nil
}

// UpdateTransaction updates an existing transaction
func (s *PortfolioService) UpdateTransaction(userID primitive.ObjectID, txID primitive.ObjectID, updatedTx *models.Transaction) error {
	// Validate transaction data
	if err := s.validateTransaction(updatedTx); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("transactions")

	// First, check if transaction exists and belongs to user
	var existingTx models.Transaction
	err := collection.FindOne(ctx, bson.M{
		"_id":     txID,
		"user_id": userID,
	}).Decode(&existingTx)

	if err == mongo.ErrNoDocuments {
		return ErrTransactionNotFound
	}
	if err != nil {
		return fmt.Errorf("failed to find transaction: %w", err)
	}

	// For sell transactions, validate sufficient shares
	// We need to check shares excluding the current transaction being updated
	if updatedTx.Action == "sell" {
		if err := s.validateSellTransactionExcluding(userID, updatedTx, txID); err != nil {
			return err
		}
	}

	// Update transaction fields
	updatedTx.UpdatedAt = time.Now()
	updatedTx.CreatedAt = existingTx.CreatedAt
	updatedTx.ID = txID
	updatedTx.UserID = userID
	updatedTx.PortfolioID = existingTx.PortfolioID

	// Replace the transaction
	_, err = collection.ReplaceOne(ctx, bson.M{
		"_id":     txID,
		"user_id": userID,
	}, updatedTx)

	if err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	return nil
}

// DeleteTransaction deletes a transaction
func (s *PortfolioService) DeleteTransaction(userID primitive.ObjectID, txID primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("transactions")

	// Delete only if transaction belongs to user
	result, err := collection.DeleteOne(ctx, bson.M{
		"_id":     txID,
		"user_id": userID,
	})

	if err != nil {
		return fmt.Errorf("failed to delete transaction: %w", err)
	}

	if result.DeletedCount == 0 {
		return ErrTransactionNotFound
	}

	return nil
}

// validateTransaction validates transaction data
func (s *PortfolioService) validateTransaction(tx *models.Transaction) error {
	// Check date is not in the future
	if tx.Date.After(time.Now()) {
		return ErrFutureDate
	}

	// Check shares is positive
	if tx.Shares <= 0 {
		return fmt.Errorf("%w: shares must be greater than zero", ErrInvalidTransaction)
	}

	// Check price is positive
	if tx.Price <= 0 {
		return fmt.Errorf("%w: price must be greater than zero", ErrInvalidTransaction)
	}

	// Check fees is non-negative
	if tx.Fees < 0 {
		return fmt.Errorf("%w: fees cannot be negative", ErrInvalidTransaction)
	}

	// Check action is valid
	if tx.Action != "buy" && tx.Action != "sell" {
		return fmt.Errorf("%w: action must be 'buy' or 'sell'", ErrInvalidTransaction)
	}

	// Check currency is valid
	if tx.Currency != "USD" && tx.Currency != "RMB" {
		return fmt.Errorf("%w: currency must be 'USD' or 'RMB'", ErrInvalidTransaction)
	}

	return nil
}

// validateSellTransaction checks if user has sufficient shares for a sell transaction
func (s *PortfolioService) validateSellTransaction(userID primitive.ObjectID, tx *models.Transaction) error {
	return s.validateSellTransactionExcluding(userID, tx, primitive.NilObjectID)
}

// validateSellTransactionExcluding checks if user has sufficient shares, excluding a specific transaction
func (s *PortfolioService) validateSellTransactionExcluding(userID primitive.ObjectID, tx *models.Transaction, excludeTxID primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("transactions")

	// Build filter to exclude the transaction being updated
	filter := bson.M{
		"user_id": userID,
		"symbol":  tx.Symbol,
	}
	if !excludeTxID.IsZero() {
		filter["_id"] = bson.M{"$ne": excludeTxID}
	}

	// Get all transactions for this symbol
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to fetch transactions: %w", err)
	}
	defer cursor.Close(ctx)

	var transactions []models.Transaction
	if err := cursor.All(ctx, &transactions); err != nil {
		return fmt.Errorf("failed to decode transactions: %w", err)
	}

	// Calculate total shares
	totalShares := 0.0
	for _, t := range transactions {
		if t.Action == "buy" {
			totalShares += t.Shares
		} else if t.Action == "sell" {
			totalShares -= t.Shares
		}
	}

	// Check if sell would result in negative shares
	if totalShares < tx.Shares {
		return ErrInsufficientShares
	}

	return nil
}

// getOrCreatePortfolio gets an existing portfolio or creates a new one for the symbol
func (s *PortfolioService) getOrCreatePortfolio(userID primitive.ObjectID, symbol string) (primitive.ObjectID, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("portfolios")

	// Try to find existing portfolio
	var portfolio models.Portfolio
	err := collection.FindOne(ctx, bson.M{
		"user_id": userID,
		"symbol":  symbol,
	}).Decode(&portfolio)

	if err == nil {
		// Portfolio exists
		return portfolio.ID, nil
	}

	if err != mongo.ErrNoDocuments {
		return primitive.NilObjectID, fmt.Errorf("failed to query portfolio: %w", err)
	}

	// Create new portfolio
	portfolio = models.Portfolio{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Symbol:    symbol,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err = collection.InsertOne(ctx, portfolio)
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("failed to create portfolio: %w", err)
	}

	return portfolio.ID, nil
}

// GetUserHoldings calculates and returns all holdings for a user
func (s *PortfolioService) GetUserHoldings(userID primitive.ObjectID) ([]Holding, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := database.Database.Collection("transactions")

	// Get all transactions for the user
	cursor, err := collection.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch transactions: %w", err)
	}
	defer cursor.Close(ctx)

	var transactions []models.Transaction
	if err := cursor.All(ctx, &transactions); err != nil {
		return nil, fmt.Errorf("failed to decode transactions: %w", err)
	}

	// Group transactions by symbol
	symbolTransactions := make(map[string][]models.Transaction)
	for _, tx := range transactions {
		symbolTransactions[tx.Symbol] = append(symbolTransactions[tx.Symbol], tx)
	}

	// Calculate holdings for each symbol
	holdings := make([]Holding, 0)
	for symbol, txs := range symbolTransactions {
		holding, err := s.calculateHolding(symbol, txs)
		if err != nil {
			// Log error but continue with other holdings
			fmt.Printf("Error calculating holding for %s: %v\n", symbol, err)
			continue
		}

		// Filter out holdings with zero shares
		if holding.Shares > 0 {
			holdings = append(holdings, *holding)
		}
	}

	return holdings, nil
}

// GetTransactionsBySymbol returns all transactions for a specific symbol
func (s *PortfolioService) GetTransactionsBySymbol(userID primitive.ObjectID, symbol string) ([]models.Transaction, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collection := database.Database.Collection("transactions")

	cursor, err := collection.Find(ctx, bson.M{
		"user_id": userID,
		"symbol":  symbol,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch transactions: %w", err)
	}
	defer cursor.Close(ctx)

	var transactions []models.Transaction
	if err := cursor.All(ctx, &transactions); err != nil {
		return nil, fmt.Errorf("failed to decode transactions: %w", err)
	}

	return transactions, nil
}

// calculateHolding calculates holding details for a symbol based on its transactions
func (s *PortfolioService) calculateHolding(symbol string, transactions []models.Transaction) (*Holding, error) {
	if len(transactions) == 0 {
		return nil, fmt.Errorf("no transactions for symbol")
	}

	var totalShares float64
	var totalCost float64
	var currency string

	// Calculate total shares and cost basis
	for _, tx := range transactions {
		if tx.Action == "buy" {
			totalShares += tx.Shares
			// Cost basis includes price * shares + fees
			totalCost += (tx.Price * tx.Shares) + tx.Fees
		} else if tx.Action == "sell" {
			// When selling, reduce shares and proportionally reduce cost basis
			if totalShares > 0 {
				// Calculate cost basis per share before the sell
				costPerShare := totalCost / totalShares
				// Reduce cost basis by the cost of shares sold
				totalCost -= costPerShare * tx.Shares
				// Reduce total shares
				totalShares -= tx.Shares
			}
		}

		// Use currency from first transaction (all should be same currency per symbol)
		if currency == "" {
			currency = tx.Currency
		}
	}

	// If no shares remaining, return zero holding
	if totalShares <= 0 {
		return &Holding{
			Symbol:          symbol,
			Shares:          0,
			CostBasis:       0,
			CurrentPrice:    0,
			CurrentValue:    0,
			GainLoss:        0,
			GainLossPercent: 0,
			Currency:        currency,
		}, nil
	}

	// Fetch current price from stock service
	stockInfo, err := s.stockService.GetStockInfo(symbol)
	if err != nil {
		fmt.Printf("Error fetching stock info for symbol %s: %v\n", symbol, err)
		return nil, fmt.Errorf("failed to fetch stock info for %s: %w", symbol, err)
	}

	currentPrice := stockInfo.CurrentPrice
	currentValue := currentPrice * totalShares
	gainLoss := currentValue - totalCost
	gainLossPercent := 0.0
	if totalCost > 0 {
		gainLossPercent = (gainLoss / totalCost) * 100
	}

	return &Holding{
		Symbol:          symbol,
		Shares:          totalShares,
		CostBasis:       totalCost,
		CurrentPrice:    currentPrice,
		CurrentValue:    currentValue,
		GainLoss:        gainLoss,
		GainLossPercent: gainLossPercent,
		Currency:        stockInfo.Currency,
	}, nil
}

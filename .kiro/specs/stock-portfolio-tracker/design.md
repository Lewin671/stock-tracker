# Design Document

## Overview

The Stock Portfolio Tracker is a full-stack web application built with a React.js frontend and Go/Gin backend, using MongoDB for data persistence. The system follows a microservices-inspired architecture with clear separation of concerns across authentication, stock data integration, portfolio management, analytics, and currency conversion services.

The application supports tracking investments in both US and Chinese stock markets with real-time data integration, multi-currency display, and comprehensive performance analytics with visualizations.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login/  │  │Dashboard │  │ Holdings │  │  Search  │   │
│  │ Register │  │   Page   │  │   Page   │  │   Page   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│         │              │              │              │       │
│         └──────────────┴──────────────┴──────────────┘       │
│                          │ (Axios HTTP)                      │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                          ▼                                    │
│                 Backend API (Go/Gin)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Middleware Layer                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │   CORS   │  │   JWT    │  │   Rate   │          │   │
│  │  │          │  │   Auth   │  │  Limiter │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                    │
│  ┌──────────────────────┼────────────────────────────────┐  │
│  │              Service Layer                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │   Auth   │  │  Stock   │  │Portfolio │          │  │
│  │  │ Service  │  │   API    │  │ Service  │          │  │
│  │  └──────────┘  │ Service  │  └──────────┘          │  │
│  │                └──────────┘                          │  │
│  │  ┌──────────┐  ┌──────────┐                        │  │
│  │  │Analytics │  │ Currency │                        │  │
│  │  │ Service  │  │ Service  │                        │  │
│  │  └──────────┘  └──────────┘                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                    │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                          ▼                                    │
│                  Data Layer (MongoDB)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Users   │  │Portfolio │  │Transaction│                  │
│  │Collection│  │Collection│  │Collection │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└───────────────────────────────────────────────────────────────┘

External APIs:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Yahoo Finance │  │   Tushare    │  │ExchangeRate  │
│     API      │  │     API      │  │     API      │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Technology Stack

**Frontend:**
- React.js 18.x
- Axios for HTTP requests
- Chart.js with react-chartjs-2 for visualizations
- Tailwind CSS for utility-first styling
- Radix UI for accessible component primitives
- Lucide React for icons
- React Router for navigation
- Context API for state management

**Backend:**
- Go 1.21+
- Gin web framework
- GORM for MongoDB ORM
- JWT for authentication (github.com/golang-jwt/jwt/v5)
- godotenv for environment variables
- gin-contrib/cors for CORS handling

**Database:**
- MongoDB Atlas (cloud-hosted)
- GORM MongoDB driver

**External APIs:**
- Yahoo Finance (via go-yahoo-finance or HTTP client)
- Tushare API (HTTP client)
- ExchangeRate-API (HTTP client)

## Components and Interfaces

### Frontend Components

#### 1. Authentication Components

**LoginPage Component**
```typescript
interface LoginPageProps {}
interface LoginFormData {
  email: string;
  password: string;
}
// Handles user login, JWT token storage in localStorage
```

**RegisterPage Component**
```typescript
interface RegisterPageProps {}
interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}
// Handles user registration
```

#### 2. Dashboard Components

**DashboardPage Component**
```typescript
interface DashboardPageProps {}
interface DashboardData {
  totalValue: number;
  totalGain: number;
  percentageReturn: number;
  allocation: AllocationItem[];
  currency: 'USD' | 'RMB';
}
interface AllocationItem {
  symbol: string;
  value: number;
  percentage: number;
}
// Main dashboard with portfolio overview
```

**PortfolioSummaryCard Component**
```typescript
interface PortfolioSummaryCardProps {
  totalValue: number;
  totalGain: number;
  percentageReturn: number;
  currency: string;
}
// Displays key portfolio metrics
```

**AllocationPieChart Component**
```typescript
interface AllocationPieChartProps {
  data: AllocationItem[];
}
// Renders pie chart using Chart.js
```

**HistoricalPerformanceChart Component**
```typescript
interface HistoricalPerformanceChartProps {
  period: '1M' | '3M' | '6M' | '1Y';
  onPeriodChange: (period: string) => void;
}
interface HistoricalDataPoint {
  date: string;
  value: number;
}
// Renders line chart with period selector
```

#### 3. Holdings Components

**HoldingsPage Component**
```typescript
interface HoldingsPageProps {}
interface Holding {
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
}
// Displays holdings table and transaction management
```

**HoldingsTable Component**
```typescript
interface HoldingsTableProps {
  holdings: Holding[];
  currency: string;
  onViewTransactions: (symbol: string) => void;
}
// Custom table with Tailwind styling displaying all holdings
```

**TransactionDialog Component**
```typescript
interface TransactionDialogProps {
  open: boolean;
  onClose: () => void;
  symbol?: string;
  transaction?: Transaction;
}
interface TransactionFormData {
  symbol: string;
  action: 'buy' | 'sell';
  shares: number;
  price: number;
  date: string;
  currency: 'USD' | 'RMB';
  fees?: number;
}
// Modal using Radix UI Dialog for adding/editing transactions
```

#### 4. Search Components

**SearchPage Component**
```typescript
interface SearchPageProps {}
interface StockSearchResult {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  sector?: string;
}
// Stock search and addition interface
```

#### 5. Shared Components

**CurrencyToggle Component**
```typescript
interface CurrencyToggleProps {
  currency: 'USD' | 'RMB';
  onChange: (currency: 'USD' | 'RMB') => void;
}
// Toggle using Radix UI Toggle Group for currency selection
```

**LoadingSpinner Component**
```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}
// Reusable loading indicator with Lucide Loader2 icon
```

**ErrorAlert Component**
```typescript
interface ErrorAlertProps {
  message: string;
  onClose: () => void;
}
// Error message display using Radix UI Alert Dialog
```

### Backend Components

#### 1. Models (GORM)

**User Model**
```go
type User struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Email     string             `bson:"email" json:"email" binding:"required,email"`
    Password  string             `bson:"password" json:"-"`
    CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
    UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}
```

**Portfolio Model**
```go
type Portfolio struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    UserID    primitive.ObjectID `bson:"user_id" json:"userId"`
    Symbol    string             `bson:"symbol" json:"symbol"`
    CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
    UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}
```

**Transaction Model**
```go
type Transaction struct {
    ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    PortfolioID primitive.ObjectID `bson:"portfolio_id" json:"portfolioId"`
    UserID     primitive.ObjectID `bson:"user_id" json:"userId"`
    Symbol     string             `bson:"symbol" json:"symbol"`
    Action     string             `bson:"action" json:"action"` // "buy" or "sell"
    Shares     float64            `bson:"shares" json:"shares"`
    Price      float64            `bson:"price" json:"price"`
    Currency   string             `bson:"currency" json:"currency"` // "USD" or "RMB"
    Fees       float64            `bson:"fees" json:"fees"`
    Date       time.Time          `bson:"date" json:"date"`
    CreatedAt  time.Time          `bson:"created_at" json:"createdAt"`
    UpdatedAt  time.Time          `bson:"updated_at" json:"updatedAt"`
}
```

#### 2. Service Interfaces

**AuthService Interface**
```go
type AuthService interface {
    Register(email, password string) (*User, error)
    Login(email, password string) (string, error) // returns JWT token
    ValidateToken(tokenString string) (*User, error)
    HashPassword(password string) (string, error)
    ComparePassword(hashedPassword, password string) error
}
```

**StockAPIService Interface**
```go
type StockAPIService interface {
    GetStockInfo(symbol string) (*StockInfo, error)
    GetHistoricalData(symbol string, period string) ([]HistoricalPrice, error)
    IsUSStock(symbol string) bool
    IsChinaStock(symbol string) bool
}

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
```

**PortfolioService Interface**
```go
type PortfolioService interface {
    AddTransaction(userID primitive.ObjectID, tx *Transaction) error
    UpdateTransaction(userID primitive.ObjectID, txID primitive.ObjectID, tx *Transaction) error
    DeleteTransaction(userID primitive.ObjectID, txID primitive.ObjectID) error
    GetUserHoldings(userID primitive.ObjectID) ([]Holding, error)
    GetTransactionsBySymbol(userID primitive.ObjectID, symbol string) ([]Transaction, error)
}

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
```

**AnalyticsService Interface**
```go
type AnalyticsService interface {
    GetDashboardMetrics(userID primitive.ObjectID, currency string) (*DashboardMetrics, error)
    GetHistoricalPerformance(userID primitive.ObjectID, period string, currency string) ([]PerformanceDataPoint, error)
}

type DashboardMetrics struct {
    TotalValue       float64          `json:"totalValue"`
    TotalGain        float64          `json:"totalGain"`
    PercentageReturn float64          `json:"percentageReturn"`
    Allocation       []AllocationItem `json:"allocation"`
    Currency         string           `json:"currency"`
}

type AllocationItem struct {
    Symbol     string  `json:"symbol"`
    Value      float64 `json:"value"`
    Percentage float64 `json:"percentage"`
}

type PerformanceDataPoint struct {
    Date  time.Time `json:"date"`
    Value float64   `json:"value"`
}
```

**CurrencyService Interface**
```go
type CurrencyService interface {
    GetExchangeRate(from, to string) (float64, error)
    ConvertAmount(amount float64, from, to string) (float64, error)
}
```

#### 3. API Routes

**Authentication Routes**
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login user
GET    /api/auth/me          - Get current user (protected)
```

**Stock Routes**
```
GET    /api/stocks/search/:symbol     - Search stock by symbol
GET    /api/stocks/:symbol/info       - Get stock information
GET    /api/stocks/:symbol/history    - Get historical data (query: period)
```

**Portfolio Routes (Protected)**
```
GET    /api/portfolio/holdings        - Get user holdings
POST   /api/portfolio/transactions    - Add transaction
PUT    /api/portfolio/transactions/:id - Update transaction
DELETE /api/portfolio/transactions/:id - Delete transaction
GET    /api/portfolio/transactions/:symbol - Get transactions by symbol
```

**Analytics Routes (Protected)**
```
GET    /api/analytics/dashboard       - Get dashboard metrics (query: currency)
GET    /api/analytics/performance     - Get historical performance (query: period, currency)
```

**Currency Routes**
```
GET    /api/currency/rate             - Get exchange rate (query: from, to)
```

## Data Models

### MongoDB Collections

#### Users Collection
```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "password": "$2a$10$hashedpassword...",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

**Indexes:**
- `email`: unique index for fast lookup and uniqueness constraint

#### Portfolios Collection
```json
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "symbol": "AAPL",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

**Indexes:**
- `user_id`: index for user portfolio queries
- `user_id + symbol`: compound unique index

#### Transactions Collection
```json
{
  "_id": ObjectId,
  "portfolio_id": ObjectId,
  "user_id": ObjectId,
  "symbol": "AAPL",
  "action": "buy",
  "shares": 10.0,
  "price": 150.50,
  "currency": "USD",
  "fees": 5.00,
  "date": ISODate,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

**Indexes:**
- `user_id`: index for user transaction queries
- `portfolio_id`: index for portfolio transaction queries
- `user_id + symbol`: compound index for symbol-specific queries
- `date`: index for time-based queries

### Cache Data Structures

**Stock Data Cache (In-Memory)**
```go
type CachedStockData struct {
    Data      *StockInfo
    ExpiresAt time.Time
}

// Map: symbol -> CachedStockData
var stockCache = make(map[string]*CachedStockData)
```

**Exchange Rate Cache (In-Memory)**
```go
type CachedExchangeRate struct {
    Rate      float64
    ExpiresAt time.Time
}

// Map: "FROM_TO" -> CachedExchangeRate
var rateCache = make(map[string]*CachedExchangeRate)
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

```go
const (
    ErrCodeValidation      = "VALIDATION_ERROR"
    ErrCodeUnauthorized    = "UNAUTHORIZED"
    ErrCodeNotFound        = "NOT_FOUND"
    ErrCodeConflict        = "CONFLICT"
    ErrCodeInternalServer  = "INTERNAL_SERVER_ERROR"
    ErrCodeExternalAPI     = "EXTERNAL_API_ERROR"
    ErrCodeInsufficientShares = "INSUFFICIENT_SHARES"
)
```

### Error Handling Strategy

**Backend:**
1. Service layer returns typed errors
2. Handler layer catches errors and maps to HTTP status codes
3. Middleware logs all errors with context
4. External API failures are wrapped with context
5. Database errors are logged but return generic messages to client

**Frontend:**
1. Axios interceptor catches all HTTP errors
2. Display user-friendly messages based on error codes
3. Show loading states during requests
4. Retry logic for transient failures (optional)
5. Form validation before submission

## Testing Strategy

### Backend Testing

**Unit Tests**
- Test each service method independently
- Mock external dependencies (database, APIs)
- Use table-driven tests for multiple scenarios
- Test error conditions and edge cases
- Target: 80%+ code coverage

**Integration Tests**
- Test API endpoints with test database
- Verify middleware behavior
- Test authentication flow end-to-end
- Test database operations with real MongoDB instance

**Test Structure**
```
server/
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── auth_service_test.go
│   │   │   ├── portfolio_service_test.go
│   │   │   └── analytics_service_test.go
│   │   └── utils/
│   └── integration/
│       ├── auth_test.go
│       ├── portfolio_test.go
│       └── analytics_test.go
```

### Frontend Testing

**Component Tests**
- Test component rendering
- Test user interactions
- Mock API calls with MSW or similar
- Test form validation
- Test error states

**Integration Tests**
- Test page flows
- Test navigation
- Test authentication flow
- Test data fetching and display

**Test Structure**
```
web/
├── src/
│   ├── components/
│   │   ├── __tests__/
│   │   │   ├── LoginPage.test.tsx
│   │   │   ├── Dashboard.test.tsx
│   │   │   └── HoldingsTable.test.tsx
```

### Testing Tools

**Backend:**
- Go testing package
- testify for assertions
- mockery for mocks
- httptest for HTTP testing

**Frontend:**
- Jest for test runner
- React Testing Library
- MSW for API mocking

## Security Considerations

### Authentication & Authorization

1. **Password Security**
   - Bcrypt hashing with cost factor 10
   - Minimum password length: 8 characters
   - No password in responses

2. **JWT Tokens**
   - HS256 algorithm
   - 24-hour expiration
   - Stored in localStorage (frontend)
   - Validated on every protected route

3. **Authorization**
   - Middleware validates JWT on protected routes
   - User ID extracted from token
   - All queries filtered by user ID

### Input Validation

1. **Backend Validation**
   - Gin binding tags for struct validation
   - Custom validators for business rules
   - Sanitize all string inputs
   - Validate date ranges

2. **Frontend Validation**
   - Form validation before submission
   - Email format validation
   - Number range validation
   - Date validation

### API Security

1. **CORS**
   - Whitelist frontend origin only
   - Credentials allowed for JWT

2. **Rate Limiting**
   - 100 requests per minute per IP
   - Separate limits for auth endpoints (10/min)

3. **Environment Variables**
   - All secrets in .env file
   - Never commit .env to repository
   - Use .env.example for documentation

### Data Protection

1. **Database Security**
   - MongoDB Atlas with authentication
   - Connection string in environment variable
   - Network access restricted to application IPs

2. **API Keys**
   - External API keys in environment variables
   - Rotate keys periodically
   - Monitor API usage

## Deployment Architecture

### Frontend Deployment (Vercel)

```
GitHub Repository
       ↓
   Vercel Build
       ↓
   Static Assets (CDN)
       ↓
   User Browser
```

**Configuration:**
- Build command: `npm run build`
- Output directory: `build`
- Environment variables: `REACT_APP_API_URL`
- Automatic deployments on push to main

### Backend Deployment (Render/Fly.io)

```
GitHub Repository
       ↓
   Render/Fly.io Build
       ↓
   Docker Container
       ↓
   Running Service
```

**Configuration:**
- Build: `go build -o main .`
- Start command: `./main`
- Environment variables: All API keys, DB connection, JWT secret
- Health check endpoint: `/health`

### Database (MongoDB Atlas)

- Free tier M0 cluster
- Cloud provider: AWS/GCP/Azure
- Region: Closest to backend deployment
- Backup: Automatic daily backups
- Monitoring: Atlas monitoring dashboard

## Performance Optimization

### Backend Optimizations

1. **Caching**
   - Stock data cached for 5 minutes
   - Exchange rates cached for 1 hour
   - In-memory cache with expiration

2. **Database Queries**
   - Proper indexes on frequently queried fields
   - Aggregation pipelines for complex queries
   - Limit result sets

3. **API Calls**
   - Batch requests where possible
   - Implement retry logic with exponential backoff
   - Circuit breaker for failing external APIs

### Frontend Optimizations

1. **Code Splitting**
   - Lazy load routes
   - Dynamic imports for heavy components

2. **Data Fetching**
   - Cache API responses
   - Debounce search inputs
   - Pagination for large datasets

3. **Rendering**
   - Memoize expensive computations
   - Virtual scrolling for large tables
   - Optimize chart re-renders

4. **Styling**
   - Tailwind CSS JIT mode for minimal bundle size
   - PurgeCSS to remove unused styles in production
   - Radix UI for accessible, unstyled primitives with custom Tailwind styling

## Development Workflow

### Local Development Setup

1. **Prerequisites**
   - Go 1.21+
   - Node.js 18+
   - MongoDB (local or Atlas)

2. **Backend Setup**
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your credentials
   go mod download
   go run main.go
   ```

3. **Frontend Setup**
   ```bash
   cd web
   cp .env.example .env
   # Edit .env with API URL
   npm install
   npm start
   ```

### Environment Variables

**Backend (.env)**
```
PORT=8080
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
YAHOO_FINANCE_API_KEY=optional
TUSHARE_TOKEN=your-tushare-token
EXCHANGE_RATE_API_KEY=your-api-key
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:8080
```

### Git Workflow

1. Feature branches from `main`
2. Pull request for review
3. Automated tests run on PR
4. Merge to `main` triggers deployment

## Monitoring and Logging

### Backend Logging

- Structured logging with log levels
- Request/response logging middleware
- Error logging with stack traces
- External API call logging

### Frontend Logging

- Console errors in development
- Error tracking service (optional: Sentry)
- Analytics (optional: Google Analytics)

### Monitoring

- Health check endpoint
- Database connection monitoring
- External API availability monitoring
- Response time tracking

# Implementation Plan

- [x] 1. Initialize project structure and dependencies
  - Create backend Go project with proper directory structure (models, services, handlers, middleware, routes)
  - Initialize go.mod with required dependencies (gin, gorm, mongo-driver, jwt, godotenv, cors)
  - Create frontend React project with TypeScript support
  - Install frontend dependencies (axios, chart.js, react-chartjs-2, tailwindcss, radix-ui, lucide-react, react-router-dom)
  - Configure Tailwind CSS with JIT mode and content paths
  - Set up .env.example files for both backend and frontend
  - _Requirements: 10, 11_

- [x] 2. Set up database connection and models
  - [x] 2.1 Implement MongoDB connection with GORM
    - Write database connection utility with connection string from environment variable
    - Implement connection pooling and error handling
    - Create health check function for database connectivity
    - _Requirements: 11_
  
  - [x] 2.2 Define GORM models for User, Portfolio, and Transaction
    - Create User model with email, password, timestamps, and BSON tags
    - Create Portfolio model with user_id, symbol, timestamps
    - Create Transaction model with all required fields (portfolio_id, user_id, symbol, action, shares, price, currency, fees, date)
    - Add JSON tags for API responses and validation tags
    - _Requirements: 1, 4_
  
  - [x] 2.3 Create database indexes
    - Add unique index on User.email
    - Add index on Portfolio.user_id
    - Add compound unique index on Portfolio (user_id + symbol)
    - Add indexes on Transaction (user_id, portfolio_id, user_id + symbol, date)
    - _Requirements: 4, 5_

- [x] 3. Implement authentication service and middleware
  - [x] 3.1 Create AuthService with password hashing and JWT generation
    - Implement password hashing using bcrypt with cost factor 10
    - Implement JWT token generation with 24-hour expiration using HS256 algorithm
    - Implement JWT token validation and user extraction
    - Create Register method that checks for existing email and creates user
    - Create Login method that validates credentials and returns JWT token
    - _Requirements: 1, 10_
  
  - [x] 3.2 Create JWT authentication middleware
    - Write middleware to extract JWT from Authorization header
    - Validate token and extract user ID
    - Attach user ID to Gin context for downstream handlers
    - Return 401 error for invalid or missing tokens
    - _Requirements: 1, 10_
  
  - [x] 3.3 Implement auth handlers and routes
    - Create POST /api/auth/register handler with input validation
    - Create POST /api/auth/login handler with credential validation
    - Create GET /api/auth/me handler to return current user info (protected)
    - Wire up routes in main router
    - _Requirements: 1_

- [x] 4. Implement stock API service with caching
  - [x] 4.1 Create stock symbol detection utilities
    - Write function to detect US stock symbols (no suffix or common US patterns)
    - Write function to detect Chinese stock symbols (.SS for Shanghai, .SZ for Shenzhen)
    - _Requirements: 2, 3_
  
  - [x] 4.2 Implement Yahoo Finance integration for US stocks
    - Create HTTP client for Yahoo Finance API
    - Implement GetStockInfo method to fetch current price, name, sector for US stocks
    - Implement GetHistoricalData method to fetch up to 1 year of daily prices
    - Handle API errors and return appropriate error messages
    - _Requirements: 2_
  
  - [x] 4.3 Implement Tushare integration for Chinese stocks
    - Create HTTP client for Tushare API with token authentication
    - Implement GetStockInfo method to fetch current price and name for Chinese stocks
    - Implement GetHistoricalData method to fetch up to 1 year of daily prices
    - Convert Tushare response format to internal StockInfo structure
    - Handle API errors and invalid token scenarios
    - _Requirements: 3_
  
  - [x] 4.4 Add in-memory caching for stock data
    - Create cache structure with expiration timestamps
    - Implement cache lookup before making external API calls
    - Cache stock info for 5 minutes
    - Implement cache cleanup for expired entries
    - _Requirements: 2, 3_
  
  - [x] 4.5 Create stock API handlers and routes
    - Create GET /api/stocks/search/:symbol handler
    - Create GET /api/stocks/:symbol/info handler
    - Create GET /api/stocks/:symbol/history handler with period query parameter
    - Add input validation for symbol format and period values
    - _Requirements: 2, 3, 9_

- [x] 5. Implement portfolio service and transaction management
  - [x] 5.1 Create PortfolioService with transaction operations
    - Implement AddTransaction method with validation (date not in future, shares > 0)
    - Implement validation for sell transactions (check sufficient shares exist)
    - Implement UpdateTransaction method with authorization check (user owns transaction)
    - Implement DeleteTransaction method with authorization check
    - Create or update Portfolio record when adding first transaction for a symbol
    - _Requirements: 4_
  
  - [x] 5.2 Implement holdings calculation logic
    - Create GetUserHoldings method that aggregates transactions by symbol
    - Calculate total shares per symbol (sum of buy shares minus sell shares)
    - Calculate cost basis including fees (weighted average for buys)
    - Fetch current prices from StockAPIService for all symbols
    - Calculate current value, gain/loss, and gain/loss percentage
    - Filter out holdings with zero shares
    - _Requirements: 5_
  
  - [x] 5.3 Create portfolio handlers and routes
    - Create GET /api/portfolio/holdings handler (protected)
    - Create POST /api/portfolio/transactions handler with input validation (protected)
    - Create PUT /api/portfolio/transactions/:id handler (protected)
    - Create DELETE /api/portfolio/transactions/:id handler (protected)
    - Create GET /api/portfolio/transactions/:symbol handler (protected)
    - _Requirements: 4, 5_

- [x] 6. Implement currency conversion service
  - [x] 6.1 Create CurrencyService with ExchangeRate-API integration
    - Create HTTP client for ExchangeRate-API with API key
    - Implement GetExchangeRate method to fetch USD/CNY rate
    - Implement ConvertAmount method for currency conversion
    - Handle API failures gracefully
    - _Requirements: 8_
  
  - [x] 6.2 Add caching for exchange rates
    - Create cache structure for exchange rates with 1-hour expiration
    - Implement cache lookup before API calls
    - Use last cached rate if API fails
    - Log warnings when using stale rates
    - _Requirements: 8_
  
  - [x] 6.3 Create currency API route
    - Create GET /api/currency/rate handler with from/to query parameters
    - Add input validation for currency codes
    - _Requirements: 8_

- [x] 7. Implement analytics service for dashboard and performance
  - [x] 7.1 Create AnalyticsService with dashboard metrics
    - Implement GetDashboardMetrics method that fetches user holdings
    - Calculate total portfolio value by summing all holding values
    - Calculate total gain/loss (current value - cost basis)
    - Calculate percentage return ((gain/loss) / cost basis * 100)
    - Generate allocation data (symbol, value, percentage of total)
    - Apply currency conversion if requested currency differs from holding currency
    - _Requirements: 6, 8_
  
  - [x] 7.2 Implement historical performance calculation
    - Create GetHistoricalPerformance method with period parameter (1M, 3M, 6M, 1Y)
    - Fetch all user transactions within the period
    - Fetch historical prices for all symbols in portfolio
    - Calculate portfolio value for each day by multiplying shares held by historical price
    - Handle transactions that occurred during the period (adjust shares held)
    - Return time series data points (date, value)
    - Apply currency conversion if requested
    - _Requirements: 7, 8_
  
  - [x] 7.3 Create analytics handlers and routes
    - Create GET /api/analytics/dashboard handler with currency query parameter (protected)
    - Create GET /api/analytics/performance handler with period and currency query parameters (protected)
    - Add input validation for period and currency values
    - _Requirements: 6, 7, 8_

- [x] 8. Set up middleware and server configuration
  - [x] 8.1 Configure CORS middleware
    - Set up gin-contrib/cors with frontend origin from environment variable
    - Allow credentials for JWT authentication
    - Configure allowed methods and headers
    - _Requirements: 10_
  
  - [x] 8.2 Implement rate limiting middleware
    - Create rate limiter with 100 requests per minute per IP
    - Create stricter rate limiter for auth endpoints (10 requests per minute)
    - Return 429 Too Many Requests when limit exceeded
    - _Requirements: 10_
  
  - [x] 8.3 Create input validation and sanitization middleware
    - Add middleware to sanitize string inputs
    - Validate request body size limits
    - Log all incoming requests with timestamp and user info
    - _Requirements: 10, 11_
  
  - [x] 8.4 Set up main server and health check
    - Create main.go with server initialization
    - Load environment variables using godotenv
    - Initialize database connection
    - Set up all routes with middleware
    - Create GET /health endpoint for deployment health checks
    - Start server on port from environment variable
    - _Requirements: 11_

- [x] 9. Build frontend authentication pages and context
  - [x] 9.1 Create authentication context and API client
    - Set up Axios instance with base URL from environment variable
    - Create AuthContext with login, register, logout methods
    - Implement JWT token storage in localStorage
    - Add Axios interceptor to attach JWT token to requests
    - Add Axios interceptor for error handling
    - _Requirements: 1, 11_
  
  - [x] 9.2 Create LoginPage component
    - Build login form with email and password inputs using Tailwind styling
    - Add form validation (email format, required fields)
    - Implement login submission with API call
    - Display loading state during authentication
    - Show error messages using Radix UI Alert Dialog
    - Redirect to dashboard on successful login
    - _Requirements: 1, 11, 12_
  
  - [x] 9.3 Create RegisterPage component
    - Build registration form with email, password, confirm password inputs
    - Add form validation (email format, password length, passwords match)
    - Implement registration submission with API call
    - Display loading state and error messages
    - Redirect to login page on successful registration
    - _Requirements: 1, 11, 12_
  
  - [x] 9.4 Set up protected route wrapper
    - Create ProtectedRoute component that checks for JWT token
    - Redirect to login if not authenticated
    - Fetch current user info on mount
    - _Requirements: 1_

- [x] 10. Build dashboard page with portfolio overview
  - [x] 10.1 Create DashboardPage component structure
    - Set up page layout with Tailwind grid system
    - Create currency toggle using Radix UI Toggle Group
    - Implement currency state management
    - Fetch dashboard metrics from API on mount and currency change
    - Display loading state with Lucide Loader2 icon
    - _Requirements: 6, 8, 11, 12_
  
  - [x] 10.2 Create PortfolioSummaryCard component
    - Display total portfolio value with currency symbol
    - Display total gain/loss with color coding (green for positive, red for negative)
    - Display percentage return
    - Style with Tailwind cards and typography
    - Use Lucide icons for visual indicators (TrendingUp, TrendingDown)
    - _Requirements: 6, 12_
  
  - [x] 10.3 Create AllocationPieChart component
    - Integrate Chart.js with react-chartjs-2
    - Configure pie chart with allocation data
    - Add custom colors for different holdings
    - Display legend with symbol names
    - Make chart responsive
    - _Requirements: 6, 12_
  
  - [x] 10.4 Create HistoricalPerformanceChart component
    - Create period selector buttons (1M, 3M, 6M, 1Y) with Tailwind styling
    - Fetch historical performance data based on selected period
    - Integrate Chart.js line chart with time series data
    - Configure chart with proper date formatting on x-axis
    - Add tooltips showing date and value
    - Make chart responsive
    - _Requirements: 7, 12_

- [x] 11. Build holdings page with transaction management
  - [x] 11.1 Create HoldingsPage component structure
    - Set up page layout with currency toggle
    - Fetch holdings data from API
    - Implement currency state management
    - Display loading and error states
    - _Requirements: 5, 8, 11, 12_
  
  - [x] 11.2 Create HoldingsTable component
    - Build responsive table with Tailwind styling
    - Display columns: Symbol, Shares, Cost Basis, Current Price, Current Value, Gain/Loss, Gain/Loss %
    - Add color coding for gain/loss values
    - Add "View Transactions" button for each holding using Lucide Eye icon
    - Make table responsive (stack on mobile)
    - _Requirements: 5, 12_
  
  - [x] 11.3 Create TransactionDialog component
    - Build modal using Radix UI Dialog
    - Create form with fields: symbol, action (buy/sell), shares, price, date, currency, fees
    - Add form validation (required fields, positive numbers, date not in future)
    - Implement add/edit transaction submission
    - Display loading state during submission
    - Close dialog and refresh holdings on success
    - Use Lucide icons for form inputs
    - _Requirements: 4, 11, 12_
  
  - [x] 11.4 Create TransactionsList component
    - Build list view of transactions for a specific symbol
    - Display transaction details (date, action, shares, price, fees)
    - Add edit and delete buttons with Lucide icons (Edit, Trash)
    - Implement delete confirmation using Radix UI Alert Dialog
    - Refresh holdings after delete
    - _Requirements: 4, 11, 12_
  
  - [x] 11.5 Wire up transaction management flow
    - Add "Add Transaction" button to HoldingsPage
    - Connect "View Transactions" button to show TransactionsList
    - Connect edit button to open TransactionDialog with pre-filled data
    - Connect delete button to delete transaction with confirmation
    - _Requirements: 4_

- [x] 12. Build stock search page
  - [x] 12.1 Create SearchPage component
    - Create search input with Lucide Search icon
    - Implement debounced search (300ms delay)
    - Display loading state during search
    - Show search results with stock info (symbol, name, current price)
    - Display error message for invalid symbols
    - Style with Tailwind cards and forms
    - _Requirements: 9, 11, 12_
  
  - [x] 12.2 Add stock addition flow
    - Add "Add to Portfolio" button for each search result
    - Open TransactionDialog with symbol pre-filled
    - Navigate to holdings page after adding transaction
    - _Requirements: 9_

- [x] 13. Create shared UI components
  - [x] 13.1 Create LoadingSpinner component
    - Use Lucide Loader2 icon with rotation animation
    - Support size variants (small, medium, large)
    - Style with Tailwind
    - _Requirements: 11, 12_
  
  - [x] 13.2 Create ErrorAlert component
    - Use Radix UI Alert Dialog for error display
    - Accept error message and onClose callback
    - Style with Tailwind (red theme for errors)
    - Add Lucide AlertCircle icon
    - _Requirements: 11, 12_
  
  - [x] 13.3 Create CurrencyToggle component
    - Use Radix UI Toggle Group
    - Display USD and RMB options
    - Style with Tailwind (active state highlighting)
    - _Requirements: 8, 12_

- [x] 14. Set up routing and navigation
  - [x] 14.1 Configure React Router
    - Set up BrowserRouter in App.js
    - Define routes for login, register, dashboard, holdings, search
    - Wrap protected routes with ProtectedRoute component
    - _Requirements: 12_
  
  - [x] 14.2 Create navigation component
    - Build navigation bar with Tailwind styling
    - Add links to dashboard, holdings, search pages
    - Add logout button
    - Make navigation responsive (hamburger menu on mobile using Radix UI)
    - Use Lucide icons for navigation items
    - _Requirements: 12_

- [x] 15. Create setup and deployment documentation
  - [x] 15.1 Write README.md with setup instructions
    - Document prerequisites (Go, Node.js, MongoDB)
    - Provide local development setup steps for backend
    - Provide local development setup steps for frontend
    - List all environment variables with descriptions
    - Include API endpoints documentation
    - Add troubleshooting section
    - _Requirements: All_
  
  - [x] 15.2 Create deployment guide
    - Document Vercel deployment steps for frontend
    - Document Render/Fly.io deployment steps for backend
    - Document MongoDB Atlas setup instructions
    - Provide environment variable configuration for production
    - Include health check endpoint information
    - _Requirements: All_
  
  - [x] 15.3 Create .env.example files
    - Create backend .env.example with all required variables
    - Create frontend .env.example with API URL
    - Add comments explaining each variable
    - _Requirements: 10_

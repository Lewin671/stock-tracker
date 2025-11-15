# Stock Portfolio Tracker

A full-stack web application for tracking stock investments across US and Chinese markets with real-time data integration, multi-currency support, and comprehensive performance analytics.

## Tech Stack

### Backend
- **Go 1.21+** with Gin web framework
- **MongoDB** for data persistence
- **JWT** for authentication
- External APIs: Yahoo Finance, ExchangeRate-API

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Chart.js** for data visualization
- **Axios** for API communication

## Project Structure

```
.
├── server/              # Go backend
│   ├── handlers/        # HTTP request handlers
│   ├── middleware/      # Gin middleware (auth, CORS, rate limiting)
│   ├── models/          # Database models
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic services
│   ├── main.go          # Application entry point
│   ├── go.mod           # Go dependencies
│   └── .env.example     # Environment variables template
│
├── web/                 # React frontend
│   ├── public/          # Static assets
│   ├── src/             # React components and logic
│   ├── package.json     # Node dependencies
│   ├── tailwind.config.js  # Tailwind configuration
│   └── .env.example     # Environment variables template
│
└── .kiro/specs/         # Feature specifications
    └── stock-portfolio-tracker/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Go 1.21 or higher** - [Download Go](https://golang.org/dl/)
- **Node.js 18 or higher** - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **MongoDB** - Choose one:
  - Local installation: [MongoDB Community Edition](https://www.mongodb.com/try/download/community)
  - Cloud: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- **Git** - [Download Git](https://git-scm.com/downloads)

### API Keys (Optional)

The application works out-of-the-box with fallback rates and free APIs. However, for production use, you may want to obtain API keys:

1. **ExchangeRate-API Key** (Optional - fallback rates used if not configured)
   - Register at [ExchangeRate-API](https://www.exchangerate-api.com/)
   - Free tier: 1,500 requests/month
   - Get your API key from the dashboard
   - **Without API key**: The app uses approximate fallback exchange rates (USD ↔ RMB: ~7.2)

2. **Yahoo Finance API Key** (Optional)
   - The application works without this using the free Yahoo Finance Chart API
   - Yahoo Finance provides stock data for all markets (US and Chinese stocks)
   - For production use with higher rate limits, consider [RapidAPI Yahoo Finance](https://rapidapi.com/apidojo/api/yahoo-finance1)

### Backend Setup

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd stock-portfolio-tracker
   ```

2. **Navigate to the server directory**:
   ```bash
   cd server
   ```

3. **Copy the environment variables template**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` and add your configuration**:
   ```env
   PORT=8080
   MONGODB_URI=mongodb://localhost:27017/stock_portfolio
   # For MongoDB Atlas, use: mongodb+srv://username:password@cluster.mongodb.net/stock_portfolio
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   EXCHANGE_RATE_API_KEY=your_exchangerate_api_key_here
   YAHOO_FINANCE_API_KEY=optional_yahoo_finance_key
   CORS_ORIGIN=http://localhost:3000
   ```

   **Important**: 
   - Generate a strong JWT_SECRET (at least 32 characters)
   - For local MongoDB, ensure MongoDB is running before starting the server
   - For MongoDB Atlas, whitelist your IP address in the Atlas dashboard

5. **Install Go dependencies**:
   ```bash
   go mod download
   ```

6. **Run the server**:
   ```bash
   go run main.go
   ```

   You should see output like:
   ```
   Connected to MongoDB successfully
   Server starting on port 8080
   ```

The backend will be available at `http://localhost:8080`

**Verify backend is running**:
```bash
curl http://localhost:8080/health
```

Expected response: `{"status":"ok"}`

### Frontend Setup

1. **Navigate to the web directory** (from project root):
   ```bash
   cd web
   ```

2. **Copy the environment variables template**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and set the API URL**:
   ```env
   REACT_APP_API_URL=http://localhost:8080
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

   Or if you prefer yarn:
   ```bash
   yarn install
   ```

5. **Start the development server**:
   ```bash
   npm start
   ```

   Or with yarn:
   ```bash
   yarn start
   ```

The frontend will automatically open in your browser at `http://localhost:3000`

### Quick Start (Both Services)

From the project root, you can run both services in separate terminals:

**Terminal 1 - Backend**:
```bash
cd server && go run main.go
```

**Terminal 2 - Frontend**:
```bash
cd web && npm start
```

## Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port number | No (default: 8080) |
| MONGODB_URI | MongoDB connection string | Yes |
| JWT_SECRET | Secret key for JWT token generation | Yes |
| EXCHANGE_RATE_API_KEY | ExchangeRate-API key | Yes |
| YAHOO_FINANCE_API_KEY | Yahoo Finance API key (for all markets) | No |
| CORS_ORIGIN | Allowed frontend origin | Yes |

### Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| REACT_APP_API_URL | Backend API base URL | Yes |

## API Endpoints

### Authentication

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 201 Created
{
  "id": "user_id",
  "email": "user@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com"
  }
}
```

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer <jwt_token>

Response: 200 OK
{
  "id": "user_id",
  "email": "user@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Stock Data

#### Search Stock
```
GET /api/stocks/search/:symbol

Example: GET /api/stocks/search/AAPL

Response: 200 OK
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "currentPrice": 150.50,
  "currency": "USD",
  "sector": "Technology"
}
```

#### Get Stock Info
```
GET /api/stocks/:symbol/info

Example: GET /api/stocks/600000.SS/info

Response: 200 OK
{
  "symbol": "600000.SS",
  "name": "浦发银行",
  "currentPrice": 8.50,
  "currency": "RMB"
}
```

#### Get Historical Data
```
GET /api/stocks/:symbol/history?period=1M

Query Parameters:
- period: 1M, 3M, 6M, 1Y (default: 1M)

Response: 200 OK
{
  "symbol": "AAPL",
  "data": [
    {
      "date": "2024-01-01T00:00:00Z",
      "price": 150.50
    }
  ]
}
```

### Portfolio (Protected - Requires JWT)

#### Get Holdings
```
GET /api/portfolio/holdings
Authorization: Bearer <jwt_token>

Response: 200 OK
[
  {
    "symbol": "AAPL",
    "shares": 10.0,
    "costBasis": 1500.00,
    "currentPrice": 150.50,
    "currentValue": 1505.00,
    "gainLoss": 5.00,
    "gainLossPercent": 0.33,
    "currency": "USD"
  }
]
```

#### Add Transaction
```
POST /api/portfolio/transactions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "symbol": "AAPL",
  "action": "buy",
  "shares": 10.0,
  "price": 150.50,
  "date": "2024-01-01T00:00:00Z",
  "currency": "USD",
  "fees": 5.00
}

Response: 201 Created
{
  "id": "transaction_id",
  "symbol": "AAPL",
  "action": "buy",
  "shares": 10.0,
  "price": 150.50,
  "currency": "USD",
  "fees": 5.00,
  "date": "2024-01-01T00:00:00Z"
}
```

#### Update Transaction
```
PUT /api/portfolio/transactions/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "shares": 15.0,
  "price": 148.00
}

Response: 200 OK
```

#### Delete Transaction
```
DELETE /api/portfolio/transactions/:id
Authorization: Bearer <jwt_token>

Response: 204 No Content
```

#### Get Transactions by Symbol
```
GET /api/portfolio/transactions/:symbol
Authorization: Bearer <jwt_token>

Example: GET /api/portfolio/transactions/AAPL

Response: 200 OK
[
  {
    "id": "transaction_id",
    "symbol": "AAPL",
    "action": "buy",
    "shares": 10.0,
    "price": 150.50,
    "date": "2024-01-01T00:00:00Z"
  }
]
```

### Analytics (Protected - Requires JWT)

#### Get Dashboard Metrics
```
GET /api/analytics/dashboard?currency=USD
Authorization: Bearer <jwt_token>

Query Parameters:
- currency: USD or RMB (default: USD)

Response: 200 OK
{
  "totalValue": 10000.00,
  "totalGain": 500.00,
  "percentageReturn": 5.00,
  "currency": "USD",
  "allocation": [
    {
      "symbol": "AAPL",
      "value": 5000.00,
      "percentage": 50.00
    }
  ]
}
```

#### Get Historical Performance
```
GET /api/analytics/performance?period=1M&currency=USD
Authorization: Bearer <jwt_token>

Query Parameters:
- period: 1M, 3M, 6M, 1Y (default: 1M)
- currency: USD or RMB (default: USD)

Response: 200 OK
[
  {
    "date": "2024-01-01T00:00:00Z",
    "value": 10000.00
  }
]
```

### Currency

#### Get Exchange Rate
```
GET /api/currency/rate?from=USD&to=RMB

Query Parameters:
- from: Currency code (USD, RMB)
- to: Currency code (USD, RMB)

Response: 200 OK
{
  "from": "USD",
  "to": "RMB",
  "rate": 7.25
}
```

### Health Check

#### Server Health
```
GET /health

Response: 200 OK
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Development

### Backend Development

The backend follows a clean architecture with separation of concerns:
- **Models**: Database schema definitions
- **Services**: Business logic and external API integrations
- **Handlers**: HTTP request/response handling
- **Middleware**: Cross-cutting concerns (auth, CORS, rate limiting)
- **Routes**: API endpoint definitions

### Frontend Development

The frontend uses React with TypeScript and follows component-based architecture:
- Tailwind CSS for utility-first styling
- Radix UI for accessible, unstyled component primitives
- Context API for state management
- Axios for API communication
- Chart.js for data visualization

## Troubleshooting

### Backend Issues

#### MongoDB Connection Failed
**Problem**: `Error connecting to MongoDB` or `connection refused`

**Solutions**:
- **Local MongoDB**: Ensure MongoDB is running
  ```bash
  # macOS (with Homebrew)
  brew services start mongodb-community
  
  # Linux
  sudo systemctl start mongod
  
  # Windows
  net start MongoDB
  ```
- **MongoDB Atlas**: 
  - Check your connection string format
  - Whitelist your IP address in Atlas Network Access
  - Verify username/password are correct
  - Ensure database name is included in connection string

#### Port Already in Use
**Problem**: `bind: address already in use`

**Solutions**:
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>

# Or change PORT in .env file
PORT=8081
```

#### JWT Token Invalid
**Problem**: `401 Unauthorized` on protected routes

**Solutions**:
- Ensure JWT_SECRET is set in backend .env
- Check token is being sent in Authorization header: `Bearer <token>`
- Token may have expired (24-hour expiration) - login again
- Clear localStorage and login again

#### External API Errors
**Problem**: `503 Service Unavailable` when fetching stock data

**Solutions**:
- **Yahoo Finance**: The free Chart API may have rate limits or temporary outages
- **ExchangeRate-API**: Check EXCHANGE_RATE_API_KEY is valid
- **Rate Limits**: You may have exceeded free tier limits
- **Network**: Check internet connection and firewall settings
- **Cache**: Stock data is cached for 5 minutes, wait and retry

#### CORS Errors
**Problem**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solutions**:
- Verify CORS_ORIGIN in backend .env matches frontend URL exactly
- Restart backend after changing CORS_ORIGIN
- Check frontend is running on the specified origin

### Frontend Issues

#### Cannot Connect to Backend
**Problem**: `Network Error` or `ERR_CONNECTION_REFUSED`

**Solutions**:
- Verify backend is running on the correct port
- Check REACT_APP_API_URL in .env matches backend URL
- Restart frontend after changing .env variables
- Check for typos in API URL (http vs https, trailing slash)

#### White Screen / Build Errors
**Problem**: Blank page or compilation errors

**Solutions**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf build
npm start
```

#### Environment Variables Not Loading
**Problem**: `undefined` when accessing `process.env.REACT_APP_*`

**Solutions**:
- Ensure variable names start with `REACT_APP_`
- Restart development server after changing .env
- Check .env file is in the `web/` directory
- Verify no spaces around `=` in .env file

#### Chart Not Rendering
**Problem**: Charts show empty or error

**Solutions**:
- Check browser console for errors
- Verify Chart.js and react-chartjs-2 are installed
- Ensure data format matches Chart.js requirements
- Check if data is being fetched successfully from API

### Database Issues

#### Database Not Found
**Problem**: Collections not created or data not persisting

**Solutions**:
- GORM auto-creates collections on first use
- Verify MONGODB_URI includes database name
- Check MongoDB logs for errors
- Ensure sufficient disk space

#### Slow Queries
**Problem**: API responses are slow

**Solutions**:
- Indexes are created automatically (see `database/indexes.go`)
- Check MongoDB Atlas performance metrics
- Consider upgrading MongoDB Atlas tier
- Review query patterns in services

### Common Development Issues

#### Go Module Issues
**Problem**: `cannot find package` or module errors

**Solutions**:
```bash
# Clean module cache
go clean -modcache

# Re-download dependencies
go mod download

# Tidy up go.mod
go mod tidy
```

#### npm/Node Issues
**Problem**: Package installation failures

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Use specific Node version (with nvm)
nvm use 18

# Try with legacy peer deps
npm install --legacy-peer-deps
```

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](link-to-issues) for similar problems
2. Review the specification documents in `.kiro/specs/stock-portfolio-tracker/`
3. Enable debug logging:
   - Backend: Add logging statements in services
   - Frontend: Check browser console and Network tab
4. Create a new issue with:
   - Error message and stack trace
   - Steps to reproduce
   - Environment details (OS, Go version, Node version)

## Deployment

For production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

## Next Steps

This is the initial project setup. To continue development:

1. Open `.kiro/specs/stock-portfolio-tracker/tasks.md`
2. Follow the implementation tasks in order
3. Each task builds incrementally on previous work

## License

Private project - All rights reserved

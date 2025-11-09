# Requirements Document

## Introduction

The Stock Portfolio Tracker is a full-stack web application that enables users to manage and track their stock investments across US and Chinese markets. The system provides real-time stock data integration, portfolio management with transaction tracking, performance analytics with multi-currency support, and comprehensive visualizations. The application uses React.js for the frontend, Go with Gin framework for the backend, and MongoDB for data persistence.

## Glossary

- **Portfolio_System**: The complete stock portfolio tracking web application
- **Auth_Service**: The authentication and authorization component using JWT tokens
- **Stock_API_Service**: The service that integrates with Yahoo Finance and Tushare APIs for stock data
- **Portfolio_Service**: The service managing user portfolios and transactions
- **Analytics_Service**: The service computing performance metrics and returns
- **Currency_Service**: The service handling currency conversion between USD and RMB
- **Frontend_App**: The React.js web application interface
- **Backend_API**: The Go/Gin REST API server
- **Database**: The MongoDB database storing user and portfolio data
- **User**: A registered person using the Portfolio_System
- **Holding**: A stock position in a User's portfolio
- **Transaction**: A buy or sell action recorded for a Holding
- **Symbol**: A stock ticker identifier (e.g., AAPL, 600000.SS)

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a user, I want to securely register and login to the system, so that my portfolio data remains private and protected.

#### Acceptance Criteria

1. WHEN a User submits valid registration credentials with email and password, THE Auth_Service SHALL create a new User account with hashed password in the Database
2. WHEN a User submits valid login credentials, THE Auth_Service SHALL generate a JWT token with expiration time and return it to the Frontend_App
3. WHEN a User accesses a protected endpoint without a valid JWT token, THE Backend_API SHALL return an HTTP 401 unauthorized response
4. THE Auth_Service SHALL validate email format and enforce minimum password length of 8 characters before account creation
5. WHEN a User attempts to register with an existing email address, THE Auth_Service SHALL return an HTTP 409 conflict error

### Requirement 2: US Stock Data Integration

**User Story:** As a user, I want to fetch real-time and historical data for US stocks, so that I can track my US market investments accurately.

#### Acceptance Criteria

1. WHEN a User requests data for a US stock Symbol, THE Stock_API_Service SHALL fetch current price and basic information from Yahoo Finance API
2. WHEN a User requests historical data for a US stock Symbol with a time period parameter, THE Stock_API_Service SHALL retrieve daily price data for up to 1 year from Yahoo Finance API
3. THE Stock_API_Service SHALL return stock name, sector, current price, and currency as USD for US stocks
4. WHEN the Yahoo Finance API request fails, THE Stock_API_Service SHALL return an error message to the Frontend_App with HTTP 503 status
5. THE Stock_API_Service SHALL cache stock data responses for 5 minutes to reduce API call frequency

### Requirement 3: Chinese Stock Data Integration

**User Story:** As a user, I want to fetch real-time and historical data for Chinese stocks, so that I can track my Chinese market investments.

#### Acceptance Criteria

1. WHEN a User requests data for a Chinese stock Symbol with Shanghai or Shenzhen exchange suffix, THE Stock_API_Service SHALL fetch current price from Tushare API using the configured token
2. WHEN a User requests historical data for a Chinese stock Symbol with a time period parameter, THE Stock_API_Service SHALL retrieve daily price data for up to 1 year from Tushare API
3. THE Stock_API_Service SHALL return stock name, current price, and currency as RMB for Chinese stocks
4. WHEN the Tushare API request fails or token is invalid, THE Stock_API_Service SHALL return an error message to the Frontend_App with HTTP 503 status
5. THE Stock_API_Service SHALL cache Chinese stock data responses for 5 minutes to reduce API call frequency

### Requirement 4: Portfolio Transaction Management

**User Story:** As a user, I want to add, edit, and delete my stock transactions, so that I can maintain an accurate record of my investment activities.

#### Acceptance Criteria

1. WHEN a User submits a buy transaction with Symbol, shares, price, date, and currency, THE Portfolio_Service SHALL validate the data and store the Transaction in the Database
2. WHEN a User submits a sell transaction with Symbol, shares, price, date, and currency, THE Portfolio_Service SHALL verify sufficient shares exist in the Holding and store the Transaction
3. WHEN a User requests to edit a Transaction with a valid transaction ID, THE Portfolio_Service SHALL update the Transaction record in the Database
4. WHEN a User requests to delete a Transaction with a valid transaction ID, THE Portfolio_Service SHALL remove the Transaction from the Database
5. THE Portfolio_Service SHALL validate that transaction date is not in the future and shares quantity is greater than zero
6. WHEN a User adds a Transaction with optional fees parameter, THE Portfolio_Service SHALL include the fees in the cost basis calculation

### Requirement 5: Portfolio Holdings Display

**User Story:** As a user, I want to view all my current holdings with their details, so that I can see my complete portfolio at a glance.

#### Acceptance Criteria

1. WHEN a User requests their portfolio holdings, THE Portfolio_Service SHALL retrieve all Holdings with aggregated Transaction data from the Database
2. THE Portfolio_Service SHALL calculate total shares, average cost basis, and current value for each Holding
3. THE Portfolio_Service SHALL fetch current market prices for all Holdings from the Stock_API_Service
4. THE Portfolio_Service SHALL return Holdings data with Symbol, shares, cost basis, current price, current value, and unrealized gain or loss
5. WHEN a Holding has zero shares after sell transactions, THE Portfolio_Service SHALL exclude it from the active holdings list

### Requirement 6: Performance Analytics and Dashboard

**User Story:** As a user, I want to see my portfolio's overall performance metrics and visualizations, so that I can understand my investment returns.

#### Acceptance Criteria

1. WHEN a User accesses the dashboard, THE Analytics_Service SHALL calculate total portfolio value by summing all Holdings current values
2. THE Analytics_Service SHALL calculate total gain or loss as the difference between current portfolio value and total cost basis
3. THE Analytics_Service SHALL compute percentage return as total gain divided by total cost basis multiplied by 100
4. THE Analytics_Service SHALL generate allocation data showing percentage of portfolio value per Holding for pie chart visualization
5. THE Analytics_Service SHALL return dashboard metrics including total value, total gain or loss, percentage return, and allocation breakdown

### Requirement 7: Historical Portfolio Performance

**User Story:** As a user, I want to view my portfolio value changes over time with different time periods, so that I can analyze historical performance trends.

#### Acceptance Criteria

1. WHEN a User requests historical performance with a time period parameter of 1M, 3M, 6M, or 1Y, THE Analytics_Service SHALL compute daily portfolio values for the specified period
2. THE Analytics_Service SHALL retrieve historical prices for all Holdings from the Stock_API_Service for the requested time period
3. THE Analytics_Service SHALL calculate portfolio value for each day by multiplying shares held on that day by the historical price
4. THE Analytics_Service SHALL return time series data with date and portfolio value pairs for line chart visualization
5. WHEN insufficient historical data exists for the requested period, THE Analytics_Service SHALL return available data with a warning message

### Requirement 8: Multi-Currency Support

**User Story:** As a user, I want to view my portfolio in either USD or RMB, so that I can analyze my investments in my preferred currency.

#### Acceptance Criteria

1. WHEN a User selects USD as display currency, THE Currency_Service SHALL convert all RMB values to USD using the current exchange rate
2. WHEN a User selects RMB as display currency, THE Currency_Service SHALL convert all USD values to RMB using the current exchange rate
3. THE Currency_Service SHALL fetch current USD to CNY exchange rate from ExchangeRate-API
4. THE Currency_Service SHALL cache exchange rate data for 1 hour to reduce API calls
5. WHEN the ExchangeRate-API request fails, THE Currency_Service SHALL use the last cached rate and log a warning

### Requirement 9: Stock Search and Addition

**User Story:** As a user, I want to search for stocks by symbol and add them to my portfolio, so that I can easily find and track new investments.

#### Acceptance Criteria

1. WHEN a User enters a Symbol in the search field, THE Frontend_App SHALL send a search request to the Stock_API_Service
2. THE Stock_API_Service SHALL validate the Symbol format and determine if it is a US or Chinese stock
3. WHEN a valid Symbol is found, THE Stock_API_Service SHALL return stock name, current price, and basic information
4. WHEN an invalid Symbol is entered, THE Stock_API_Service SHALL return an HTTP 404 error with message indicating stock not found
5. WHEN a User confirms adding a searched stock, THE Frontend_App SHALL navigate to the transaction entry form with Symbol pre-filled

### Requirement 10: Security and Data Protection

**User Story:** As a user, I want my data to be secure and protected from unauthorized access, so that my financial information remains confidential.

#### Acceptance Criteria

1. THE Auth_Service SHALL hash all User passwords using bcrypt before storing in the Database
2. THE Backend_API SHALL validate and sanitize all input data using Gin middleware before processing
3. THE Backend_API SHALL implement CORS policy allowing only the Frontend_App origin
4. THE Backend_API SHALL implement rate limiting of 100 requests per minute per IP address
5. THE Backend_API SHALL store all API keys and secrets in environment variables and never expose them in responses

### Requirement 11: Error Handling and User Feedback

**User Story:** As a user, I want to receive clear error messages and loading indicators, so that I understand what is happening with my requests.

#### Acceptance Criteria

1. WHEN any API request is processing, THE Frontend_App SHALL display a loading indicator to the User
2. WHEN an API request fails, THE Frontend_App SHALL display an error message with the failure reason
3. WHEN a User submits invalid form data, THE Frontend_App SHALL display field-specific validation errors
4. THE Backend_API SHALL return consistent error response format with status code, error message, and error code
5. WHEN the Database connection fails, THE Backend_API SHALL return HTTP 500 error and log the failure details

### Requirement 12: Responsive User Interface

**User Story:** As a user, I want the application to work well on different screen sizes, so that I can access my portfolio from any device.

#### Acceptance Criteria

1. THE Frontend_App SHALL render all pages with responsive layout using Material-UI components
2. WHEN viewed on mobile devices with screen width less than 768 pixels, THE Frontend_App SHALL adjust navigation to hamburger menu
3. WHEN viewed on tablet or desktop devices, THE Frontend_App SHALL display full navigation and multi-column layouts
4. THE Frontend_App SHALL ensure all charts and tables are readable and interactive on mobile devices
5. THE Frontend_App SHALL maintain consistent styling and branding across all screen sizes

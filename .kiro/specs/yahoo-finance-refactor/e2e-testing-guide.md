# End-to-End Testing Guide - Yahoo Finance Refactor

## Overview
This guide provides step-by-step instructions for performing end-to-end verification of the Yahoo Finance refactor. All stock data (US and Chinese) should now be fetched from Yahoo Finance API.

## Prerequisites

Before starting, ensure you have:
- ✅ Go 1.21+ installed
- ✅ Node.js 18+ installed
- ✅ MongoDB running (local or Atlas)
- ✅ ExchangeRate-API key (for currency conversion)

## Step 1: Environment Setup

### Backend Configuration

1. **Create server/.env file** (if not exists):
```bash
cd server
cp .env.example .env
```

2. **Edit server/.env with your configuration**:
```env
PORT=8080
MONGODB_URI=mongodb://localhost:27017/stock_portfolio
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
EXCHANGE_RATE_API_KEY=your_exchangerate_api_key_here
YAHOO_FINANCE_API_KEY=
CORS_ORIGIN=http://localhost:3000
```

**Important Notes:**
- For local MongoDB: Use `mongodb://localhost:27017/stock_portfolio`
- For MongoDB Atlas: Use your connection string from Atlas dashboard
- JWT_SECRET should be a strong random string (32+ characters)
- YAHOO_FINANCE_API_KEY can be left empty (uses free Chart API)

### Frontend Configuration

1. **Create web/.env file** (if not exists):
```bash
cd web
cp .env.example .env
```

2. **Edit web/.env**:
```env
REACT_APP_API_URL=http://localhost:8080
```

## Step 2: Start the Application

### Terminal 1 - Start Backend

```bash
cd server
go run main.go
```

**Expected Output:**
```
Connected to MongoDB successfully
Server starting on port 8080
```

**Verify backend is running:**
```bash
curl http://localhost:8080/health
```

Expected response: `{"status":"ok"}`

### Terminal 2 - Start Frontend

```bash
cd web
npm install  # First time only
npm start
```

**Expected Output:**
```
Compiled successfully!
You can now view stock-portfolio-tracker in the browser.
  Local:            http://localhost:3000
```

The browser should automatically open to `http://localhost:3000`

## Step 3: End-to-End Test Scenarios

### Test 1: User Registration and Login

1. **Navigate to** `http://localhost:3000`
2. **Click "Register"** (or navigate to `/register`)
3. **Create a new account:**
   - Email: `test@example.com`
   - Password: `password123`
4. **Click "Register"** button
5. **Verify:** You should be redirected to the dashboard

**Expected Result:** ✅ User successfully registered and logged in

---

### Test 2: Search and Add US Stock (AAPL)

1. **Navigate to "Search"** page (from navigation menu)
2. **Enter symbol:** `AAPL`
3. **Click "Search"** button
4. **Verify stock information displays:**
   - Symbol: AAPL
   - Name: Apple Inc.
   - Current Price: (should show current price)
   - Currency: USD

5. **Click "Add Transaction"** button
6. **Fill in transaction form:**
   - Action: Buy
   - Shares: 10
   - Price: (use current price or enter manually)
   - Date: (select today's date)
   - Fees: 5.00 (optional)

7. **Click "Add Transaction"**
8. **Verify:** Success message appears

**Expected Result:** ✅ AAPL stock info fetched from Yahoo Finance and transaction added

**Verification Points:**
- Stock data should load within 1-2 seconds
- Currency should be USD
- Current price should be a reasonable value (> $100)
- No errors in browser console

---

### Test 3: Search and Add Chinese Stock (600000.SS)

1. **Navigate to "Search"** page
2. **Enter symbol:** `600000.SS`
3. **Click "Search"** button
4. **Verify stock information displays:**
   - Symbol: 600000.SS
   - Name: 浦发银行 (or similar Chinese name)
   - Current Price: (should show current price)
   - Currency: CNY

5. **Click "Add Transaction"** button
6. **Fill in transaction form:**
   - Action: Buy
   - Shares: 100
   - Price: (use current price or enter manually)
   - Date: (select today's date)
   - Fees: 10.00 (optional)

7. **Click "Add Transaction"**
8. **Verify:** Success message appears

**Expected Result:** ✅ Chinese stock info fetched from Yahoo Finance and transaction added

**Verification Points:**
- Stock data should load within 1-2 seconds
- Currency should be CNY
- Current price should be reasonable (typically 5-15 CNY range)
- Chinese characters display correctly
- No errors in browser console

---

### Test 4: Dashboard - Portfolio Value and Gains

1. **Navigate to "Dashboard"** page
2. **Verify the following sections display:**

   **Portfolio Summary Card:**
   - Total Value (in USD by default)
   - Total Gain/Loss
   - Percentage Return
   - Values should be calculated correctly based on your transactions

   **Allocation Pie Chart:**
   - Should show two segments: AAPL and 600000.SS
   - Percentages should add up to 100%
   - Hover over segments to see details

   **Historical Performance Chart:**
   - Line chart showing portfolio value over time
   - X-axis: Dates
   - Y-axis: Portfolio value
   - Should show data points for the selected period

**Expected Result:** ✅ Dashboard displays correct portfolio metrics

**Verification Points:**
- Total value = (AAPL shares × AAPL price) + (600000.SS shares × 600000.SS price in USD)
- Gain/Loss calculated correctly
- Charts render without errors
- No console errors

---

### Test 5: Holdings Page - Current Prices

1. **Navigate to "Holdings"** page
2. **Verify holdings table displays both stocks:**

   **AAPL Row:**
   - Symbol: AAPL
   - Shares: 10
   - Cost Basis: (your purchase price × shares)
   - Current Price: (live price from Yahoo Finance)
   - Current Value: (current price × shares)
   - Gain/Loss: (current value - cost basis)
   - Gain/Loss %: ((current value - cost basis) / cost basis × 100)

   **600000.SS Row:**
   - Symbol: 600000.SS
   - Shares: 100
   - Cost Basis: (your purchase price × shares)
   - Current Price: (live price from Yahoo Finance)
   - Current Value: (current price × shares)
   - Gain/Loss: (current value - cost basis)
   - Gain/Loss %: percentage

3. **Click on a stock symbol** to view transaction history
4. **Verify:** Transaction list shows your buy transactions

**Expected Result:** ✅ Holdings display current prices and correct calculations

**Verification Points:**
- Current prices are up-to-date (fetched from Yahoo Finance)
- All calculations are correct
- Both USD and CNY stocks display properly
- Clicking stock opens transaction details

---

### Test 6: Historical Performance Chart

1. **Navigate to "Dashboard"** page
2. **Locate the Historical Performance Chart**
3. **Test different time periods:**
   - Click "1M" button
   - Click "3M" button
   - Click "6M" button
   - Click "1Y" button

4. **For each period, verify:**
   - Chart updates with new data
   - X-axis shows appropriate date range
   - Y-axis shows portfolio values
   - Data points are connected with lines
   - Hover shows exact values

**Expected Result:** ✅ Historical chart renders correctly for all periods

**Verification Points:**
- Chart loads within 2-3 seconds
- Data points are visible
- No gaps or missing data (except for non-trading days)
- Smooth transitions between periods
- No console errors

---

### Test 7: Currency Toggle Functionality

1. **Navigate to "Dashboard"** page
2. **Locate the currency toggle** (usually in top-right or near portfolio summary)
3. **Current currency should be USD**

4. **Click to switch to CNY:**
   - Verify all values update to CNY
   - Total Value converts to CNY
   - Gain/Loss converts to CNY
   - Chart Y-axis updates to CNY

5. **Click to switch back to USD:**
   - Verify all values convert back to USD
   - Values should match original USD values

6. **Navigate to "Holdings"** page with CNY selected:
   - Verify holdings values display in CNY
   - Current prices and values converted correctly

**Expected Result:** ✅ Currency toggle works correctly across all pages

**Verification Points:**
- Conversion uses correct exchange rate
- All monetary values update consistently
- No calculation errors
- Currency symbol displays correctly ($ vs ¥)
- Toggle state persists across page navigation

---

### Test 8: Additional Stock Searches

Test a few more stocks to ensure Yahoo Finance integration works broadly:

**US Stocks:**
- MSFT (Microsoft)
- GOOGL (Google)
- TSLA (Tesla)

**Chinese Stocks:**
- 000001.SZ (平安银行 - Shenzhen)
- 601398.SS (工商银行 - Shanghai)

**For each stock:**
1. Search for the symbol
2. Verify stock info loads correctly
3. Verify currency is appropriate (USD for US, CNY for Chinese)
4. Verify name displays correctly

**Expected Result:** ✅ All stocks fetch data successfully from Yahoo Finance

---

## Step 4: Error Handling Tests

### Test Invalid Stock Symbol

1. **Navigate to "Search"** page
2. **Enter invalid symbol:** `INVALID123`
3. **Click "Search"**
4. **Verify:** Error message displays (e.g., "Stock not found")

**Expected Result:** ✅ Graceful error handling for invalid symbols

### Test Network Error Simulation

1. **Stop the backend server** (Ctrl+C in Terminal 1)
2. **Try to search for a stock** in the frontend
3. **Verify:** Error message displays (e.g., "Unable to connect to server")
4. **Restart backend server**
5. **Try search again**
6. **Verify:** Works normally after reconnection

**Expected Result:** ✅ Graceful error handling for network issues

---

## Step 5: Cache Verification

### Test Stock Info Cache

1. **Open browser DevTools** (F12)
2. **Go to Network tab**
3. **Search for AAPL**
4. **Note the API request** to `/api/stocks/AAPL/info`
5. **Search for AAPL again** (within 5 minutes)
6. **Verify:** Response is faster (served from cache)
7. **Check Network tab:** Should see cached response or no new request

**Expected Result:** ✅ Cache reduces API calls and improves performance

---

## Step 6: Backend Logs Verification

### Check Backend Console Output

In Terminal 1 (backend), you should see logs like:

```
[GIN] 2024/01/01 - 12:00:00 | 200 |    250.5ms |       127.0.0.1 | GET      "/api/stocks/AAPL/info"
[GIN] 2024/01/01 - 12:00:05 | 200 |    300.2ms |       127.0.0.1 | GET      "/api/stocks/600000.SS/info"
[GIN] 2024/01/01 - 12:00:10 | 200 |     50.1ms |       127.0.0.1 | GET      "/api/portfolio/holdings"
```

**Verify:**
- No error logs (500 status codes)
- Response times are reasonable (< 1 second for cached, < 3 seconds for API calls)
- All requests return 200 status codes

---

## Success Criteria Checklist

Mark each item as you verify:

- [ ] Backend starts successfully and connects to MongoDB
- [ ] Frontend starts successfully and loads in browser
- [ ] User can register and login
- [ ] US stock (AAPL) data fetches from Yahoo Finance
- [ ] Chinese stock (600000.SS) data fetches from Yahoo Finance
- [ ] Dashboard displays correct portfolio value
- [ ] Dashboard displays correct gain/loss
- [ ] Allocation pie chart renders correctly
- [ ] Historical performance chart renders correctly
- [ ] Holdings page displays current prices
- [ ] Holdings page calculates gains correctly
- [ ] Historical chart works for all periods (1M, 3M, 6M, 1Y)
- [ ] Currency toggle switches between USD and CNY
- [ ] Currency conversion is accurate
- [ ] Invalid stock symbols show error messages
- [ ] Network errors are handled gracefully
- [ ] Cache improves performance on repeated requests
- [ ] No errors in browser console
- [ ] No errors in backend logs

---

## Troubleshooting

### Issue: Stock data not loading

**Check:**
1. Backend is running and accessible
2. No CORS errors in browser console
3. Yahoo Finance API is accessible (not blocked by firewall)
4. Stock symbol is correct format (e.g., 600000.SS not 600000)

### Issue: Currency conversion not working

**Check:**
1. EXCHANGE_RATE_API_KEY is set in server/.env
2. ExchangeRate-API key is valid
3. Check backend logs for API errors

### Issue: Charts not rendering

**Check:**
1. Browser console for JavaScript errors
2. Data is being fetched successfully (Network tab)
3. Chart.js library loaded correctly

### Issue: MongoDB connection failed

**Check:**
1. MongoDB is running (local) or accessible (Atlas)
2. MONGODB_URI is correct in server/.env
3. IP address is whitelisted (Atlas)

---

## Cleanup

After testing, you can:

1. **Stop the servers:**
   - Press Ctrl+C in both terminals

2. **Optional: Clear test data:**
   ```bash
   # Connect to MongoDB and drop test database
   mongosh
   use stock_portfolio
   db.dropDatabase()
   ```

---

## Conclusion

If all tests pass, the Yahoo Finance refactor is successfully implemented and verified. The system now:
- ✅ Uses Yahoo Finance as the single data source for all markets
- ✅ Removed Tushare API dependency
- ✅ Maintains backward compatibility
- ✅ Provides accurate real-time stock data
- ✅ Supports multi-currency display
- ✅ Handles errors gracefully

**Next Steps:**
- Mark task 8 as complete
- Consider deploying to production
- Monitor performance and error rates

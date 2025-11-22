# Design Document

## Overview

This design enhances the Performance page to provide comprehensive portfolio performance analytics with multiple visualization modes, key performance metrics, and professional risk indicators including maximum drawdown and recovery time analysis. The enhancement focuses on both frontend UI improvements and backend API extensions to support advanced performance calculations.

### Key Features

1. **Dual View Modes**: Toggle between absolute value and percentage return visualization
2. **Performance Metrics Dashboard**: Display key metrics including total return, period return, best/worst days, maximum drawdown, and recovery time
3. **Multi-Mode Chart**: Support for value-only, percentage-only, and dual-axis chart modes
4. **Visual Performance Indicators**: Color-coded gains/losses with reference lines
5. **Advanced Risk Metrics**: Maximum drawdown calculation with peak-to-trough visualization and recovery time analysis

## Architecture

### Frontend Architecture

```
PerformancePage (Container)
├── CurrencyToggle (Existing)
├── ViewModeToggle (New)
├── ChartModeToggle (New)
├── PerformanceMetricsGrid (New)
│   ├── TotalReturnCard
│   ├── PeriodReturnCard
│   ├── BestDayCard
│   ├── WorstDayCard
│   ├── MaxDrawdownCard
│   └── RecoveryTimeCard
└── EnhancedPerformanceChart (Enhanced)
    ├── DualAxisChart (New)
    └── DrawdownMarkers (New)
```

### Backend Architecture

```
Analytics Handler
├── GetPerformance (Enhanced)
│   ├── Historical data points
│   ├── Performance metrics
│   └── Drawdown analysis
└── Analytics Service
    ├── GetHistoricalPerformance (Enhanced)
    ├── CalculatePerformanceMetrics (New)
    ├── CalculateMaxDrawdown (New)
    └── CalculateRecoveryTime (New)
```

## Components and Interfaces

### Frontend Components

#### 1. PerformancePage (Enhanced)

**Location**: `web/src/pages/PerformancePage.tsx`

**State Management**:
```typescript
interface PerformancePageState {
  currency: 'USD' | 'RMB';
  viewMode: 'absolute' | 'percentage';
  chartMode: 'value' | 'percentage' | 'both';
  period: '1M' | '3M' | '6M' | '1Y' | 'ALL';
}
```

**New Controls**:
- View Mode Toggle: Switch between absolute and percentage views
- Chart Mode Toggle: Select single or dual-axis chart display
- Persist user preferences in localStorage

#### 2. PerformanceMetricsGrid (New Component)

**Location**: `web/src/components/PerformanceMetricsGrid.tsx`

**Props**:
```typescript
interface PerformanceMetricsGridProps {
  metrics: PerformanceMetrics;
  currency: 'USD' | 'RMB';
  period: string;
}

interface PerformanceMetrics {
  totalReturn: {
    absolute: number;
    percentage: number;
  };
  periodReturn: {
    absolute: number;
    percentage: number;
  };
  bestDay: {
    date: string;
    change: number;
    changePercent: number;
  };
  worstDay: {
    date: string;
    change: number;
    changePercent: number;
  };
  maxDrawdown: {
    percentage: number;
    absolute: number;
    peakDate: string;
    troughDate: string;
    peakValue: number;
    troughValue: number;
  };
  recoveryTime: {
    status: 'recovered' | 'in_drawdown';
    days: number;
    averageDays: number;
  };
}
```

**Layout**: 2x3 grid on desktop, stacked on mobile using Tailwind responsive classes

#### 3. EnhancedPerformanceChart (Enhanced Component)

**Location**: `web/src/components/HistoricalPerformanceChart.tsx` (rename to `EnhancedPerformanceChart.tsx`)

**New Features**:
- Support for percentage data series
- Dual y-axis configuration for "both" mode
- Dynamic color based on performance (green for gains, red for losses)
- Horizontal reference line at starting value/0%
- Drawdown markers (peak and trough points)
- Enhanced tooltip showing both absolute and percentage values

**Chart.js Configuration**:
```typescript
interface ChartDataset {
  // For absolute value
  valueDataset: {
    label: 'Portfolio Value';
    data: {x: number, y: number}[];
    borderColor: string; // Dynamic based on performance
    yAxisID: 'y-value';
  };
  
  // For percentage return
  percentageDataset: {
    label: 'Return %';
    data: {x: number, y: number}[];
    borderColor: string;
    yAxisID: 'y-percentage';
  };
  
  // Reference line
  referenceLine: {
    type: 'line';
    borderColor: 'rgba(156, 163, 175, 0.5)';
    borderDash: [5, 5];
  };
  
  // Drawdown markers
  drawdownMarkers: {
    peak: {x: number, y: number};
    trough: {x: number, y: number};
  };
}
```

#### 4. MetricCard (Enhanced)

**Location**: `web/src/components/ui/MetricCard.tsx`

**Enhanced Props**:
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  tooltip?: string;
  highlight?: boolean;
}
```

### Backend Components

#### 1. Analytics Handler (Enhanced)

**Location**: `server/handlers/analytics_handler.go`

**Enhanced GetPerformance Endpoint**:

```go
// GET /api/analytics/performance
// Query params: period, currency
// Response includes historical data + metrics
type PerformanceResponse struct {
    Period      string                  `json:"period"`
    Currency    string                  `json:"currency"`
    Performance []PerformanceDataPoint  `json:"performance"`
    Metrics     PerformanceMetrics      `json:"metrics"`
}
```

#### 2. Analytics Service (Enhanced)

**Location**: `server/services/analytics_service.go`

**New Data Structures**:

```go
type PerformanceMetrics struct {
    TotalReturn    ReturnMetric    `json:"totalReturn"`
    PeriodReturn   ReturnMetric    `json:"periodReturn"`
    BestDay        DayMetric       `json:"bestDay"`
    WorstDay       DayMetric       `json:"worstDay"`
    MaxDrawdown    DrawdownMetric  `json:"maxDrawdown"`
    RecoveryTime   RecoveryMetric  `json:"recoveryTime"`
}

type ReturnMetric struct {
    Absolute   float64 `json:"absolute"`
    Percentage float64 `json:"percentage"`
}

type DayMetric struct {
    Date          time.Time `json:"date"`
    Change        float64   `json:"change"`
    ChangePercent float64   `json:"changePercent"`
}

type DrawdownMetric struct {
    Percentage float64   `json:"percentage"`
    Absolute   float64   `json:"absolute"`
    PeakDate   time.Time `json:"peakDate"`
    TroughDate time.Time `json:"troughDate"`
    PeakValue  float64   `json:"peakValue"`
    TroughValue float64  `json:"troughValue"`
}

type RecoveryMetric struct {
    Status      string  `json:"status"` // "recovered" or "in_drawdown"
    Days        int     `json:"days"`
    AverageDays float64 `json:"averageDays"`
}
```

**New Methods**:

```go
// CalculatePerformanceMetrics calculates all performance metrics
func (s *AnalyticsService) CalculatePerformanceMetrics(
    dataPoints []PerformanceDataPoint,
) (*PerformanceMetrics, error)

// CalculateMaxDrawdown finds the maximum drawdown in the data
func (s *AnalyticsService) CalculateMaxDrawdown(
    dataPoints []PerformanceDataPoint,
) (*DrawdownMetric, error)

// CalculateRecoveryTime calculates recovery time for drawdowns
func (s *AnalyticsService) CalculateRecoveryTime(
    dataPoints []PerformanceDataPoint,
    drawdowns []DrawdownMetric,
) (*RecoveryMetric, error)

// FindBestAndWorstDays identifies best and worst performing days
func (s *AnalyticsService) FindBestAndWorstDays(
    dataPoints []PerformanceDataPoint,
) (best DayMetric, worst DayMetric, error)
```

## Data Models

### Performance Data Point (Enhanced)

```go
type PerformanceDataPoint struct {
    Date            time.Time `json:"date"`
    Value           float64   `json:"value"`           // Absolute value
    PercentageReturn float64  `json:"percentageReturn"` // Percentage from start
    DayChange       float64   `json:"dayChange"`       // Day-over-day change
    DayChangePercent float64  `json:"dayChangePercent"` // Day-over-day %
}
```

### Frontend API Response Types

```typescript
// web/src/api/analytics.ts

export interface PerformanceDataPoint {
  date: string;
  value: number;
  percentageReturn: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface PerformanceResponse {
  period: string;
  currency: string;
  performance: PerformanceDataPoint[];
  metrics: PerformanceMetrics;
}

export const getPerformanceData = async (
  period: string,
  currency: string
): Promise<PerformanceResponse> => {
  const response = await axiosInstance.get('/api/analytics/performance', {
    params: { period, currency },
  });
  return response.data;
};
```

## Algorithms

### 1. Maximum Drawdown Calculation

**Algorithm**:
```
1. Initialize: maxDrawdown = 0, peak = first value, peakDate, troughDate
2. For each data point:
   a. If value > peak:
      - Update peak = value, peakDate = current date
   b. Calculate drawdown = (peak - value) / peak * 100
   c. If drawdown > maxDrawdown:
      - Update maxDrawdown, troughDate, troughValue
3. Return maxDrawdown with peak/trough information
```

**Time Complexity**: O(n) where n is number of data points

### 2. Recovery Time Calculation

**Algorithm**:
```
1. Identify all drawdowns > 5% (significant drawdowns)
2. For each drawdown:
   a. Find trough date
   b. Search forward for date when value >= peak value
   c. Calculate days = recovery date - trough date
   d. Store recovery time
3. Calculate average recovery time
4. Check if currently in drawdown:
   - If current value < most recent peak:
     - Status = "in_drawdown"
     - Days = current date - peak date
   - Else:
     - Status = "recovered"
     - Days = last recovery time
5. Return recovery metrics
```

**Time Complexity**: O(n²) worst case, O(n) average case

### 3. Best/Worst Day Calculation

**Algorithm**:
```
1. Initialize: bestDay = null, worstDay = null
2. For each consecutive pair of data points:
   a. Calculate dayChange = current - previous
   b. Calculate dayChangePercent = dayChange / previous * 100
   c. If dayChange > bestDay.change:
      - Update bestDay
   d. If dayChange < worstDay.change:
      - Update worstDay
3. Return bestDay and worstDay
```

**Time Complexity**: O(n)

### 4. Percentage Return Calculation

**Algorithm**:
```
For each data point:
  percentageReturn = ((value - initialValue) / initialValue) * 100
```

Where initialValue is the first data point's value in the period.

## Error Handling

### Frontend Error Handling

1. **API Errors**: Display error message in chart area with retry button
2. **No Data**: Show empty state with helpful message
3. **Calculation Errors**: Gracefully handle division by zero, show "N/A" for unavailable metrics
4. **Loading States**: Show skeleton loaders for metric cards and chart

### Backend Error Handling

1. **Insufficient Data**: Return empty metrics with appropriate status
2. **Calculation Errors**: Log errors, return partial data with error flags
3. **Invalid Parameters**: Return 400 Bad Request with clear error messages
4. **Database Errors**: Return 500 with generic error message, log details

## Testing Strategy

### Frontend Testing

1. **Unit Tests**:
   - MetricCard rendering with different props
   - Chart mode toggle functionality
   - View mode persistence in localStorage
   - Percentage calculation utilities

2. **Integration Tests**:
   - PerformancePage with mocked API responses
   - Chart rendering with different data scenarios
   - Metric calculations from API data

3. **Visual Tests**:
   - Chart appearance in different modes
   - Responsive layout on mobile/tablet/desktop
   - Color coding for gains/losses

### Backend Testing

1. **Unit Tests**:
   - CalculateMaxDrawdown with various scenarios
   - CalculateRecoveryTime edge cases
   - FindBestAndWorstDays accuracy
   - Percentage return calculations

2. **Integration Tests**:
   - GetPerformance endpoint with real data
   - Currency conversion in metrics
   - Period filtering accuracy

3. **Performance Tests**:
   - Large dataset handling (1Y+ data)
   - Concurrent requests
   - Database query optimization

### Test Scenarios

1. **Positive Performance**: Portfolio consistently growing
2. **Negative Performance**: Portfolio declining
3. **Volatile Performance**: Multiple drawdowns and recoveries
4. **Flat Performance**: Minimal changes
5. **Single Data Point**: Edge case handling
6. **Empty Data**: No transactions/holdings
7. **Current Drawdown**: Portfolio below peak
8. **Multiple Recoveries**: Several drawdown-recovery cycles

## Performance Considerations

### Frontend Optimization

1. **Memoization**: Use React.memo for MetricCard components
2. **Lazy Loading**: Code-split chart library
3. **Debouncing**: Debounce period/currency changes
4. **Caching**: Cache API responses for 30 seconds

### Backend Optimization

1. **Data Aggregation**: Pre-calculate metrics in single pass
2. **Efficient Algorithms**: O(n) complexity for most calculations
3. **Database Indexing**: Ensure transactions indexed by user_id and date
4. **Response Caching**: Consider caching performance data for 5 minutes

## UI/UX Design

### Color Scheme

- **Positive Performance**: Green (#10B981)
- **Negative Performance**: Red (#EF4444)
- **Neutral**: Blue (#3B82F6)
- **Reference Line**: Gray (#9CA3AF)

### Responsive Design

- **Desktop (>1024px)**: 2x3 metric grid, full chart
- **Tablet (768-1024px)**: 2x3 metric grid, full chart
- **Mobile (<768px)**: Stacked metrics, compact chart

### Accessibility

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly metric descriptions
- Sufficient color contrast ratios
- Focus indicators on toggles

## Migration Strategy

1. **Phase 1**: Backend API enhancement
   - Add new calculation methods
   - Enhance GetPerformance endpoint
   - Add unit tests

2. **Phase 2**: Frontend component development
   - Create PerformanceMetricsGrid
   - Enhance chart component
   - Add toggles and controls

3. **Phase 3**: Integration and testing
   - Connect frontend to new API
   - End-to-end testing
   - Performance optimization

4. **Phase 4**: Deployment
   - Deploy backend changes
   - Deploy frontend changes
   - Monitor for issues

## Future Enhancements

1. **Sharpe Ratio**: Risk-adjusted return metric
2. **Benchmark Comparison**: Compare against S&P 500 or other indices
3. **Volatility Metrics**: Standard deviation, beta
4. **Export Functionality**: Download performance data as CSV
5. **Custom Date Ranges**: Allow users to select arbitrary date ranges
6. **Performance Attribution**: Break down returns by asset class/style

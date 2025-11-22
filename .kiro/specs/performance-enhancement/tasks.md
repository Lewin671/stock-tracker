# Implementation Plan

- [x] 1. Backend: Enhance performance data structures and calculations
  - [x] 1.1 Add new data structures for enhanced performance metrics
    - Add `PerformanceMetrics`, `ReturnMetric`, `DayMetric`, `DrawdownMetric`, and `RecoveryMetric` structs to `analytics_service.go`
    - Update `PerformanceDataPoint` struct to include `PercentageReturn`, `DayChange`, and `DayChangePercent` fields
    - _Requirements: 7.1, 7.2_

  - [x] 1.2 Implement maximum drawdown calculation algorithm
    - Create `CalculateMaxDrawdown` method that iterates through data points to find peak-to-trough decline
    - Track peak value, peak date, trough value, and trough date
    - Calculate drawdown percentage as `(peak - trough) / peak * 100`
    - _Requirements: 5.4, 5.5_

  - [x] 1.3 Implement recovery time calculation algorithm
    - Create `CalculateRecoveryTime` method to identify significant drawdowns (>5%)
    - For each drawdown, find recovery date when value returns to peak
    - Calculate days between trough and recovery
    - Handle "in_drawdown" status for ongoing drawdowns
    - Calculate average recovery time across all drawdowns
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 1.4 Implement best/worst day identification
    - Create `FindBestAndWorstDays` method to calculate day-over-day changes
    - Track maximum positive and negative daily changes
    - Store date, absolute change, and percentage change for both
    - _Requirements: 2.3, 2.4_

  - [x] 1.5 Create comprehensive performance metrics calculation method
    - Create `CalculatePerformanceMetrics` method that orchestrates all calculations
    - Calculate total return (first to last data point)
    - Calculate period return based on selected time period
    - Integrate max drawdown, recovery time, and best/worst day calculations
    - _Requirements: 2.1, 2.2, 2.5_

- [x] 2. Backend: Enhance GetHistoricalPerformance service method
  - [x] 2.1 Update performance data point calculation
    - Calculate percentage return for each data point: `((value - initialValue) / initialValue) * 100`
    - Calculate day-over-day change: `currentValue - previousValue`
    - Calculate day-over-day percentage: `(dayChange / previousValue) * 100`
    - _Requirements: 7.1, 7.2_

  - [x] 2.2 Integrate metrics calculation into GetHistoricalPerformance
    - Call `CalculatePerformanceMetrics` after generating performance data points
    - Return both data points and calculated metrics
    - Handle edge cases (empty data, single data point)
    - _Requirements: 2.5, 2.6_

- [x] 3. Backend: Update analytics handler endpoint
  - [x] 3.1 Modify GetPerformance handler response structure
    - Update response to include both `performance` array and `metrics` object
    - Ensure proper JSON serialization of new data structures
    - Add support for "ALL" period parameter
    - _Requirements: 5.5, 6.5, 7.4, 7.5, 7.6_

  - [x] 3.2 Add error handling for edge cases
    - Handle insufficient data scenarios gracefully
    - Return appropriate error messages for calculation failures
    - Log detailed errors for debugging
    - _Requirements: 2.5_

- [x] 4. Frontend: Create PerformanceMetricsGrid component
  - [x] 4.1 Create MetricCard component enhancements
    - Enhance existing `MetricCard` component to support trend indicators
    - Add props for `trend`, `icon`, `tooltip`, and `highlight`
    - Implement color coding: green for positive, red for negative
    - _Requirements: 4.4_

  - [x] 4.2 Create TotalReturnCard component
    - Display total return in both absolute value and percentage
    - Show appropriate currency symbol based on selected currency
    - Add trend indicator (up/down icon)
    - _Requirements: 2.1, 2.6_

  - [x] 4.3 Create PeriodReturnCard component
    - Display period return based on selected time period
    - Show both absolute and percentage values
    - Update dynamically when period changes
    - _Requirements: 2.2, 2.5_

  - [x] 4.4 Create BestDayCard and WorstDayCard components
    - Display best performing day with date, change, and percentage
    - Display worst performing day with date, change, and percentage
    - Format dates in readable format (e.g., "Jan 15, 2024")
    - _Requirements: 2.3, 2.4_

  - [x] 4.5 Create MaxDrawdownCard component
    - Display maximum drawdown percentage and absolute value
    - Show peak and trough dates
    - Add tooltip with detailed explanation
    - Highlight if drawdown is significant (>10%)
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

  - [x] 4.6 Create RecoveryTimeCard component
    - Display recovery time in days for recovered drawdowns
    - Show "In Drawdown" status with days since peak for ongoing drawdowns
    - Display average recovery time
    - Only show when significant drawdown has occurred
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 4.7 Create PerformanceMetricsGrid layout component
    - Arrange metric cards in 2x3 grid on desktop
    - Stack cards vertically on mobile
    - Implement responsive design with Tailwind classes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 6.1_

- [x] 5. Frontend: Enhance chart component for multiple view modes
  - [x] 5.1 Rename and restructure HistoricalPerformanceChart component
    - Rename `HistoricalPerformanceChart.tsx` to `EnhancedPerformanceChart.tsx`
    - Add state management for view mode and chart mode
    - Update imports in PerformancePage
    - _Requirements: 1.1, 3.1_

  - [x] 5.2 Implement view mode toggle (absolute vs percentage)
    - Add toggle control for switching between absolute value and percentage return
    - Update chart data based on selected view mode
    - Persist view mode preference in localStorage
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 5.3 Implement chart mode toggle (value/percentage/both)
    - Add toggle control for chart mode selection
    - Configure single y-axis for "value" or "percentage" modes
    - Configure dual y-axes for "both" mode
    - _Requirements: 3.1, 3.2_

  - [x] 5.4 Implement dual-axis chart configuration
    - Configure left y-axis for absolute value with currency formatting
    - Configure right y-axis for percentage with "%" symbol
    - Render two line series with distinct colors
    - Add legend to identify each series
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 5.5 Implement dynamic color coding based on performance
    - Calculate if overall performance is positive or negative
    - Use green (#10B981) for positive performance
    - Use red (#EF4444) for negative performance
    - Apply color to line border and gradient fill
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 5.6 Add reference line at starting value/0%
    - Add horizontal line at initial portfolio value for absolute view
    - Add horizontal line at 0% for percentage view
    - Style with dashed gray line
    - _Requirements: 4.3_

  - [x] 5.7 Add drawdown markers to chart
    - Plot peak point marker on chart at maximum drawdown peak date
    - Plot trough point marker on chart at maximum drawdown trough date
    - Add labels or tooltips to explain markers
    - Style markers distinctly (e.g., red triangle for trough, green circle for peak)
    - _Requirements: 5.6_

  - [x] 5.8 Enhance tooltip to show multiple values
    - Display both absolute value and percentage in tooltip when in "both" mode
    - Format currency values with appropriate symbols
    - Format percentage values with 2 decimal places
    - Show date in readable format
    - _Requirements: 1.4, 1.5, 3.5_

- [x] 6. Frontend: Update PerformancePage with new controls and components
  - [x] 6.1 Add view mode toggle to page header
    - Create toggle group for "Absolute" and "Percentage" options
    - Position next to existing currency toggle
    - Wire up to chart component state
    - _Requirements: 1.1_

  - [x] 6.2 Add chart mode toggle to page header
    - Create toggle group for "Value Only", "Percentage Only", and "Both" options
    - Position in chart card header
    - Wire up to chart component state
    - _Requirements: 3.1_

  - [x] 6.3 Integrate PerformanceMetricsGrid component
    - Add PerformanceMetricsGrid below page header and above chart
    - Pass metrics data from API response
    - Pass currency and period props
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 6.1_

  - [x] 6.4 Update API integration to fetch enhanced performance data
    - Update `getPerformanceData` function in `analytics.ts` to handle new response structure
    - Add TypeScript interfaces for new data structures
    - Handle loading and error states for metrics
    - _Requirements: 2.5, 2.6_

  - [x] 6.5 Implement localStorage persistence for user preferences
    - Save view mode preference to localStorage
    - Save chart mode preference to localStorage
    - Load preferences on component mount
    - _Requirements: 1.2_

- [x] 7. Frontend: Add responsive design and accessibility
  - [x] 7.1 Implement responsive layout for metric cards
    - Use Tailwind responsive classes for grid layout
    - Test on mobile, tablet, and desktop viewports
    - Ensure proper spacing and alignment
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 6.1_

  - [x] 7.2 Add ARIA labels and accessibility features
    - Add ARIA labels to all toggle controls
    - Ensure keyboard navigation works for all interactive elements
    - Add screen reader descriptions for metric cards
    - Verify color contrast ratios meet WCAG standards
    - _Requirements: 1.1, 3.1_

  - [x] 7.3 Add loading skeletons for metric cards
    - Create skeleton loader components for metric cards
    - Show skeletons while data is loading
    - Ensure smooth transition when data loads
    - _Requirements: 2.5_

- [x] 8. Testing: Backend unit tests
  - [x] 8.1 Write tests for CalculateMaxDrawdown
    - Test with positive performance (no drawdown)
    - Test with single drawdown
    - Test with multiple drawdowns
    - Test with ongoing drawdown
    - Test edge cases (empty data, single point)
    - _Requirements: 5.4_

  - [x] 8.2 Write tests for CalculateRecoveryTime
    - Test with recovered drawdowns
    - Test with ongoing drawdown
    - Test with multiple recovery cycles
    - Test average recovery time calculation
    - Test edge cases (no significant drawdowns)
    - _Requirements: 6.4_

  - [x] 8.3 Write tests for FindBestAndWorstDays
    - Test with volatile data
    - Test with flat performance
    - Test with consistently positive/negative performance
    - Test edge cases (single day, two days)
    - _Requirements: 2.3, 2.4_

  - [x] 8.4 Write tests for CalculatePerformanceMetrics
    - Test integration of all metric calculations
    - Test with various data scenarios
    - Test error handling
    - _Requirements: 2.1, 2.2, 2.5_

- [x] 9. Testing: Frontend component tests
  - [x] 9.1 Write tests for MetricCard component
    - Test rendering with different props
    - Test trend indicator display
    - Test color coding
    - _Requirements: 4.4_

  - [x] 9.2 Write tests for PerformanceMetricsGrid
    - Test metric card rendering
    - Test responsive layout
    - Test with missing data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 6.1_

  - [x] 9.3 Write tests for EnhancedPerformanceChart
    - Test view mode switching
    - Test chart mode switching
    - Test color coding logic
    - Test drawdown markers rendering
    - _Requirements: 1.1, 3.1, 4.1, 5.6_

  - [x] 9.4 Write integration tests for PerformancePage
    - Test with mocked API responses
    - Test loading states
    - Test error states
    - Test user preference persistence
    - _Requirements: 1.2, 2.5, 2.6_

# Requirements Document

## Introduction

This feature enhances the Performance page to provide richer visualization and insights. Currently, the page only displays absolute portfolio value over time, which is limited. Users need to see both absolute gains/losses and percentage-based returns to better understand their investment performance. Additionally, the page needs more comprehensive metrics and visual elements to make it more engaging and informative.

## Glossary

- **Performance Page**: The web application page that displays historical portfolio performance data
- **Absolute Value**: The actual monetary value of the portfolio in USD or RMB
- **Percentage Return**: The gain or loss expressed as a percentage of the initial investment
- **Performance Metrics**: Key performance indicators including total return, period return, and volatility
- **Chart Component**: React component that renders performance data visualization using Chart.js
- **Analytics Service**: Backend service that calculates and provides performance data
- **Time Period**: The duration for which performance data is displayed (1M, 3M, 6M, 1Y, ALL)
- **Maximum Drawdown**: The largest peak-to-trough decline in portfolio value during a specific period
- **Recovery Time**: The number of days required for the portfolio to recover from a drawdown to reach the previous peak value
- **Peak Value**: The highest portfolio value reached during a specific period
- **Trough Value**: The lowest portfolio value reached after a peak during a drawdown period

## Requirements

### Requirement 1

**User Story:** As a portfolio investor, I want to toggle between absolute value and percentage return views, so that I can understand both the monetary impact and relative performance of my investments

#### Acceptance Criteria

1. WHEN the user clicks the view toggle control, THE Performance Page SHALL switch between absolute value display and percentage return display
2. THE Performance Page SHALL persist the selected view mode across page refreshes
3. THE Chart Component SHALL display appropriate y-axis labels and tooltips based on the selected view mode
4. WHEN displaying percentage return, THE Chart Component SHALL show percentage values with two decimal places followed by the "%" symbol
5. WHEN displaying absolute value, THE Chart Component SHALL show currency values with the appropriate currency symbol ($ or ¥)

### Requirement 2

**User Story:** As a portfolio investor, I want to see key performance metrics displayed prominently, so that I can quickly assess my portfolio's performance without analyzing the chart

#### Acceptance Criteria

1. THE Performance Page SHALL display a metric card showing total return in both absolute value and percentage
2. THE Performance Page SHALL display a metric card showing the selected period's return in both absolute value and percentage
3. THE Performance Page SHALL display a metric card showing the best performing day within the selected period
4. THE Performance Page SHALL display a metric card showing the worst performing day within the selected period
5. WHEN the user changes the time period, THE Performance Page SHALL update all metric cards to reflect the new period's data
6. WHEN the user changes the currency, THE Performance Page SHALL update all absolute value metrics to the selected currency

### Requirement 3

**User Story:** As a portfolio investor, I want to see a dual-axis chart option, so that I can simultaneously view both absolute value and percentage return trends

#### Acceptance Criteria

1. THE Performance Page SHALL provide a chart mode toggle with options for "Value Only", "Percentage Only", and "Both"
2. WHEN "Both" mode is selected, THE Chart Component SHALL display two y-axes with absolute value on the left and percentage return on the right
3. WHEN "Both" mode is selected, THE Chart Component SHALL render two line series with distinct colors
4. THE Chart Component SHALL display a legend identifying each line series when multiple series are shown
5. WHEN hovering over the chart in "Both" mode, THE Chart Component SHALL show both values in the tooltip

### Requirement 4

**User Story:** As a portfolio investor, I want to see visual indicators of positive and negative performance, so that I can quickly identify gains and losses

#### Acceptance Criteria

1. WHEN the portfolio value increases from the period start, THE Chart Component SHALL use green color for the line and fill
2. WHEN the portfolio value decreases from the period start, THE Chart Component SHALL use red color for the line and fill
3. THE Chart Component SHALL display a horizontal reference line at the starting value or 0% return
4. THE Performance Page SHALL display gain/loss indicators with appropriate colors (green for positive, red for negative) in metric cards
5. WHEN the overall return is positive, THE Performance Page SHALL display an upward trend icon in the summary section

### Requirement 5

**User Story:** As a portfolio investor, I want to see maximum drawdown metrics, so that I can understand the risk and volatility of my portfolio

#### Acceptance Criteria

1. THE Performance Page SHALL display a metric card showing the maximum drawdown percentage for the selected period
2. THE Performance Page SHALL display a metric card showing the maximum drawdown absolute value in the selected currency
3. THE Performance Page SHALL display the date range when the maximum drawdown occurred (peak date to trough date)
4. THE Analytics Service SHALL calculate maximum drawdown as the largest percentage decline from a peak value to a subsequent trough value
5. WHEN the user changes the time period, THE Performance Page SHALL recalculate and display the maximum drawdown for the new period
6. THE Chart Component SHALL display visual markers indicating the peak and trough points of the maximum drawdown

### Requirement 6

**User Story:** As a portfolio investor, I want to see recovery time information, so that I can understand how quickly my portfolio rebounds from losses

#### Acceptance Criteria

1. WHEN a drawdown has been recovered, THE Performance Page SHALL display the number of days it took to recover to the previous peak
2. WHEN a drawdown is currently ongoing, THE Performance Page SHALL display "In Drawdown" status with the number of days since the peak
3. THE Performance Page SHALL display the recovery time metric card only when a significant drawdown (>5%) has occurred
4. THE Analytics Service SHALL calculate recovery time as the number of calendar days between the trough date and the date when the portfolio value equals or exceeds the previous peak value
5. THE Performance Page SHALL display the average recovery time across all significant drawdowns in the selected period

### Requirement 7

**User Story:** As a portfolio investor, I want the performance data to be calculated accurately, so that I can trust the metrics for investment decisions

#### Acceptance Criteria

1. THE Analytics Service SHALL calculate percentage return as ((current_value - initial_value) / initial_value) * 100
2. THE Analytics Service SHALL calculate period return based on the first and last data points within the selected time period
3. THE Analytics Service SHALL handle currency conversion consistently across all calculations when currency is changed
4. THE Analytics Service SHALL return performance data points with daily granularity for periods up to 3 months
5. THE Analytics Service SHALL return performance data points with weekly granularity for periods between 3 months and 1 year
6. THE Analytics Service SHALL return performance data points with monthly granularity for periods over 1 year

# Requirements Document

## Introduction

本文档定义了投资组合历史回测功能的需求。该功能允许用户查看其当前持仓在历史时间段内的表现，帮助用户分析投资组合的历史收益、风险指标和资产配置变化。

## Glossary

- **Portfolio Backtest System**: 投资组合历史回测系统，用于模拟和分析当前持仓在历史时间段的表现
- **User**: 使用系统的投资者
- **Holdings**: 用户当前的持仓资产列表
- **Backtest Period**: 回测时间段，用户选择的历史时间范围
- **Historical Performance**: 历史表现数据，包括收益率、波动率等指标
- **Time Series Data**: 时间序列数据，资产在特定时间段内的价格变化

## Requirements

### Requirement 1

**User Story:** 作为投资者，我希望能够选择一个历史时间段来回测我的当前持仓，以便了解这个组合在过去的表现如何

#### Acceptance Criteria

1. THE Portfolio Backtest System SHALL provide a date range selector for users to specify the backtest start date and end date
2. WHEN the user selects a backtest period, THE Portfolio Backtest System SHALL validate that the start date is before the end date
3. WHEN the user selects a backtest period, THE Portfolio Backtest System SHALL validate that the end date is not in the future
4. THE Portfolio Backtest System SHALL support backtest periods ranging from 1 month to 10 years

### Requirement 2

**User Story:** 作为投资者，我希望看到我的持仓在回测期间的累计收益曲线，以便直观了解投资组合的历史表现

#### Acceptance Criteria

1. WHEN the user initiates a backtest, THE Portfolio Backtest System SHALL retrieve historical price data for all assets in the current holdings
2. WHEN historical data is retrieved, THE Portfolio Backtest System SHALL calculate the portfolio value at each time point based on current holdings weights
3. THE Portfolio Backtest System SHALL display a line chart showing the cumulative return percentage over the backtest period
4. THE Portfolio Backtest System SHALL display the portfolio value in the user's selected currency
5. IF historical data is unavailable for any asset, THEN THE Portfolio Backtest System SHALL display a warning message indicating which assets lack data

### Requirement 3

**User Story:** 作为投资者，我希望看到回测期间的关键绩效指标，以便量化评估投资组合的风险和收益特征

#### Acceptance Criteria

1. WHEN the backtest completes, THE Portfolio Backtest System SHALL calculate and display the total return percentage for the period
2. WHEN the backtest completes, THE Portfolio Backtest System SHALL calculate and display the annualized return percentage
3. WHEN the backtest completes, THE Portfolio Backtest System SHALL calculate and display the maximum drawdown percentage
4. WHEN the backtest completes, THE Portfolio Backtest System SHALL calculate and display the volatility (standard deviation of returns)
5. WHEN the backtest completes, THE Portfolio Backtest System SHALL calculate and display the Sharpe ratio using a risk-free rate of 2%

### Requirement 4

**User Story:** 作为投资者，我希望能够将回测结果与基准指数进行对比，以便评估我的投资组合相对于市场的表现

#### Acceptance Criteria

1. THE Portfolio Backtest System SHALL provide a benchmark selector with common market indices (S&P 500, NASDAQ, Shanghai Composite)
2. WHEN a benchmark is selected, THE Portfolio Backtest System SHALL retrieve historical data for the benchmark index
3. WHEN a benchmark is selected, THE Portfolio Backtest System SHALL display the benchmark's cumulative return on the same chart as the portfolio
4. WHEN a benchmark is selected, THE Portfolio Backtest System SHALL calculate and display the portfolio's excess return compared to the benchmark

### Requirement 5

**User Story:** 作为投资者，我希望看到持仓中各个资产在回测期间的贡献度，以便了解哪些资产对整体表现影响最大

#### Acceptance Criteria

1. WHEN the backtest completes, THE Portfolio Backtest System SHALL calculate each asset's contribution to total portfolio return
2. THE Portfolio Backtest System SHALL display a bar chart showing the return contribution of each asset
3. THE Portfolio Backtest System SHALL sort assets by their contribution in descending order
4. THE Portfolio Backtest System SHALL display both absolute return and percentage contribution for each asset

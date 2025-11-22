# Design Document

## Overview

投资组合历史回测功能允许用户基于当前持仓配置，模拟该组合在历史时间段内的表现。该功能将添加一个新的 "Backtest" 页面，展示回测结果的可视化图表和关键绩效指标。

核心设计理念：
- 使用当前持仓的权重比例，应用到历史价格数据上
- 支持灵活的时间段选择（自定义日期范围）
- 提供与基准指数的对比分析
- 展示详细的风险收益指标

## Architecture

### Frontend Architecture

```
BacktestPage (新页面)
├── BacktestControls (时间段选择、基准选择)
├── BacktestChart (累计收益曲线图)
├── BacktestMetrics (关键绩效指标卡片)
└── AssetContribution (资产贡献度图表)
```

### Backend Architecture

```
BacktestHandler (新 handler)
└── BacktestService (新 service)
    ├── AnalyticsService (复用现有服务)
    ├── StockAPIService (获取历史数据)
    └── CurrencyService (货币转换)
```

### Data Flow

1. 用户在前端选择回测时间段和基准指数
2. 前端调用 `/api/backtest` API
3. 后端获取用户当前持仓
4. 后端获取所有持仓资产的历史价格数据
5. 后端计算每日组合价值（基于当前权重）
6. 后端计算绩效指标（收益率、波动率、夏普比率等）
7. 如果选择了基准，获取基准历史数据并计算对比指标
8. 返回完整的回测结果给前端
9. 前端渲染图表和指标

## Components and Interfaces

### Frontend Components

#### 1. BacktestPage

主页面组件，整合所有子组件。

```typescript
interface BacktestPageProps {}

interface BacktestPageState {
  currency: 'USD' | 'RMB';
  startDate: Date;
  endDate: Date;
  benchmark: string | null;
  backtestData: BacktestResponse | null;
  loading: boolean;
  error: string | null;
}
```

#### 2. BacktestControls

控制面板，用于选择回测参数。

```typescript
interface BacktestControlsProps {
  startDate: Date;
  endDate: Date;
  benchmark: string | null;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onBenchmarkChange: (benchmark: string | null) => void;
  onRunBacktest: () => void;
  loading: boolean;
}
```

#### 3. BacktestChart

使用 Recharts 展示累计收益曲线。

```typescript
interface BacktestChartProps {
  data: BacktestDataPoint[];
  benchmarkData?: BacktestDataPoint[];
  currency: string;
}

interface BacktestDataPoint {
  date: string;
  portfolioValue: number;
  portfolioReturn: number;
  benchmarkReturn?: number;
}
```

#### 4. BacktestMetrics

展示关键绩效指标的卡片网格。

```typescript
interface BacktestMetricsProps {
  metrics: BacktestMetrics;
  currency: string;
}

interface BacktestMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  excessReturn?: number; // vs benchmark
}
```

#### 5. AssetContribution

展示各资产对总收益的贡献度。

```typescript
interface AssetContributionProps {
  contributions: AssetContribution[];
  currency: string;
}

interface AssetContribution {
  symbol: string;
  name: string;
  weight: number;
  return: number;
  returnPercent: number;
  contribution: number;
  contributionPercent: number;
}
```

### Backend API

#### Endpoint: GET /api/backtest

获取投资组合回测结果。

**Query Parameters:**
```
- currency: string (USD | RMB)
- startDate: string (ISO 8601 format)
- endDate: string (ISO 8601 format)
- benchmark: string (optional, e.g., "^GSPC", "000001.SS")
```

**Response:**
```json
{
  "period": {
    "startDate": "2023-01-01T00:00:00Z",
    "endDate": "2024-01-01T00:00:00Z"
  },
  "currency": "USD",
  "performance": [
    {
      "date": "2023-01-01T00:00:00Z",
      "portfolioValue": 100000,
      "portfolioReturn": 0,
      "benchmarkReturn": 0
    }
  ],
  "metrics": {
    "totalReturn": 15000,
    "totalReturnPercent": 15.0,
    "annualizedReturn": 14.5,
    "maxDrawdown": -8.5,
    "volatility": 12.3,
    "sharpeRatio": 1.18,
    "excessReturn": 3.2
  },
  "assetContributions": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "weight": 25.0,
      "return": 5000,
      "returnPercent": 20.0,
      "contribution": 1250,
      "contributionPercent": 8.33
    }
  ],
  "benchmark": {
    "symbol": "^GSPC",
    "name": "S&P 500",
    "totalReturn": 11.8
  }
}
```

### Backend Services

#### BacktestService

新服务，负责回测计算逻辑。

**Methods:**

```go
// RunBacktest performs portfolio backtest
func (s *BacktestService) RunBacktest(
    userID primitive.ObjectID,
    startDate time.Time,
    endDate time.Time,
    currency string,
    benchmark string,
) (*BacktestResponse, error)

// calculatePortfolioWeights calculates current portfolio weights
func (s *BacktestService) calculatePortfolioWeights(
    holdings []Holding,
) map[string]float64

// calculateBacktestPerformance calculates daily portfolio values
func (s *BacktestService) calculateBacktestPerformance(
    weights map[string]float64,
    historicalPrices map[string][]HistoricalPrice,
    startDate time.Time,
    endDate time.Time,
    currency string,
) ([]BacktestDataPoint, error)

// calculateBacktestMetrics calculates performance metrics
func (s *BacktestService) calculateBacktestMetrics(
    dataPoints []BacktestDataPoint,
    startDate time.Time,
    endDate time.Time,
) (*BacktestMetrics, error)

// calculateAssetContributions calculates each asset's contribution
func (s *BacktestService) calculateAssetContributions(
    weights map[string]float64,
    historicalPrices map[string][]HistoricalPrice,
    startDate time.Time,
    endDate time.Time,
    currency string,
) ([]AssetContribution, error)

// getBenchmarkData fetches and processes benchmark data
func (s *BacktestService) getBenchmarkData(
    benchmark string,
    startDate time.Time,
    endDate time.Time,
) ([]BacktestDataPoint, error)
```

## Data Models

### Backend Models

```go
// BacktestResponse represents the complete backtest result
type BacktestResponse struct {
    Period             BacktestPeriod        `json:"period"`
    Currency           string                `json:"currency"`
    Performance        []BacktestDataPoint   `json:"performance"`
    Metrics            BacktestMetrics       `json:"metrics"`
    AssetContributions []AssetContribution   `json:"assetContributions"`
    Benchmark          *BenchmarkInfo        `json:"benchmark,omitempty"`
}

// BacktestPeriod represents the backtest time period
type BacktestPeriod struct {
    StartDate time.Time `json:"startDate"`
    EndDate   time.Time `json:"endDate"`
}

// BacktestDataPoint represents a single data point in the backtest
type BacktestDataPoint struct {
    Date            time.Time `json:"date"`
    PortfolioValue  float64   `json:"portfolioValue"`
    PortfolioReturn float64   `json:"portfolioReturn"`
    BenchmarkReturn float64   `json:"benchmarkReturn,omitempty"`
}

// BacktestMetrics represents calculated performance metrics
type BacktestMetrics struct {
    TotalReturn       float64 `json:"totalReturn"`
    TotalReturnPercent float64 `json:"totalReturnPercent"`
    AnnualizedReturn  float64 `json:"annualizedReturn"`
    MaxDrawdown       float64 `json:"maxDrawdown"`
    Volatility        float64 `json:"volatility"`
    SharpeRatio       float64 `json:"sharpeRatio"`
    ExcessReturn      float64 `json:"excessReturn,omitempty"`
}

// AssetContribution represents an asset's contribution to portfolio return
type AssetContribution struct {
    Symbol              string  `json:"symbol"`
    Name                string  `json:"name"`
    Weight              float64 `json:"weight"`
    Return              float64 `json:"return"`
    ReturnPercent       float64 `json:"returnPercent"`
    Contribution        float64 `json:"contribution"`
    ContributionPercent float64 `json:"contributionPercent"`
}

// BenchmarkInfo represents benchmark information
type BenchmarkInfo struct {
    Symbol      string  `json:"symbol"`
    Name        string  `json:"name"`
    TotalReturn float64 `json:"totalReturn"`
}
```

### Frontend Types

```typescript
// API response types (matching backend)
export interface BacktestResponse {
  period: BacktestPeriod;
  currency: string;
  performance: BacktestDataPoint[];
  metrics: BacktestMetrics;
  assetContributions: AssetContribution[];
  benchmark?: BenchmarkInfo;
}

export interface BacktestPeriod {
  startDate: string;
  endDate: string;
}

export interface BacktestDataPoint {
  date: string;
  portfolioValue: number;
  portfolioReturn: number;
  benchmarkReturn?: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  excessReturn?: number;
}

export interface AssetContribution {
  symbol: string;
  name: string;
  weight: number;
  return: number;
  returnPercent: number;
  contribution: number;
  contributionPercent: number;
}

export interface BenchmarkInfo {
  symbol: string;
  name: string;
  totalReturn: number;
}
```

## Error Handling

### Frontend Error Handling

1. **日期验证错误**
   - 开始日期晚于结束日期
   - 结束日期在未来
   - 时间跨度过短（少于1个月）或过长（超过10年）
   - 显示友好的错误提示

2. **API 错误**
   - 网络错误：显示重试按钮
   - 数据不足：提示用户某些资产缺少历史数据
   - 服务器错误：显示错误信息和支持联系方式

3. **数据缺失**
   - 某些资产没有足够的历史数据
   - 显示警告，说明哪些资产被排除
   - 继续显示可用数据的回测结果

### Backend Error Handling

1. **参数验证**
   - 验证日期格式和范围
   - 验证货币类型
   - 返回 400 Bad Request 和详细错误信息

2. **数据获取失败**
   - 历史价格数据不可用
   - 记录警告日志
   - 跳过该资产或返回部分结果

3. **计算错误**
   - 除零错误（处理空持仓情况）
   - 数据不足（时间段内没有交易数据）
   - 返回 500 Internal Server Error

## Testing Strategy

### Frontend Testing

1. **单元测试**
   - 日期验证逻辑
   - 数据格式化函数
   - 指标计算辅助函数

2. **组件测试**
   - BacktestControls 交互测试
   - BacktestChart 渲染测试
   - BacktestMetrics 显示测试

3. **集成测试**
   - 完整的回测流程测试
   - API 调用和数据处理
   - 错误处理场景

### Backend Testing

1. **单元测试**
   - 权重计算函数
   - 绩效指标计算函数
   - 资产贡献度计算函数
   - 年化收益率计算
   - 波动率计算
   - 夏普比率计算

2. **集成测试**
   - 完整的回测 API 测试
   - 与 StockAPIService 的集成
   - 与 CurrencyService 的集成
   - 基准对比功能测试

3. **性能测试**
   - 大量持仓的回测性能
   - 长时间跨度的回测性能
   - 并发请求处理

## Implementation Notes

### 关键算法

#### 1. 投资组合权重计算

基于当前持仓的市值计算每个资产的权重：

```
weight[asset] = currentValue[asset] / totalPortfolioValue
```

#### 2. 历史组合价值计算

对于每个历史日期，使用当前权重和历史价格计算组合价值：

```
portfolioValue[date] = Σ(weight[asset] * historicalPrice[asset][date] * totalPortfolioValue)
```

注意：需要处理货币转换和缺失数据。

#### 3. 年化收益率计算

```
annualizedReturn = ((finalValue / initialValue) ^ (365 / days)) - 1
```

#### 4. 波动率计算

计算日收益率的标准差，然后年化：

```
dailyReturns = [(value[i] - value[i-1]) / value[i-1] for each day]
volatility = std(dailyReturns) * sqrt(252)
```

#### 5. 夏普比率计算

```
sharpeRatio = (annualizedReturn - riskFreeRate) / volatility
```

使用 2% 作为无风险利率。

#### 6. 资产贡献度计算

每个资产的贡献 = 资产权重 × 资产收益率：

```
contribution[asset] = weight[asset] * return[asset]
```

### 性能优化

1. **批量获取历史数据**
   - 一次性获取所有资产的历史数据
   - 使用 goroutines 并行获取

2. **缓存历史数据**
   - 历史价格数据不会改变，可以缓存
   - 使用 Redis 或内存缓存

3. **前端数据采样**
   - 对于长时间跨度，前端可以对数据点进行采样显示
   - 保持图表性能

### UI/UX 考虑

1. **日期选择器**
   - 使用日历组件方便选择
   - 提供快捷选项（1年、3年、5年、最大）

2. **加载状态**
   - 显示进度指示器
   - 估算计算时间

3. **响应式设计**
   - 移动端优化布局
   - 图表自适应屏幕大小

4. **数据导出**
   - 允许导出回测结果为 CSV
   - 允许导出图表为图片

## Integration Points

### 与现有系统的集成

1. **AnalyticsService**
   - 复用 `GetUserHoldings` 获取当前持仓
   - 复用 `CalculateMaxDrawdown` 计算最大回撤

2. **StockAPIService**
   - 使用 `GetHistoricalData` 获取历史价格
   - 需要确保支持自定义日期范围

3. **CurrencyService**
   - 使用 `ConvertAmount` 进行货币转换
   - 需要历史汇率数据（如果不可用，使用当前汇率）

4. **路由和导航**
   - 在 DashboardLayout 中添加 "Backtest" 导航链接
   - 路由路径：`/backtest`

5. **权限控制**
   - 使用现有的 AuthMiddleware
   - 确保只有登录用户可以访问

## Deployment Considerations

1. **数据库**
   - 不需要新的数据库表
   - 所有计算都是实时的

2. **API 限制**
   - 考虑对外部 API 调用的频率限制
   - 实现请求队列和重试机制

3. **计算资源**
   - 回测计算可能耗时较长
   - 考虑实现异步处理和结果缓存

4. **监控**
   - 添加回测请求的日志记录
   - 监控 API 响应时间和错误率

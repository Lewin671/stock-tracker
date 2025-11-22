# 设计文档

## 概述

现金持仓功能将通过复用现有的投资组合和交易系统来实现。核心思路是将现金视为一种特殊的资产类型，使用特殊的 symbol 标识（CASH_USD、CASH_RMB），价格固定为 1.0，不需要从外部 API 获取价格。用户可以像添加股票交易一样添加现金交易，系统会自动处理现金的特殊逻辑。

## 架构

### 系统组件

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (React)                         │
├─────────────────────────────────────────────────────────────┤
│  TransactionDialog  │  HoldingsTable  │  DashboardPage      │
│  (添加现金交易)      │  (显示现金持仓)  │  (展示现金资产)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端层 (Go/Gin)                          │
├─────────────────────────────────────────────────────────────┤
│  PortfolioHandler   │  PortfolioService  │  StockAPIService │
│  (处理交易请求)      │  (业务逻辑)         │  (价格查询)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (MongoDB)                         │
├─────────────────────────────────────────────────────────────┤
│  portfolios 集合    │  transactions 集合                      │
│  (现金持仓记录)      │  (现金交易记录)                         │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

1. **添加现金交易**
   - 用户在 TransactionDialog 中选择 CASH_USD 或 CASH_RMB
   - 前端自动设置 Asset Class 为 "Cash and Equivalents"
   - 后端创建 Portfolio 和 Transaction 记录
   - 系统跳过价格查询，使用固定价格 1.0

2. **查看现金持仓**
   - 后端计算持仓时识别现金 symbol
   - 跳过外部 API 调用，使用固定价格
   - 盈亏计算为 0
   - 前端展示时使用友好的名称（如"现金 - 美元"）

3. **仪表板展示**
   - 现金持仓计入总资产价值
   - 按资产类别分组时归类到 "Cash and Equivalents"
   - 按货币分组时分别展示 USD 和 RMB 现金

## 组件和接口

### 1. 后端修改

#### 1.1 StockAPIService 增强

在 `server/services/stock_api_service.go` 中添加现金识别逻辑：

```go
// IsCashSymbol checks if a symbol represents cash
func (s *StockAPIService) IsCashSymbol(symbol string) bool {
    symbol = strings.ToUpper(strings.TrimSpace(symbol))
    return symbol == "CASH_USD" || symbol == "CASH_RMB"
}

// GetStockInfo 修改以处理现金
func (s *StockAPIService) GetStockInfo(symbol string) (*StockInfo, error) {
    symbol = strings.ToUpper(strings.TrimSpace(symbol))
    
    // 检查是否为现金
    if s.IsCashSymbol(symbol) {
        return s.getCashInfo(symbol), nil
    }
    
    // 原有的股票价格查询逻辑...
}

// getCashInfo returns fixed info for cash holdings
func (s *StockAPIService) getCashInfo(symbol string) *StockInfo {
    var currency string
    var name string
    
    if symbol == "CASH_USD" {
        currency = "USD"
        name = "Cash - USD"
    } else {
        currency = "CNY"  // RMB 在 Yahoo Finance 中使用 CNY
        name = "Cash - RMB"
    }
    
    return &StockInfo{
        Symbol:       symbol,
        Name:         name,
        CurrentPrice: 1.0,
        Currency:     currency,
    }
}
```

#### 1.2 PortfolioService 修改

在 `server/services/portfolio_service.go` 中修改持仓计算逻辑：

```go
// calculateHolding 修改以处理现金
func (s *PortfolioService) calculateHolding(symbol string, transactions []models.Transaction, targetCurrency string) (*Holding, error) {
    // 计算总份额和成本基础的逻辑保持不变...
    
    // 获取当前价格（现金会返回固定的 1.0）
    stockInfo, err := s.stockService.GetStockInfo(symbol)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch stock info for %s: %w", symbol, err)
    }
    
    // 货币转换逻辑保持不变...
    
    // 计算当前价值
    currentValue := convertedCurrentPrice * totalShares
    
    // 对于现金，盈亏始终为 0
    gainLoss := currentValue - convertedCostBasis
    if s.stockService.IsCashSymbol(symbol) {
        gainLoss = 0
    }
    
    gainLossPercent := 0.0
    if convertedCostBasis > 0 && !s.stockService.IsCashSymbol(symbol) {
        gainLossPercent = (gainLoss / convertedCostBasis) * 100
    }
    
    return &Holding{
        Symbol:          symbol,
        Shares:          totalShares,
        CostBasis:       convertedCostBasis,
        CurrentPrice:    convertedCurrentPrice,
        CurrentValue:    currentValue,
        GainLoss:        gainLoss,
        GainLossPercent: gainLossPercent,
        Currency:        targetCurrency,
    }, nil
}
```

#### 1.3 Portfolio 模型更新

在 `server/models/portfolio.go` 中，确保 Asset Class 验证包含现金：

```go
// UpdatePortfolioMetadataRequest 已经包含 'Cash and Equivalents'
// 无需修改，但需要确保验证逻辑正确
```

### 2. 前端修改

#### 2.1 TransactionDialog 增强

在 `web/src/components/TransactionDialog.tsx` 中添加现金选项：

```typescript
// 添加现金类型选择
const CASH_SYMBOLS = [
  { value: 'CASH_USD', label: '现金 - 美元 (USD)', currency: 'USD' },
  { value: 'CASH_RMB', label: '现金 - 人民币 (RMB)', currency: 'RMB' }
];

// 在表单中添加现金类型选择器
// 当用户选择现金类型时：
// 1. 自动设置 symbol 为 CASH_USD 或 CASH_RMB
// 2. 自动设置对应的 currency
// 3. 将 "Shares" 标签改为 "Amount"
// 4. 将 "Price" 字段隐藏或固定为 1.0
// 5. 将 "Action" 标签改为 "Deposit/Withdraw"
```

#### 2.2 HoldingsTable 显示优化

在 `web/src/components/HoldingsTable.tsx` 中添加现金识别：

```typescript
// 添加现金识别函数
const isCashSymbol = (symbol: string): boolean => {
  return symbol === 'CASH_USD' || symbol === 'CASH_RMB';
};

// 添加友好名称映射
const getCashDisplayName = (symbol: string): string => {
  if (symbol === 'CASH_USD') return '现金 - 美元';
  if (symbol === 'CASH_RMB') return '现金 - 人民币';
  return symbol;
};

// 在渲染时：
// 1. 对现金持仓显示友好名称
// 2. 不显示价格变动信息
// 3. 盈亏显示为 0 或 "-"
// 4. 添加现金图标
```

#### 2.3 DashboardPage 集成

在 `web/src/pages/DashboardPage.tsx` 中：

```typescript
// 现金持仓会自动包含在：
// 1. 总资产价值计算中
// 2. 资产配置饼图中（作为 "Cash and Equivalents"）
// 3. 按资产类别分组时的展示中
// 4. 按货币分组时的展示中

// 无需特殊处理，因为后端已经返回正确的数据
```

#### 2.4 新增 CashTransactionDialog 组件

创建专门的现金交易对话框 `web/src/components/CashTransactionDialog.tsx`：

```typescript
interface CashTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cashType?: 'USD' | 'RMB';
}

// 简化的表单，只包含：
// - 现金类型选择（USD/RMB）
// - 操作类型（存入/取出）
// - 金额
// - 日期
// - 备注（可选）

// 自动处理：
// - symbol 设置为 CASH_USD 或 CASH_RMB
// - price 固定为 1.0
// - shares 等于金额
// - currency 根据现金类型自动设置
// - 自动设置 Asset Class 为 "Cash and Equivalents"
```

### 3. API 接口

#### 3.1 现有接口复用

现金功能完全复用现有的 Portfolio API：

- `POST /api/portfolio/transactions` - 添加现金交易
- `PUT /api/portfolio/transactions/:id` - 更新现金交易
- `DELETE /api/portfolio/transactions/:id` - 删除现金交易
- `GET /api/portfolio/holdings` - 获取持仓（包含现金）
- `GET /api/portfolio/transactions/:symbol` - 获取现金交易历史

#### 3.2 请求示例

添加现金存入：
```json
{
  "symbol": "CASH_USD",
  "action": "buy",
  "shares": 1000.00,
  "price": 1.0,
  "currency": "USD",
  "fees": 0,
  "date": "2024-01-15T00:00:00Z"
}
```

添加现金取出：
```json
{
  "symbol": "CASH_USD",
  "action": "sell",
  "shares": 500.00,
  "price": 1.0,
  "currency": "USD",
  "fees": 0,
  "date": "2024-01-20T00:00:00Z"
}
```

## 数据模型

### Portfolio 文档（MongoDB）

```json
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."),
  "symbol": "CASH_USD",
  "asset_style_id": null,
  "asset_class": "Cash and Equivalents",
  "created_at": ISODate("2024-01-15T00:00:00Z"),
  "updated_at": ISODate("2024-01-15T00:00:00Z")
}
```

### Transaction 文档（MongoDB）

```json
{
  "_id": ObjectId("..."),
  "portfolio_id": ObjectId("..."),
  "user_id": ObjectId("..."),
  "symbol": "CASH_USD",
  "action": "buy",
  "shares": 1000.00,
  "price": 1.0,
  "currency": "USD",
  "fees": 0,
  "date": ISODate("2024-01-15T00:00:00Z"),
  "created_at": ISODate("2024-01-15T00:00:00Z"),
  "updated_at": ISODate("2024-01-15T00:00:00Z")
}
```

## 错误处理

### 1. 后端错误处理

- **现金余额不足**：当用户尝试取出超过当前余额的现金时，返回 `INSUFFICIENT_SHARES` 错误
- **无效的现金类型**：如果 symbol 不是 CASH_USD 或 CASH_RMB，按普通股票处理
- **价格验证**：对于现金交易，如果 price 不是 1.0，自动修正为 1.0

### 2. 前端错误处理

- **余额不足提示**：显示友好的错误消息"现金余额不足"
- **表单验证**：确保金额为正数，日期不在未来
- **网络错误**：使用 Toast 提示用户操作失败

### 3. 边界情况

- **零余额现金持仓**：不在持仓列表中显示
- **负余额**：通过交易验证防止出现负余额
- **货币转换失败**：使用最近一次成功的汇率，并提示用户

## 测试策略

### 1. 单元测试

#### 后端测试（Go）

```go
// server/services/stock_api_service_test.go
func TestIsCashSymbol(t *testing.T) {
    // 测试现金 symbol 识别
}

func TestGetCashInfo(t *testing.T) {
    // 测试现金信息返回
}

// server/services/portfolio_service_test.go
func TestCalculateHoldingForCash(t *testing.T) {
    // 测试现金持仓计算
    // 验证价格为 1.0
    // 验证盈亏为 0
}

func TestAddCashTransaction(t *testing.T) {
    // 测试添加现金交易
}

func TestCashInsufficientBalance(t *testing.T) {
    // 测试现金余额不足的情况
}
```

#### 前端测试（TypeScript/Jest）

```typescript
// web/src/components/__tests__/CashTransactionDialog.test.tsx
describe('CashTransactionDialog', () => {
  test('renders cash type selector', () => {
    // 测试现金类型选择器渲染
  });
  
  test('auto-sets currency based on cash type', () => {
    // 测试自动设置货币
  });
  
  test('validates amount is positive', () => {
    // 测试金额验证
  });
});

// web/src/components/__tests__/HoldingsTable.test.tsx
describe('HoldingsTable with cash', () => {
  test('displays cash holdings with friendly names', () => {
    // 测试现金持仓显示
  });
  
  test('shows zero gain/loss for cash', () => {
    // 测试现金盈亏显示为 0
  });
});
```

### 2. 集成测试

```go
// server/integration_test.go
func TestCashHoldingsIntegration(t *testing.T) {
    // 1. 创建用户
    // 2. 添加现金存入交易
    // 3. 验证持仓计算正确
    // 4. 添加现金取出交易
    // 5. 验证余额更新正确
    // 6. 验证仪表板数据包含现金
}
```

### 3. 端到端测试

使用 Cypress 或 Playwright 测试完整流程：

1. 用户登录
2. 导航到 Holdings 页面
3. 点击"Add Transaction"
4. 选择现金类型
5. 输入金额和日期
6. 提交表单
7. 验证现金持仓出现在列表中
8. 验证仪表板显示现金资产

### 4. 性能测试

- **大量现金交易**：测试系统处理数百条现金交易的性能
- **混合持仓查询**：测试同时查询股票和现金持仓的性能
- **并发操作**：测试多个用户同时添加现金交易

## 实现注意事项

### 1. 向后兼容性

- 现有的股票持仓和交易不受影响
- 现有的 API 接口保持不变
- 数据库 schema 无需迁移

### 2. 性能优化

- 现金价格查询跳过外部 API 调用，提高响应速度
- 现金持仓计算简化，减少计算开销
- 缓存策略保持不变

### 3. 用户体验

- 提供专门的现金交易入口，简化操作流程
- 使用友好的名称和图标，清晰区分现金和股票
- 在交易历史中使用"存入"/"取出"而不是"买入"/"卖出"

### 4. 安全性

- 现金交易使用相同的认证和授权机制
- 防止负余额通过交易验证
- 审计日志记录所有现金操作

## 部署计划

### 阶段 1：后端实现
1. 修改 StockAPIService 添加现金识别
2. 修改 PortfolioService 处理现金持仓计算
3. 添加单元测试
4. 部署到测试环境

### 阶段 2：前端实现
1. 创建 CashTransactionDialog 组件
2. 修改 HoldingsTable 显示现金持仓
3. 修改 TransactionDialog 支持现金选择
4. 添加前端测试
5. 部署到测试环境

### 阶段 3：集成测试
1. 运行端到端测试
2. 性能测试
3. 用户验收测试

### 阶段 4：生产部署
1. 代码审查
2. 部署到生产环境
3. 监控和日志
4. 用户反馈收集

## 未来扩展

### 可能的增强功能

1. **现金转账**：支持不同现金账户之间的转账
2. **利息记录**：记录现金账户的利息收入
3. **现金流分析**：提供现金流入流出的可视化分析
4. **多货币现金**：支持更多货币类型（EUR、JPY 等）
5. **现金预算**：设置现金持有目标和预算提醒

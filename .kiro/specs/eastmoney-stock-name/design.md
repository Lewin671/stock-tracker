# Design Document

## Overview

本设计文档描述如何在现有的 StockAPIService 中集成东方财富 API 来获取中国股票的准确中文名称。设计采用混合数据源策略：对于中国股票，从东方财富获取名称，从 Yahoo Finance 获取价格和其他数据；对于非中国股票，继续完全使用 Yahoo Finance。

核心设计原则：
- 最小化对现有代码的影响
- 保持向后兼容性
- 优雅降级（东方财富 API 失败时回退到 Yahoo Finance）
- 保持现有的缓存和性能特性

## Architecture

### 数据流

```
GetStockInfo(symbol)
    ↓
检查缓存
    ↓ (cache miss)
判断股票类型
    ↓
    ├─→ 中国股票 (.SS/.SZ)
    │       ↓
    │   并发调用:
    │   ├─→ Yahoo Finance (价格、货币等)
    │   └─→ 东方财富 (股票名称)
    │       ↓
    │   合并结果
    │       ↓
    │   如果东方财富失败，使用 Yahoo 名称
    │
    └─→ 非中国股票
            ↓
        Yahoo Finance (所有数据)
            ↓
        返回结果并缓存
```

### API 端点

**东方财富 API:**
- 端点: `http://push2.eastmoney.com/api/qt/stock/get`
- 参数:
  - `secid`: 市场代码.股票代码（例如：1.600000 表示上海600000，0.000001 表示深圳000001）
  - `fields`: 请求的字段，我们需要 `f58` (股票名称)
- 示例: `http://push2.eastmoney.com/api/qt/stock/get?secid=1.600000&fields=f58`

**市场代码映射:**
- .SS (上海) → 市场代码 1
- .SZ (深圳) → 市场代码 0

## Components and Interfaces

### 新增结构体

```go
// eastmoneyResponse 表示东方财富 API 的响应结构
type eastmoneyResponse struct {
    Data struct {
        F58 string `json:"f58"` // 股票名称
    } `json:"data"`
    RC   int    `json:"rc"`   // 返回码，0 表示成功
    RT   int    `json:"rt"`   // 响应类型
    Msg  string `json:"msg"`  // 消息
}
```

### 新增方法

```go
// fetchStockNameFromEastmoney 从东方财富 API 获取中国股票的名称
// 参数: symbol - 股票代码（例如：600000.SS）
// 返回: 股票名称和错误（如果有）
func (s *StockAPIService) fetchStockNameFromEastmoney(symbol string) (string, error)

// convertToEastmoneySecID 将 Yahoo Finance 格式的股票代码转换为东方财富的 secid 格式
// 参数: symbol - Yahoo Finance 格式的股票代码（例如：600000.SS）
// 返回: 东方财富 secid 格式（例如：1.600000）和错误（如果有）
func (s *StockAPIService) convertToEastmoneySecID(symbol string) (string, error)
```

### 修改的方法

```go
// GetStockInfo 需要修改以支持混合数据源
// 对于中国股票：
// 1. 并发调用 Yahoo Finance 和东方财富 API
// 2. 等待两个调用完成
// 3. 使用 Yahoo Finance 的价格数据 + 东方财富的名称
// 4. 如果东方财富失败，回退到 Yahoo Finance 的名称
func (s *StockAPIService) GetStockInfo(symbol string) (*StockInfo, error)
```

## Data Models

现有的 `StockInfo` 结构体无需修改，继续使用：

```go
type StockInfo struct {
    Symbol       string  `json:"symbol"`
    Name         string  `json:"name"`         // 对于中国股票，这将是东方财富的中文名称
    CurrentPrice float64 `json:"currentPrice"` // 继续从 Yahoo Finance 获取
    Currency     string  `json:"currency"`     // 继续从 Yahoo Finance 获取
    Sector       string  `json:"sector,omitempty"`
}
```

## Error Handling

### 错误场景和处理策略

1. **东方财富 API 不可用**
   - 策略：记录警告日志，回退到 Yahoo Finance 的名称
   - 不影响整体请求的成功

2. **东方财富 API 返回空名称**
   - 策略：记录警告日志，回退到 Yahoo Finance 的名称
   - 不影响整体请求的成功

3. **Yahoo Finance API 失败**
   - 策略：返回现有的错误（ErrStockNotFound 或 ErrExternalAPI）
   - 这是关键错误，因为价格数据是必需的

4. **两个 API 都失败**
   - 策略：返回 Yahoo Finance 的错误
   - 因为价格数据是核心数据

5. **股票代码格式转换失败**
   - 策略：记录警告日志，回退到 Yahoo Finance 的名称
   - 不影响整体请求的成功

### 日志记录

所有东方财富 API 相关的操作都应该有详细的日志：
- 请求开始：记录股票代码和转换后的 secid
- 请求完成：记录响应时间和状态
- 请求失败：记录错误详情
- 回退操作：记录回退原因

## Testing Strategy

### 单元测试

1. **convertToEastmoneySecID 测试**
   - 测试上海股票代码转换（600000.SS → 1.600000）
   - 测试深圳股票代码转换（000001.SZ → 0.000001）
   - 测试无效格式的处理

2. **fetchStockNameFromEastmoney 测试**
   - 测试成功获取股票名称
   - 测试 API 返回错误的处理
   - 测试网络超时的处理
   - 测试空响应的处理

3. **GetStockInfo 集成测试**
   - 测试中国股票的混合数据源
   - 测试东方财富失败时的回退
   - 测试非中国股票不受影响
   - 测试缓存机制仍然有效

### 手动测试场景

1. 测试上海股票：600000.SS（浦发银行）
2. 测试深圳股票：000001.SZ（平安银行）
3. 测试美国股票：AAPL（确保不受影响）
4. 测试缓存：连续两次请求同一中国股票，第二次应该从缓存返回

## Implementation Notes

### 并发调用实现

使用 Go 的 goroutine 和 channel 来并发调用两个 API：

```go
type apiResult struct {
    yahooInfo *StockInfo
    eastmoneyName string
    yahooErr error
    eastmoneyErr error
}

// 创建 channels
yahooChan := make(chan struct{yahooInfo *StockInfo; err error})
eastmoneyChan := make(chan struct{name string; err error})

// 并发调用
go func() {
    info, err := s.fetchFromYahooChart(...)
    yahooChan <- struct{...}{info, err}
}()

go func() {
    name, err := s.fetchStockNameFromEastmoney(symbol)
    eastmoneyChan <- struct{...}{name, err}
}()

// 等待结果
yahooResult := <-yahooChan
eastmoneyResult := <-eastmoneyChan
```

### 超时控制

东方财富 API 调用应该有独立的超时控制，建议设置为 5-10 秒，以避免影响整体响应时间。

### 缓存策略

缓存的 key 仍然是股票代码，缓存的值是完整的 StockInfo（包含东方财富的名称）。这样缓存命中时不需要调用任何外部 API。

## Performance Considerations

1. **并发调用**: 通过并发调用两个 API，总响应时间约等于较慢的那个 API 的响应时间，而不是两者之和
2. **缓存**: 缓存机制保持不变，缓存命中时性能不受影响
3. **优雅降级**: 东方财富 API 失败不会阻塞请求，只是名称可能不是中文
4. **超时设置**: 合理的超时设置确保不会因为东方财富 API 慢而拖累整体性能

## Backward Compatibility

- API 接口保持不变
- 返回的数据结构保持不变
- 非中国股票的行为完全不变
- 缓存机制保持不变
- 错误处理保持不变（只是增加了更多日志）

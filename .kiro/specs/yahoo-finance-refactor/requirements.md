# Requirements Document

## Introduction

本需求文档描述了将股票投资组合追踪系统的数据源统一迁移到 Yahoo Finance API 的重构工作。当前系统使用 Yahoo Finance 获取美股数据，使用 Tushare API 获取中国股票数据。重构后，所有股票数据（包括美股和中国股票）都将从 Yahoo Finance 获取，简化系统架构并减少外部依赖。

## Glossary

- **Stock_API_Service**: 负责从外部 API 获取股票数据的服务组件
- **Yahoo_Finance_API**: Yahoo Finance 提供的股票数据 API，支持全球多个市场的股票数据
- **Tushare_API**: 中国股票数据 API（将被移除）
- **Chart_Endpoint**: Yahoo Finance 的 /v8/finance/chart 端点，用于获取股票价格和历史数据
- **Stock_Symbol**: 股票代码标识符（如 AAPL 表示苹果公司，600000.SS 表示浦发银行）
- **Historical_Data**: 股票的历史价格数据，包含日期和价格信息
- **Cache**: 内存缓存机制，用于减少外部 API 调用频率

## Requirements

### Requirement 1: 统一数据源到 Yahoo Finance

**User Story:** 作为系统维护者，我希望所有股票数据都从 Yahoo Finance 获取，这样可以简化系统架构并减少外部 API 依赖。

#### Acceptance Criteria

1. WHEN Stock_API_Service 需要获取任何股票数据时，THE Stock_API_Service SHALL 仅使用 Yahoo_Finance_API 的 Chart_Endpoint
2. THE Stock_API_Service SHALL 移除所有 Tushare_API 相关的代码和配置
3. THE Stock_API_Service SHALL 移除 TUSHARE_TOKEN 环境变量的依赖
4. WHEN 获取美股数据时，THE Stock_API_Service SHALL 使用 Yahoo_Finance_API 的 Chart_Endpoint
5. WHEN 获取中国股票数据时，THE Stock_API_Service SHALL 使用 Yahoo_Finance_API 的 Chart_Endpoint 并使用 .SS 或 .SZ 后缀

### Requirement 2: 实现统一的股票信息获取

**User Story:** 作为开发者，我希望有一个统一的方法来获取所有市场的股票信息，无论是美股还是中国股票。

#### Acceptance Criteria

1. WHEN 用户请求股票信息时，THE Stock_API_Service SHALL 调用 Yahoo_Finance_API 的 Chart_Endpoint 获取元数据
2. THE Stock_API_Service SHALL 从响应的 meta 字段中提取 symbol、currency、regularMarketPrice 和 longName
3. WHEN Yahoo_Finance_API 返回成功响应时，THE Stock_API_Service SHALL 返回包含 symbol、name、currentPrice 和 currency 的 StockInfo 结构
4. WHEN Yahoo_Finance_API 返回错误或空结果时，THE Stock_API_Service SHALL 返回 ErrStockNotFound 错误
5. THE Stock_API_Service SHALL 对所有股票使用相同的数据获取逻辑，不区分市场类型

### Requirement 3: 实现统一的历史数据获取

**User Story:** 作为用户，我希望能够获取任何股票的历史价格数据，用于分析投资表现。

#### Acceptance Criteria

1. WHEN 用户请求历史数据并指定时间周期参数时，THE Stock_API_Service SHALL 计算对应的起始和结束时间戳
2. THE Stock_API_Service SHALL 调用 Yahoo_Finance_API 的 Chart_Endpoint 并传递 period1、period2 和 interval 参数
3. THE Stock_API_Service SHALL 从响应中提取 timestamp 数组和 close 价格数组
4. THE Stock_API_Service SHALL 将时间戳转换为 time.Time 类型并与对应的价格组合成 HistoricalPrice 数组
5. THE Stock_API_Service SHALL 过滤掉价格为 0 或 null 的数据点
6. WHEN 历史数据获取成功时，THE Stock_API_Service SHALL 返回按时间升序排列的 HistoricalPrice 数组

### Requirement 4: 保持缓存机制

**User Story:** 作为系统管理员，我希望系统继续使用缓存机制来减少外部 API 调用，降低延迟并避免速率限制。

#### Acceptance Criteria

1. THE Stock_API_Service SHALL 在调用 Yahoo_Finance_API 之前检查 Cache 中是否存在未过期的数据
2. WHEN Cache 中存在未过期的股票信息时，THE Stock_API_Service SHALL 直接返回缓存数据而不调用外部 API
3. WHEN 从 Yahoo_Finance_API 成功获取数据后，THE Stock_API_Service SHALL 将数据存储到 Cache 并设置 5 分钟过期时间
4. THE Stock_API_Service SHALL 为股票信息和历史数据分别维护独立的 Cache
5. THE Stock_API_Service SHALL 定期清理过期的 Cache 条目以释放内存

### Requirement 5: 向后兼容性

**User Story:** 作为系统用户，我希望重构后系统的 API 接口保持不变，现有功能不受影响。

#### Acceptance Criteria

1. THE Stock_API_Service SHALL 保持 GetStockInfo 方法的函数签名不变
2. THE Stock_API_Service SHALL 保持 GetHistoricalData 方法的函数签名不变
3. THE Stock_API_Service SHALL 保持 StockInfo 和 HistoricalPrice 数据结构不变
4. WHEN 前端或其他服务调用 Stock_API_Service 时，THE Stock_API_Service SHALL 返回与之前相同格式的数据
5. THE Stock_API_Service SHALL 继续支持相同的时间周期参数（1M、3M、6M、1Y）

### Requirement 6: 错误处理和日志

**User Story:** 作为开发者，我希望系统能够正确处理 API 错误并提供清晰的日志信息，便于调试和监控。

#### Acceptance Criteria

1. WHEN Yahoo_Finance_API 返回非 200 状态码时，THE Stock_API_Service SHALL 返回 ErrExternalAPI 错误并包含状态码信息
2. WHEN Yahoo_Finance_API 响应解析失败时，THE Stock_API_Service SHALL 返回包含详细错误信息的错误
3. WHEN 网络请求超时时，THE Stock_API_Service SHALL 返回 ErrExternalAPI 错误
4. THE Stock_API_Service SHALL 为所有外部 API 调用设置 30 秒超时时间
5. THE Stock_API_Service SHALL 在发生错误时记录足够的上下文信息用于调试

### Requirement 7: 代码清理

**User Story:** 作为代码维护者，我希望移除所有不再使用的代码，保持代码库整洁。

#### Acceptance Criteria

1. THE Stock_API_Service SHALL 删除 GetStockInfoChina 方法
2. THE Stock_API_Service SHALL 删除 GetHistoricalDataChina 方法
3. THE Stock_API_Service SHALL 删除 GetStockInfoUS 方法
4. THE Stock_API_Service SHALL 删除 GetHistoricalDataUS 方法
5. THE Stock_API_Service SHALL 删除 callTushareAPI 方法和相关的 Tushare 请求/响应结构体
6. THE Stock_API_Service SHALL 删除 convertTushareSymbol 方法
7. THE Stock_API_Service SHALL 删除 tushareToken 字段
8. THE Stock_API_Service SHALL 更新 NewStockAPIService 构造函数，移除 Tushare token 初始化

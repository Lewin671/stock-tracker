# Requirements Document

## Introduction

本功能旨在改进中国股票名称的获取方式。当前系统从 Yahoo Finance 获取所有股票数据，但 Yahoo Finance 对中国股票的名称支持不佳（通常返回英文名称或拼音）。本需求要求为中国股票（.SS 和 .SZ 后缀）集成东方财富 API 来获取准确的中文股票名称，同时保持价格、历史数据等其他信息继续从 Yahoo Finance 获取。

## Glossary

- **StockAPIService**: 负责从外部 API 获取股票数据的服务层组件
- **Yahoo Finance API**: 当前使用的主要股票数据源，提供全球股票的价格和历史数据
- **东方财富 API (Eastmoney API)**: 中国金融数据提供商的 API，提供准确的中国股票中文名称
- **中国股票 (China Stock)**: 股票代码以 .SS（上海证券交易所）或 .SZ（深圳证券交易所）结尾的股票
- **Stock Symbol**: 股票代码，用于唯一标识一只股票

## Requirements

### Requirement 1

**User Story:** 作为投资组合管理系统的用户，我希望看到中国股票的准确中文名称，以便更容易识别和管理我的中国股票持仓

#### Acceptance Criteria

1. WHEN THE StockAPIService 检测到股票代码以 .SS 或 .SZ 结尾时，THE StockAPIService SHALL 从东方财富 API 获取该股票的中文名称
2. WHEN THE StockAPIService 从东方财富 API 获取股票名称时，THE StockAPIService SHALL 继续从 Yahoo Finance API 获取该股票的价格、货币和其他数据
3. WHEN 东方财富 API 调用失败或返回空名称时，THE StockAPIService SHALL 回退使用 Yahoo Finance API 返回的名称
4. WHEN THE StockAPIService 成功从东方财富 API 获取股票名称时，THE StockAPIService SHALL 将该名称与 Yahoo Finance 的其他数据合并返回给调用方

### Requirement 2

**User Story:** 作为系统开发者，我希望东方财富 API 的集成不影响现有的缓存机制和性能，以便保持系统的响应速度

#### Acceptance Criteria

1. WHEN THE StockAPIService 从东方财富 API 获取股票名称时，THE StockAPIService SHALL 使用与现有缓存机制相同的缓存策略
2. WHEN 缓存中存在有效的股票信息时，THE StockAPIService SHALL 直接返回缓存数据而不调用任何外部 API
3. WHEN THE StockAPIService 需要调用多个 API 时，THE StockAPIService SHALL 并发执行 API 调用以最小化总响应时间
4. THE StockAPIService SHALL 为东方财富 API 调用设置合理的超时时间（不超过 10 秒）

### Requirement 3

**User Story:** 作为系统维护者，我希望能够清晰地追踪东方财富 API 的调用情况，以便诊断问题和监控系统行为

#### Acceptance Criteria

1. WHEN THE StockAPIService 调用东方财富 API 时，THE StockAPIService SHALL 记录请求的 URL 和股票代码
2. WHEN 东方财富 API 返回响应时，THE StockAPIService SHALL 记录响应状态码和响应时间
3. WHEN 东方财富 API 调用失败时，THE StockAPIService SHALL 记录详细的错误信息和失败原因
4. WHEN THE StockAPIService 回退到 Yahoo Finance 名称时，THE StockAPIService SHALL 记录回退操作和原因

### Requirement 4

**User Story:** 作为系统开发者，我希望东方财富 API 的集成对非中国股票没有任何影响，以便确保现有功能的稳定性

#### Acceptance Criteria

1. WHEN THE StockAPIService 处理非中国股票（不以 .SS 或 .SZ 结尾）时，THE StockAPIService SHALL 完全使用 Yahoo Finance API 获取所有数据
2. WHEN THE StockAPIService 处理现金符号（CASH_USD 或 CASH_RMB）时，THE StockAPIService SHALL 继续返回固定的现金信息
3. THE StockAPIService SHALL 保持现有的 IsUSStock、IsChinaStock 和 IsCashSymbol 方法的行为不变
4. THE StockAPIService SHALL 保持现有的错误处理逻辑对非中国股票的行为不变

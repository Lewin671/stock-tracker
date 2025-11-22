# Requirements Document

## Introduction

本功能旨在改善用户体验，通过在界面中显示股票的完整名称而不仅仅是股票代码，使用户能够更直观地识别其持仓资产。系统将从 Yahoo Finance API 获取股票名称，并在持仓表格、图表和其他相关界面中展示。

## Glossary

- **Stock Symbol**: 股票代码，用于唯一标识一只股票的简短字符串（例如：AAPL, 600519.SS）
- **Stock Name**: 股票的完整名称或公司名称（例如：Apple Inc., 贵州茅台）
- **Holdings System**: 持仓系统，管理和显示用户投资组合中的股票持仓信息
- **Yahoo Finance API**: 外部数据源，提供股票价格和元数据信息
- **Frontend**: 前端系统，负责向用户展示界面和数据

## Requirements

### Requirement 1

**User Story:** 作为投资者，我希望在持仓表格中看到股票的完整名称，这样我可以更容易地识别我的投资而不需要记住股票代码

#### Acceptance Criteria

1. WHEN Holdings System 显示持仓列表时，THE Frontend SHALL 在股票代码旁边或替代位置显示股票的完整名称
2. WHEN 股票名称不可用时，THE Frontend SHALL 显示股票代码作为后备方案
3. THE Frontend SHALL 为股票代码和名称提供清晰的视觉层次，使两者都易于阅读
4. WHEN 用户查看持仓表格时，THE Frontend SHALL 在 2 秒内完成股票名称的加载和显示

### Requirement 2

**User Story:** 作为投资者，我希望系统能够自动获取并缓存股票名称，这样我不需要手动输入这些信息

#### Acceptance Criteria

1. WHEN Holdings System 请求股票信息时，THE Backend SHALL 从 Yahoo Finance API 获取股票名称
2. THE Backend SHALL 将股票名称与价格信息一起缓存，缓存时长至少 5 分钟
3. WHEN Yahoo Finance API 返回股票数据时，THE Backend SHALL 优先使用 longName，如果不可用则使用 shortName
4. WHEN API 调用失败时，THE Backend SHALL 返回包含股票代码但名称字段为空的响应

### Requirement 3

**User Story:** 作为投资者，我希望在所有相关界面中都能看到股票名称，这样我可以获得一致的用户体验

#### Acceptance Criteria

1. THE Frontend SHALL 在持仓表格（HoldingsTable）中显示股票名称
2. THE Frontend SHALL 在分组持仓视图（GroupedHoldingsView）中显示股票名称
3. THE Frontend SHALL 在交易对话框（TransactionDialog）中显示股票名称
4. THE Frontend SHALL 在观察列表（Watchlist）中显示股票名称
5. WHEN 显示股票信息时，THE Frontend SHALL 保持名称显示格式的一致性

### Requirement 4

**User Story:** 作为投资者，我希望系统能够正确处理不同市场的股票名称，这样我可以看到准确的中文或英文名称

#### Acceptance Criteria

1. WHEN 股票是中国市场股票（.SS 或 .SZ 后缀）时，THE Frontend SHALL 正确显示中文名称
2. WHEN 股票是美国市场股票时，THE Frontend SHALL 正确显示英文名称
3. THE Frontend SHALL 支持 UTF-8 编码以正确显示多语言字符
4. WHEN 显示现金持仓时，THE Frontend SHALL 继续使用现有的双语显示格式（例如："Cash - USD (现金 - 美元)"）

### Requirement 5

**User Story:** 作为投资者，我希望能够通过股票名称或代码进行搜索，这样我可以快速找到我想要的股票

#### Acceptance Criteria

1. WHEN 用户在搜索框中输入文本时，THE Frontend SHALL 同时匹配股票代码和股票名称
2. THE Frontend SHALL 在搜索结果中同时显示股票代码和名称
3. WHEN 显示搜索建议时，THE Frontend SHALL 在 500 毫秒内响应用户输入

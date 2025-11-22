# Implementation Plan

- [x] 1. 添加东方财富 API 响应结构体和辅助方法
  - 在 `stock_api_service.go` 中添加 `eastmoneyResponse` 结构体定义
  - 实现 `convertToEastmoneySecID` 方法，将 Yahoo Finance 格式的股票代码转换为东方财富的 secid 格式
  - 添加必要的日志输出以便追踪转换过程
  - _Requirements: 1.1, 4.3_

- [x] 2. 实现东方财富 API 调用方法
  - 实现 `fetchStockNameFromEastmoney` 方法，从东方财富 API 获取股票名称
  - 设置合理的 HTTP 超时时间（5-10秒）
  - 添加详细的日志记录（请求 URL、响应时间、状态码）
  - 实现错误处理和空名称检测
  - _Requirements: 1.1, 2.4, 3.1, 3.2, 3.3_

- [x] 3. 重构 GetStockInfo 方法以支持混合数据源
- [x] 3.1 为中国股票实现并发 API 调用
  - 检测中国股票（使用现有的 `IsChinaStock` 方法）
  - 使用 goroutine 和 channel 并发调用 Yahoo Finance 和东方财富 API
  - 等待两个 API 调用完成并收集结果
  - _Requirements: 1.1, 1.2, 2.3_

- [x] 3.2 实现结果合并和回退逻辑
  - 合并 Yahoo Finance 的价格数据和东方财富的名称数据
  - 当东方财富 API 失败或返回空名称时，回退到 Yahoo Finance 的名称
  - 添加回退操作的日志记录
  - _Requirements: 1.3, 1.4, 3.4_

- [x] 3.3 确保非中国股票的行为不变
  - 验证非中国股票继续完全使用 Yahoo Finance API
  - 验证现金符号的处理逻辑不受影响
  - 验证缓存机制对所有股票类型都正常工作
  - _Requirements: 2.1, 2.2, 4.1, 4.2, 4.3, 4.4_

- [ ]* 4. 编写单元测试
  - 为 `convertToEastmoneySecID` 编写测试用例（上海、深圳、无效格式）
  - 为 `fetchStockNameFromEastmoney` 编写测试用例（成功、失败、超时、空响应）
  - 为修改后的 `GetStockInfo` 编写测试用例（中国股票混合数据源、回退逻辑、非中国股票）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 5. 手动测试和验证
  - 测试上海股票（例如：600000.SS）获取中文名称
  - 测试深圳股票（例如：000001.SZ）获取中文名称
  - 测试美国股票（例如：AAPL）确保不受影响
  - 测试缓存机制：连续请求同一股票验证第二次从缓存返回
  - 验证日志输出的完整性和可读性
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 4.1_

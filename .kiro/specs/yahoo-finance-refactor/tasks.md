# Implementation Plan

- [x] 1. 更新 Yahoo Finance API 响应结构
  - 更新 `yahooChartResponse` 结构体以匹配 Chart API 的完整响应格式
  - 添加 `Meta` 嵌套结构包含 symbol、currency、regularMarketPrice、longName、shortName 字段
  - 确保 timestamp 和 indicators.quote.close 字段正确映射
  - 移除旧的 `yahooQuoteResponse` 结构体
  - _Requirements: 2.1, 2.3_

- [x] 2. 实现统一的 Yahoo Finance Chart API 调用方法
  - [x] 2.1 创建 fetchFromYahooChart 私有方法
    - 接受 symbol、period1、period2 参数
    - 构建 Chart API URL 并添加 interval=1d 参数
    - 设置正确的 User-Agent header
    - 处理 HTTP 请求和响应
    - 解析 JSON 响应为 yahooChartResponse 结构
    - 处理错误情况（网络错误、非 200 状态码、空结果）
    - _Requirements: 2.1, 6.1, 6.3, 6.4_
  
  - [x] 2.2 创建 extractStockInfo 私有方法
    - 从 yahooChartResponse 的 meta 字段提取股票信息
    - 优先使用 longName，其次 shortName，最后使用 symbol 作为名称
    - 从 meta.currency 获取货币，如果为空则根据 symbol 后缀判断（.SS/.SZ 为 CNY，其他为 USD）
    - 返回填充完整的 StockInfo 结构
    - _Requirements: 2.2, 2.3_
  
  - [x] 2.3 创建 extractHistoricalData 私有方法
    - 从 yahooChartResponse 提取 timestamp 和 close 价格数组
    - 验证两个数组长度一致
    - 将 Unix timestamp 转换为 time.Time
    - 过滤掉价格为 0 的数据点
    - 组合成 HistoricalPrice 数组并返回
    - _Requirements: 3.3, 3.4, 3.5_

- [x] 3. 重构 GetStockInfo 方法使用新实现
  - 保持方法签名不变
  - 移除市场类型判断逻辑（IsChinaStock/IsUSStock 调用）
  - 在缓存未命中时，调用 fetchFromYahooChart 获取最近 1 天的数据
  - 调用 extractStockInfo 从响应中提取股票信息
  - 将结果存入缓存
  - 确保错误处理逻辑完整
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 5.1, 5.3, 5.4_

- [x] 4. 重构 GetHistoricalData 方法使用新实现
  - 保持方法签名不变
  - 移除市场类型判断逻辑
  - 根据 period 参数计算 startTime 和 endTime
  - 调用 fetchFromYahooChart 获取指定时间范围的数据
  - 调用 extractHistoricalData 从响应中提取历史价格
  - 将结果存入缓存
  - 确保数据按时间升序排列
  - _Requirements: 3.1, 3.2, 3.6, 4.1, 4.2, 4.3, 5.2, 5.3, 5.4, 5.5_

- [x] 5. 清理 Tushare 相关代码
  - 删除 `tushareToken` 字段从 StockAPIService 结构体
  - 删除 `GetStockInfoUS` 方法
  - 删除 `GetStockInfoChina` 方法
  - 删除 `GetHistoricalDataUS` 方法
  - 删除 `GetHistoricalDataChina` 方法
  - 删除 `callTushareAPI` 方法
  - 删除 `convertTushareSymbol` 方法
  - 删除 `tushareRequest` 结构体
  - 删除 `tushareResponse` 结构体
  - 更新 `NewStockAPIService` 构造函数，移除 Tushare token 初始化
  - _Requirements: 1.2, 1.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 6. 更新配置文件和文档
  - 从 `server/.env.example` 移除 `TUSHARE_TOKEN` 环境变量
  - 更新 README.md 移除 Tushare API 引用
  - 更新 DEPLOYMENT.md 移除 Tushare token 配置说明
  - 在文档中更新数据源说明为仅使用 Yahoo Finance
  - _Requirements: 1.3_

- [x] 7. 测试重构后的功能
  - [x] 7.1 测试美股数据获取
    - 使用 AAPL 测试 GetStockInfo 返回正确的股票信息
    - 验证返回的 symbol、name、currentPrice、currency 字段
    - 测试 GetHistoricalData 对所有时间周期（1M、3M、6M、1Y）
    - 验证历史数据按时间升序排列
    - _Requirements: 2.3, 3.6, 5.4_
  
  - [x] 7.2 测试中国股票数据获取
    - 使用 600000.SS 测试 GetStockInfo 返回正确的股票信息
    - 验证 currency 字段为 CNY
    - 测试 GetHistoricalData 对所有时间周期
    - 验证数据格式与美股一致
    - _Requirements: 1.5, 2.3, 3.6, 5.4_
  
  - [x] 7.3 测试缓存机制
    - 验证第一次调用从 API 获取数据
    - 验证第二次调用从缓存返回数据（5 分钟内）
    - 验证缓存过期后重新从 API 获取
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 7.4 测试错误处理
    - 测试无效 symbol 返回 ErrInvalidSymbol
    - 测试不存在的股票返回 ErrStockNotFound
    - 测试无效 period 参数返回 ErrInvalidPeriod
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. 端到端验证
  - 启动完整应用程序（后端和前端）
  - 在前端搜索并添加美股（如 AAPL）到投资组合
  - 在前端搜索并添加中国股票（如 600000.SS）到投资组合
  - 验证 Dashboard 显示正确的投资组合价值和收益
  - 验证 Holdings 页面显示正确的当前价格
  - 验证历史表现图表正确渲染
  - 验证货币切换功能正常工作
  - _Requirements: 5.4, 5.5_

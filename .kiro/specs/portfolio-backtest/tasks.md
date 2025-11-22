# Implementation Plan

- [x] 1. 创建后端回测服务和 API
- [x] 1.1 创建 BacktestService 基础结构
  - 在 `server/services/` 目录下创建 `backtest_service.go`
  - 定义 BacktestService 结构体和构造函数
  - 定义所有数据模型（BacktestResponse, BacktestDataPoint, BacktestMetrics, AssetContribution 等）
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 实现投资组合权重计算
  - 实现 `calculatePortfolioWeights` 方法，基于当前持仓计算每个资产的权重
  - 处理空持仓和零值情况
  - _Requirements: 2.1, 2.2_

- [x] 1.3 实现历史回测性能计算
  - 实现 `calculateBacktestPerformance` 方法
  - 获取所有资产的历史价格数据
  - 对每个日期计算组合价值（使用当前权重 × 历史价格）
  - 处理货币转换和缺失数据
  - 计算每日收益率
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.4 实现回测绩效指标计算
  - 实现 `calculateBacktestMetrics` 方法
  - 计算总收益和总收益率
  - 计算年化收益率
  - 计算最大回撤（复用 AnalyticsService 的方法）
  - 计算波动率（日收益率标准差的年化值）
  - 计算夏普比率（使用 2% 无风险利率）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.5 实现资产贡献度计算
  - 实现 `calculateAssetContributions` 方法
  - 计算每个资产在回测期间的收益
  - 计算每个资产对总收益的贡献度
  - 按贡献度降序排序
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 1.6 实现基准对比功能
  - 实现 `getBenchmarkData` 方法
  - 获取基准指数的历史数据
  - 计算基准的累计收益率
  - 计算投资组合相对基准的超额收益
  - 支持常见基准指数（S&P 500, NASDAQ, 上证指数）
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 1.7 实现主回测方法
  - 实现 `RunBacktest` 方法，整合所有子功能
  - 验证输入参数（日期范围、货币类型）
  - 获取用户当前持仓
  - 调用各个计算方法
  - 组装完整的 BacktestResponse
  - 实现错误处理和日志记录
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 1.8 编写 BacktestService 单元测试
  - 测试权重计算函数
  - 测试绩效指标计算（年化收益率、波动率、夏普比率）
  - 测试资产贡献度计算
  - 测试边界情况（空持仓、单一资产、数据缺失）
  - _Requirements: 所有_

- [x] 2. 创建回测 API Handler
- [x] 2.1 创建 BacktestHandler
  - 在 `server/handlers/` 目录下创建 `backtest_handler.go`
  - 定义 BacktestHandler 结构体和构造函数
  - 实现 `GetBacktest` handler 方法
  - 解析查询参数（startDate, endDate, currency, benchmark）
  - 验证参数有效性
  - 调用 BacktestService.RunBacktest
  - 返回 JSON 响应
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.2 添加回测路由
  - 在 `server/routes/` 中注册 `/api/backtest` 路由
  - 应用 AuthMiddleware 确保只有登录用户可访问
  - 配置 CORS 和其他中间件
  - _Requirements: 1.1_

- [ ]* 2.3 编写 API 集成测试
  - 测试完整的回测 API 流程
  - 测试参数验证
  - 测试错误处理（无效日期、未授权访问）
  - 测试基准对比功能
  - _Requirements: 所有_

- [x] 3. 创建前端 API 客户端
- [x] 3.1 创建回测 API 函数
  - 在 `web/src/api/` 目录下创建 `backtest.ts`
  - 定义所有 TypeScript 接口（BacktestResponse, BacktestDataPoint, BacktestMetrics 等）
  - 实现 `runBacktest` 函数调用后端 API
  - 实现错误处理和类型转换
  - _Requirements: 1.1, 1.2_

- [x] 4. 创建回测页面组件
- [x] 4.1 创建 BacktestPage 主页面
  - 在 `web/src/pages/` 目录下创建 `BacktestPage.tsx`
  - 使用 DashboardLayout 布局
  - 管理页面状态（currency, startDate, endDate, benchmark, backtestData, loading, error）
  - 实现数据获取逻辑
  - 整合所有子组件
  - _Requirements: 1.1, 1.2_

- [x] 4.2 创建 BacktestControls 控制面板组件
  - 在 `web/src/components/` 目录下创建 `BacktestControls.tsx`
  - 实现日期选择器（使用 HTML5 date input 或第三方库）
  - 实现基准指数选择器（下拉菜单）
  - 添加快捷日期选项（1年、3年、5年、最大）
  - 实现货币切换（USD/RMB）
  - 添加"运行回测"按钮
  - 实现日期验证（开始日期 < 结束日期，结束日期 <= 今天）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1_

- [x] 4.3 创建 BacktestChart 图表组件
  - 在 `web/src/components/` 目录下创建 `BacktestChart.tsx`
  - 使用 Recharts 库创建折线图
  - 显示投资组合累计收益率曲线
  - 如果有基准，叠加显示基准收益率曲线
  - 实现图表交互（tooltip 显示详细信息）
  - 支持响应式布局
  - 应用主题样式（支持深色/浅色模式）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.2, 4.3_

- [x] 4.4 创建 BacktestMetrics 指标卡片组件
  - 在 `web/src/components/` 目录下创建 `BacktestMetrics.tsx`
  - 创建指标卡片网格布局
  - 显示总收益（绝对值和百分比）
  - 显示年化收益率
  - 显示最大回撤
  - 显示波动率
  - 显示夏普比率
  - 如果有基准，显示超额收益
  - 使用颜色指示正负值（绿色/红色）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4_

- [x] 4.5 创建 AssetContribution 资产贡献度组件
  - 在 `web/src/components/` 目录下创建 `AssetContribution.tsx`
  - 使用 Recharts 创建水平条形图
  - 显示每个资产的收益贡献
  - 按贡献度降序排序
  - 显示资产权重和收益率
  - 使用颜色区分正负贡献
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 4.6 编写前端组件测试
  - 测试 BacktestControls 交互和验证逻辑
  - 测试 BacktestChart 渲染
  - 测试 BacktestMetrics 数据显示
  - 测试 AssetContribution 排序和显示
  - _Requirements: 所有_

- [x] 5. 集成和路由配置
- [x] 5.1 添加回测页面路由
  - 在 `web/src/App.tsx` 中添加 `/backtest` 路由
  - 配置为受保护路由（需要登录）
  - _Requirements: 1.1_

- [x] 5.2 添加导航链接
  - 在 DashboardLayout 的导航菜单中添加 "Backtest" 链接
  - 添加合适的图标
  - 确保在所有页面都可访问
  - _Requirements: 1.1_

- [x] 5.3 实现错误处理和用户反馈
  - 在 BacktestPage 中实现错误边界
  - 显示友好的错误消息
  - 对于数据不足的情况，显示警告而非错误
  - 实现加载状态指示器
  - 添加重试机制
  - _Requirements: 2.5_

- [ ]* 5.4 端到端测试
  - 测试完整的用户流程（选择日期 → 运行回测 → 查看结果）
  - 测试基准对比功能
  - 测试货币切换
  - 测试错误场景
  - _Requirements: 所有_

- [x] 6. 性能优化和完善
- [x] 6.1 实现历史数据缓存
  - 在后端实现历史价格数据缓存（使用内存或 Redis）
  - 设置合理的缓存过期时间
  - 实现缓存键生成策略
  - _Requirements: 2.1_

- [x] 6.2 优化前端性能
  - 对长时间跨度的数据进行采样显示
  - 实现图表懒加载
  - 优化大数据集的渲染性能
  - _Requirements: 2.1, 2.2_

- [ ]* 6.3 添加数据导出功能
  - 实现导出回测结果为 CSV
  - 实现导出图表为 PNG
  - 添加导出按钮到 UI
  - _Requirements: 所有_

- [ ]* 6.4 性能测试
  - 测试大量持仓的回测性能
  - 测试长时间跨度（10年）的回测性能
  - 测试并发请求处理
  - 优化性能瓶颈
  - _Requirements: 所有_

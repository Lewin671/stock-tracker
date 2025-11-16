# Implementation Plan

- [x] 1. 创建 AssetStyle 数据模型和基础 API
  - 在 `server/models/` 中创建 `asset_style.go`，定义 AssetStyle 模型和请求/响应结构
  - 创建 MongoDB collection 索引，确保用户的 Asset Style 名称唯一
  - _Requirements: 1.1, 1.2, 1.3, 10.1, 10.4_

- [x] 1.1 实现 AssetStyleService 核心逻辑
  - 在 `server/services/` 中创建 `asset_style_service.go`
  - 实现 CreateAssetStyle、GetUserAssetStyles、UpdateAssetStyle 方法
  - 实现 GetAssetStyleUsageCount 方法，统计使用该 Asset Style 的 Portfolio 数量
  - 实现 CreateDefaultAssetStyle 方法，为新用户创建默认 Asset Style
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 10.4_

- [x] 1.2 实现 AssetStyleHandler API 端点
  - 在 `server/handlers/` 中创建 `asset_style_handler.go`
  - 实现 GET /api/asset-styles（获取用户的所有 Asset Styles）
  - 实现 POST /api/asset-styles（创建新的 Asset Style）
  - 实现 PUT /api/asset-styles/:id（更新 Asset Style 名称）
  - 实现 DELETE /api/asset-styles/:id（删除 Asset Style，需要处理重新分配）
  - 在 `server/routes/` 中注册新的路由
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 1.3 编写 AssetStyleService 单元测试
  - 创建 `server/services/asset_style_service_test.go`
  - 测试创建、获取、更新、删除 Asset Style 的各种场景
  - 测试重复名称、删除正在使用的 Asset Style 等边界情况
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2. 扩展 Portfolio 模型以支持资产分类
  - 在 `server/models/portfolio.go` 中添加 AssetStyleID 和 AssetClass 字段
  - 创建 UpdatePortfolioMetadataRequest 结构体
  - 更新 MongoDB 索引，添加 {user_id, asset_style_id} 和 {user_id, asset_class} 复合索引
  - _Requirements: 10.2, 10.3_

- [x] 2.1 扩展 PortfolioService 以支持元数据管理
  - 在 `server/services/portfolio_service.go` 中添加 UpdatePortfolioMetadata 方法
  - 添加 GetPortfolioWithMetadata 方法，返回包含 Asset Style 和 Asset Class 的 Portfolio
  - 添加 CheckPortfolioExists 方法，检查某个 symbol 的 Portfolio 是否存在
  - 修改 getOrCreatePortfolio 方法，在创建新 Portfolio 时要求提供 AssetStyleID 和 AssetClass
  - _Requirements: 2.6, 2.7, 10.2, 10.3, 10.6_

- [x] 2.2 实现 Portfolio 元数据更新 API
  - 在 `server/handlers/portfolio_handler.go` 中添加 UpdatePortfolioMetadata 方法
  - 实现 PUT /api/portfolios/:id/metadata 端点
  - 实现 GET /api/portfolios/:id 端点（如果不存在）
  - 实现 GET /api/portfolios/check/:symbol 端点，检查 Portfolio 是否存在
  - 在 `server/routes/` 中注册新的路由
  - _Requirements: 2.6, 3.1, 3.2, 3.3, 3.4, 10.6_

- [x] 2.3 编写 Portfolio 元数据相关的单元测试
  - 扩展 `server/services/portfolio_service_test.go`
  - 测试 UpdatePortfolioMetadata、CheckPortfolioExists 等方法
  - 测试无效的 AssetClass 值等边界情况
  - _Requirements: 2.6, 3.1, 10.2, 10.3_

- [x] 3. 实现分组查询功能
  - 在 `server/services/analytics_service.go` 中创建 GroupedHolding 和 GroupedDashboardMetrics 结构体
  - 实现 GetGroupedDashboardMetrics 方法，支持按 assetStyle、assetClass、currency 分组
  - 实现分组聚合逻辑：计算每个分组的总价值、百分比、包含的 holdings
  - _Requirements: 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 10.7, 10.8_

- [x] 3.1 扩展 Analytics API 以支持分组查询
  - 修改 `server/handlers/analytics_handler.go` 中的 GetDashboard 方法
  - 添加 groupBy 查询参数支持（assetStyle, assetClass, currency, none）
  - 根据 groupBy 参数调用相应的服务方法
  - _Requirements: 3.3, 4.1, 5.1, 6.1, 8.1_

- [x] 3.2 编写分组查询的单元测试
  - 扩展 `server/services/analytics_service_test.go`
  - 测试各种分组模式的正确性
  - 测试百分比计算、总和验证等
  - _Requirements: 3.3, 4.1, 5.1, 10.8_

- [x] 4. 修改用户注册流程以创建默认 Asset Style
  - 在 `server/services/auth_service.go` 的用户注册方法中
  - 调用 AssetStyleService.CreateDefaultAssetStyle 为新用户创建 "Default" Asset Style
  - _Requirements: 1.4, 10.4_

- [x] 5. 创建数据迁移脚本
  - 创建 `server/migrations/add_asset_metadata.go`
  - 为所有现有用户创建 "Default" Asset Style
  - 更新所有现有的 Portfolio，设置 asset_style_id 为 "Default"，asset_class 为 "Stock"
  - _Requirements: 10.2, 10.3, 10.4_

- [x] 6. 实现前端 Asset Style 管理功能
  - 创建 `web/src/api/assetStyles.ts`，实现 Asset Style 相关的 API 调用函数
  - 创建 `web/src/components/AssetStyleManagement.tsx` 组件
  - 实现 Asset Style 列表展示，显示名称和使用数量
  - 实现创建、编辑、删除 Asset Style 的 UI 和逻辑
  - 实现删除时的重新分配对话框
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

- [x] 6.1 创建 Asset Style 管理页面或对话框
  - 在 `web/src/pages/` 中创建 AssetStyleManagementPage 或在设置页面中集成
  - 添加导航链接到 Asset Style 管理界面
  - 实现响应式设计，支持移动端
  - _Requirements: 1.1_

- [x] 7. 实现首次添加股票时的资产分类对话框
  - 创建 `web/src/components/AssetClassDialog.tsx` 组件
  - 实现 Asset Style 下拉选择器，显示用户的所有 Asset Styles
  - 实现 Asset Class 下拉选择器（Stock, ETF, Bond, Cash and Equivalents）
  - 添加"快速添加 Asset Style"链接，打开 Asset Style 管理界面
  - 实现保存和取消按钮
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7.1 修改交易添加流程以集成资产分类对话框
  - 修改 `web/src/components/TransactionDialog.tsx` 或相关组件
  - 在提交交易前，检查该 symbol 的 Portfolio 是否存在
  - 如果不存在，显示 AssetClassDialog
  - 用户选择后，先创建/更新 Portfolio 元数据，再创建 Transaction
  - _Requirements: 2.1, 2.6, 2.7_

- [x] 8. 实现资产分类编辑功能
  - 创建 `web/src/components/EditAssetMetadataDialog.tsx` 组件
  - 预填充当前的 Asset Style 和 Asset Class
  - 实现保存和取消逻辑
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 8.1 在持仓列表中添加编辑按钮
  - 修改 `web/src/components/HoldingsTable.tsx`
  - 为每个持仓添加编辑图标或操作菜单
  - 点击后打开 EditAssetMetadataDialog
  - 保存后刷新持仓数据
  - _Requirements: 3.1, 3.5_

- [x] 9. 实现分组展示功能
  - 创建 `web/src/components/GroupedHoldingsView.tsx` 组件
  - 实现可展开/折叠的分组列表
  - 显示每个分组的总价值和百分比
  - 在每个分组下显示该分组的所有持仓
  - 为每个持仓添加编辑按钮
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

- [x] 9.1 实现分组模式选择器
  - 在 `web/src/pages/DashboardPage.tsx` 中添加分组模式选择器 UI
  - 使用 Radix UI ToggleGroup 或类似组件
  - 提供四个选项：Asset Style, Asset Class, Currency, Individual Holdings
  - 实现切换逻辑，根据选择调用不同的 API 或渲染不同的视图
  - _Requirements: 8.1, 8.2_

- [x] 9.2 实现分组模式的本地存储
  - 使用 localStorage 保存用户最后选择的分组模式
  - 页面加载时读取并应用保存的分组模式
  - _Requirements: 8.3_

- [x] 9.3 更新 Dashboard API 调用以支持分组
  - 修改 `web/src/api/analytics.ts` 中的 getDashboardMetrics 函数
  - 添加 groupBy 参数
  - 根据返回的数据类型渲染不同的视图
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 10. 实现分组饼图可视化
  - 修改 `web/src/components/AllocationPieChart.tsx` 以支持分组数据
  - 或创建新的 `GroupedAllocationPieChart.tsx` 组件
  - 根据分组模式显示不同的饼图（除了 Individual Holdings 模式）
  - 实现鼠标悬停显示详细信息
  - 实现图例显示
  - 为不同分组使用不同颜色
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 10.1 为不同 Asset Class 添加视觉标识
  - 定义 Asset Class 的颜色方案和图标
  - 在分组视图和图表中应用这些视觉标识
  - _Requirements: 5.4_

- [x] 11. 实现响应式设计和移动端适配
  - 确保所有新组件在移动端正常显示
  - 优化分组选择器在小屏幕上的显示
  - 优化分组列表在移动端的展示
  - _Requirements: 8.1, 8.2_

- [x] 12. 添加加载状态和错误处理
  - 在所有 API 调用处添加加载动画
  - 实现统一的错误提示机制
  - 处理网络错误、权限错误等各种异常情况
  - _Requirements: 8.2_

- [x] 13. 编写前端组件测试
  - 为 AssetStyleManagement 组件编写测试
  - 为 AssetClassDialog 组件编写测试
  - 为 EditAssetMetadataDialog 组件编写测试
  - 为 GroupedHoldingsView 组件编写测试
  - 测试分组模式切换逻辑
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_

- [x] 14. 编写集成测试
  - 测试完整的添加交易流程（包括首次添加时的资产分类）
  - 测试分组查询的端到端流程
  - 测试 Asset Style 管理的完整流程（创建、使用、删除、重新分配）
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 8.1_

- [x] 15. 性能优化和最终调整
  - 添加数据库索引以优化分组查询性能
  - 实现前端缓存策略（Asset Styles 列表、分组查询结果）
  - 优化分组计算逻辑，使用 MongoDB aggregation pipeline
  - 进行性能测试和优化
  - _Requirements: 10.7, 10.8_

- [x] 16. 文档和部署准备
  - 更新 API 文档，记录新的端点和参数
  - 更新用户文档，说明如何使用分组功能
  - 准备数据迁移脚本的执行计划
  - 进行最终的端到端测试
  - _Requirements: All_

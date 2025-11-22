# 实现计划

- [x] 1. 后端：实现现金识别和价格处理
  - 在 StockAPIService 中添加 IsCashSymbol 方法识别现金 symbol（CASH_USD、CASH_RMB）
  - 在 StockAPIService 中添加 getCashInfo 方法返回固定的现金信息（价格 1.0）
  - 修改 GetStockInfo 方法，当检测到现金 symbol 时返回固定信息而不调用外部 API
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. 后端：修改持仓计算逻辑处理现金
  - 修改 PortfolioService 的 calculateHolding 方法，识别现金 symbol
  - 对现金持仓，将盈亏（gainLoss）设置为 0
  - 对现金持仓，将盈亏百分比（gainLossPercent）设置为 0
  - 确保现金持仓的当前价值计算正确（shares × 1.0）
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 2.1 编写后端单元测试
  - 在 stock_api_service_test.go 中添加 TestIsCashSymbol 测试
  - 在 stock_api_service_test.go 中添加 TestGetCashInfo 测试
  - 在 portfolio_service_test.go 中添加 TestCalculateHoldingForCash 测试
  - 验证现金价格为 1.0，盈亏为 0
  - _需求: 2.1, 2.2, 3.1, 3.2_

- [x] 3. 前端：创建现金交易对话框组件
  - 创建 CashTransactionDialog.tsx 组件
  - 添加现金类型选择器（USD/RMB）
  - 添加操作类型选择（存入/取出）
  - 添加金额输入字段（对应 shares）
  - 添加日期选择器
  - 添加备注字段（可选）
  - 实现表单验证（金额为正数，日期不在未来）
  - 提交时自动设置 symbol 为 CASH_USD 或 CASH_RMB
  - 提交时自动设置 price 为 1.0
  - 提交时自动设置 currency 根据现金类型
  - 提交时自动设置 Asset Class 为 "Cash and Equivalents"
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2_

- [x] 4. 前端：修改 TransactionDialog 支持现金选项
  - 在 TransactionDialog 中添加资产类型选择（股票/现金）
  - 当选择现金时，显示现金类型选择器
  - 当选择现金时，自动设置 price 为 1.0 并禁用编辑
  - 当选择现金时，将 "Shares" 标签改为 "Amount"
  - 当选择现金时，将 "Action" 标签改为 "Deposit/Withdraw"
  - _需求: 1.1, 1.2, 5.1, 5.2_

- [x] 5. 前端：优化 HoldingsTable 显示现金持仓
  - 添加 isCashSymbol 辅助函数识别现金 symbol
  - 添加 getCashDisplayName 函数返回友好名称（"现金 - 美元"、"现金 - 人民币"）
  - 在持仓列表中显示现金的友好名称而不是 symbol
  - 对现金持仓不显示价格变动信息
  - 对现金持仓显示盈亏为 "-" 或 "0"
  - 添加现金图标区分现金和股票持仓
  - _需求: 2.1, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. 前端：在 Holdings 页面添加现金交易入口
  - 在 HoldingsPage 添加"Add Cash"按钮
  - 点击按钮打开 CashTransactionDialog
  - 确保现金交易成功后刷新持仓列表
  - _需求: 1.1, 5.1_

- [x] 7. 前端：修改 TransactionsList 显示现金交易
  - 识别现金交易（symbol 为 CASH_USD 或 CASH_RMB）
  - 对现金交易，将 "buy" 显示为 "存入"，"sell" 显示为 "取出"
  - 对现金交易，显示友好的名称而不是 symbol
  - 对现金交易，不显示价格信息（或显示为 1.0）
  - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. 前端：验证 Dashboard 正确显示现金资产
  - 验证现金持仓计入总资产价值
  - 验证资产配置饼图中包含现金部分
  - 验证按资产类别分组时现金归类到 "Cash and Equivalents"
  - 验证按货币分组时 USD 和 RMB 现金分别显示
  - 验证货币切换时现金价值正确转换
  - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 8.1 编写前端组件测试
  - 为 CashTransactionDialog 编写测试
  - 为 HoldingsTable 现金显示编写测试
  - 为 TransactionsList 现金交易显示编写测试
  - _需求: 1.1, 5.1, 7.1_

- [ ]* 9. 集成测试
  - 编写端到端测试：添加现金存入交易
  - 编写端到端测试：添加现金取出交易
  - 编写端到端测试：验证余额不足错误处理
  - 编写端到端测试：验证现金在仪表板中显示
  - 编写端到端测试：验证现金交易历史显示
  - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. 文档和部署准备
  - 更新 API 文档说明现金交易的使用方式
  - 更新用户指南添加现金管理功能说明
  - 准备部署清单和回滚计划
  - _需求: 所有需求_

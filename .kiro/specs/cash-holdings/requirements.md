# 需求文档

## 简介

本功能旨在为投资组合追踪系统添加现金持有记录能力，允许用户像添加股票持仓一样添加现金持仓（包括人民币和美元）。现金持仓将作为投资组合的一部分，与股票、ETF等其他资产类型一起展示在 Holdings 页面中，并计入资产配置和总价值计算。

## 术语表

- **System**: 投资组合追踪系统（Stock Portfolio Tracker）
- **User**: 使用系统管理投资组合的用户
- **Cash Holding**: 现金持仓，使用特殊的 symbol（如 CASH_USD、CASH_RMB）表示现金资产
- **Currency**: 货币类型，当前支持 USD（美元）和 RMB（人民币）
- **Transaction**: 交易记录，包括买入、卖出等操作，现金使用相同的交易模型
- **Portfolio**: 投资组合，包含用户的所有资产（股票、ETF、债券、现金等）
- **Holdings Page**: 持仓页面，展示用户的所有持仓和交易记录
- **Dashboard**: 仪表板页面，展示用户的投资组合总览
- **Asset Class**: 资产类别，如 Stock（股票）、ETF、Bond（债券）、Cash and Equivalents（现金及等价物）

## 需求

### 需求 1：添加现金持仓

**用户故事：** 作为投资者，我希望能够像添加股票一样添加现金持仓，以便统一管理我的所有资产

#### 验收标准

1. WHEN User 在 Holdings 页面添加交易时，THE System SHALL 允许 User 选择现金类型（CASH_USD 或 CASH_RMB）
2. WHEN User 选择现金类型后，THE System SHALL 自动将 Asset Class 设置为"Cash and Equivalents"
3. WHEN User 添加现金交易时，THE System SHALL 要求 User 输入金额、日期和备注（可选）
4. WHEN User 提交现金交易时，THE System SHALL 验证金额为正数
5. WHEN 现金交易创建成功后，THE System SHALL 将该交易保存到数据库并更新持仓

### 需求 2：现金持仓的价格处理

**用户故事：** 作为投资者，我希望系统能够正确处理现金的价格，因为现金不需要从网络获取实时价格

#### 验收标准

1. WHEN System 处理现金持仓时，THE System SHALL 将现金的当前价格固定为 1.0
2. WHEN System 计算现金持仓的当前价值时，THE System SHALL 使用公式：当前价值 = 持有数量 × 1.0
3. WHEN System 获取股票价格时，THE System SHALL 跳过现金类型的 symbol（CASH_USD、CASH_RMB）
4. WHEN User 查看现金持仓详情时，THE System SHALL 显示价格为 1.0 且不显示价格变动信息
5. WHEN System 刷新持仓数据时，THE System SHALL 不对现金持仓发起价格查询请求

### 需求 3：现金持仓的盈亏计算

**用户故事：** 作为投资者，我希望系统能够正确计算包含现金的投资组合盈亏

#### 验收标准

1. WHEN System 计算现金持仓的盈亏时，THE System SHALL 将盈亏设置为 0
2. WHEN System 计算现金持仓的盈亏百分比时，THE System SHALL 将盈亏百分比设置为 0%
3. WHEN System 计算投资组合总盈亏时，THE System SHALL 包含现金持仓的成本基础但不计入盈亏
4. WHEN System 计算投资组合总收益率时，THE System SHALL 在总成本中包含现金成本
5. WHEN User 查看持仓列表时，THE System SHALL 显示现金持仓的盈亏为 0

### 需求 4：现金持仓在仪表板中的展示

**用户故事：** 作为投资者，我希望在仪表板中看到现金持仓的信息，以便全面了解我的资产配置

#### 验收标准

1. WHEN System 计算投资组合总价值时，THE System SHALL 包含所有现金持仓的价值
2. WHEN System 生成资产配置饼图时，THE System SHALL 将现金持仓作为独立部分展示
3. WHEN User 按资产类别分组时，THE System SHALL 将现金持仓归类到"Cash and Equivalents"类别
4. WHEN User 按货币分组时，THE System SHALL 分别展示 USD 和 RMB 现金持仓
5. WHEN User 切换显示货币时，THE System SHALL 使用当前汇率转换现金持仓的显示价值

### 需求 5：现金交易记录

**用户故事：** 作为投资者，我希望能够记录现金的存入和取出操作，以便追踪现金流动

#### 验收标准

1. WHEN User 添加现金存入时，THE System SHALL 创建一条 action 为"buy"的交易记录
2. WHEN User 添加现金取出时，THE System SHALL 创建一条 action 为"sell"的交易记录
3. WHEN User 查看现金持仓的交易历史时，THE System SHALL 显示所有存入和取出记录
4. WHEN User 提交现金取出交易时，THE System SHALL 验证当前现金余额充足
5. WHEN System 展示交易记录时，THE System SHALL 将"buy"显示为"存入"，"sell"显示为"取出"（针对现金）

### 需求 6：现金持仓的货币转换

**用户故事：** 作为投资者，我希望系统能够正确处理不同货币的现金持仓，以便准确计算总资产价值

#### 验收标准

1. WHEN User 切换显示货币为 USD 时，THE System SHALL 将 CASH_RMB 持仓按当前汇率转换为 USD 显示
2. WHEN User 切换显示货币为 RMB 时，THE System SHALL 将 CASH_USD 持仓按当前汇率转换为 RMB 显示
3. WHEN System 计算投资组合总价值时，THE System SHALL 使用统一的货币单位（基于 User 选择）
4. WHEN System 展示现金持仓时，THE System SHALL 同时显示原始货币金额和转换后的金额
5. WHEN System 无法获取实时汇率时，THE System SHALL 使用最近一次成功获取的汇率

### 需求 7：现金持仓的标识和显示

**用户故事：** 作为投资者，我希望能够清楚地识别哪些是现金持仓，以便与股票持仓区分

#### 验收标准

1. WHEN System 展示持仓列表时，THE System SHALL 为现金持仓显示友好的名称（如"现金 - 美元"、"现金 - 人民币"）
2. WHEN System 展示现金持仓时，THE System SHALL 使用特殊的图标或标识区分现金和股票
3. WHEN User 搜索持仓时，THE System SHALL 允许通过"现金"、"CASH"等关键词搜索现金持仓
4. WHEN System 排序持仓列表时，THE System SHALL 允许 User 选择是否将现金持仓置顶或置底
5. WHEN System 导出持仓数据时，THE System SHALL 在 symbol 字段中保留 CASH_USD 或 CASH_RMB 标识

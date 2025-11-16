# Requirements Document

## Introduction

本文档定义了投资组合 Dashboard 页面的分组展示功能需求。该功能允许用户根据不同维度（资产风格、资产类别、货币、持仓）对投资组合进行灵活分组和查看，以便更好地理解资产配置和占比情况。

## Glossary

- **Dashboard System**: 投资组合仪表板系统，负责展示用户的投资组合数据和分析
- **Asset Style**: 资产风格，用户自定义的股票分类标签（如：成长型、价值型、科技股等）
- **Asset Class**: 资产类别，标准的资产分类（Stock/股票、ETF/交易所交易基金、Bond/债券、Cash and Equivalents/现金及等价物）
- **Grouping Mode**: 分组模式，用户选择的数据分组维度
- **Holding**: 持仓，用户持有的某个股票或资产的详细信息
- **Transaction**: 交易记录，用户买入或卖出资产的历史记录
- **Allocation View**: 配置视图，展示不同分组下的资产占比和价值分布
- **User Asset**: 用户资产，表示用户投资组合中的某个资产（如某只股票），包含该资产的元数据信息

## Requirements

### Requirement 1

**User Story:** 作为投资者，我希望能够管理和定义自己的资产风格列表，以便在添加交易时使用统一的分类标准

#### Acceptance Criteria

1. THE Dashboard System SHALL 提供一个 Asset Style 管理页面或对话框，允许用户查看、添加、编辑和删除自定义的 Asset Style
2. WHEN 用户创建新的 Asset Style 时，THE Dashboard System SHALL 要求用户输入 Asset Style 名称（最多 50 个字符）
3. THE Dashboard System SHALL 确保每个用户的 Asset Style 名称唯一，不允许重复
4. THE Dashboard System SHALL 为每个新用户预设一个 "Default" Asset Style，该 Asset Style 不可删除但可以重命名
5. WHEN 用户尝试删除某个 Asset Style 时，IF 该 Asset Style 已被任何交易使用，THEN THE Dashboard System SHALL 提示用户并要求用户选择一个替代的 Asset Style 来重新分配这些交易
6. THE Dashboard System SHALL 在 Asset Style 管理界面显示每个 Asset Style 当前关联的交易数量

### Requirement 2

**User Story:** 作为投资者，我希望为每个资产设置资产风格和资产类别，以便对投资组合进行分类管理

#### Acceptance Criteria

1. WHEN 用户首次添加某个股票代码的交易时，THE Dashboard System SHALL 提示用户为该资产设置 Asset Style 和 Asset Class
2. THE Dashboard System SHALL 在资产设置对话框中提供 Asset Style 下拉选择器，显示用户所有自定义的 Asset Style 选项
3. THE Dashboard System SHALL 在资产设置对话框中提供 Asset Class 下拉选择器，选项包括 "Stock"、"ETF"、"Bond"、"Cash and Equivalents"
4. THE Dashboard System SHALL 在 Asset Style 下拉选择器中默认选中 "Default" Asset Style
5. THE Dashboard System SHALL 在资产设置对话框中提供一个快捷链接，允许用户直接打开 Asset Style 管理界面添加新的 Asset Style
6. WHEN 用户为某个资产设置了 Asset Style 和 Asset Class 后，THE Dashboard System SHALL 将这些信息保存到该资产的 Portfolio 记录中
7. WHEN 用户再次添加同一股票代码的交易时，THE Dashboard System SHALL 自动使用已保存的 Asset Style 和 Asset Class，不再提示用户设置

### Requirement 3

**User Story:** 作为投资者，我希望能够随时修改已有资产的分类信息，以便根据市场变化或投资策略调整调整资产分类

#### Acceptance Criteria

1. THE Dashboard System SHALL 在持仓列表页面为每个持仓提供编辑按钮或操作菜单
2. WHEN 用户点击编辑某个资产的分类信息时，THE Dashboard System SHALL 显示一个对话框，包含该资产当前的 Asset Style 和 Asset Class
3. THE Dashboard System SHALL 在编辑对话框中允许用户修改 Asset Style（从下拉列表选择）和 Asset Class（从下拉列表选择）
4. WHEN 用户保存修改后，THE Dashboard System SHALL 更新该资产的 Portfolio 记录
5. THE Dashboard System SHALL 在保存成功后立即刷新相关的分组视图和图表，反映最新的分类信息
6. THE Dashboard System SHALL 在编辑对话框中显示该资产的股票代码和名称，以便用户确认正在编辑的资产

### Requirement 4

**User Story:** 作为投资者，我希望能够根据资产风格对持仓进行分组查看，以便了解不同投资风格的资产配置情况

#### Acceptance Criteria

1. WHEN 用户选择 "Asset Style" 分组模式，THE Dashboard System SHALL 按照 Asset Style 对所有持仓进行分组展示
2. THE Dashboard System SHALL 在每个 Asset Style 分组下显示该分组的总价值和占总投资组合的百分比
3. THE Dashboard System SHALL 在每个 Asset Style 分组下列出属于该分组的所有持仓详情
4. THE Dashboard System SHALL 按照每个 Asset Style 分组的总价值从高到低排序显示各分组

### Requirement 5

**User Story:** 作为投资者，我希望能够根据资产类别对持仓进行分组查看，以便了解不同资产类型的配置比例

#### Acceptance Criteria

1. WHEN 用户选择 "Asset Class" 分组模式，THE Dashboard System SHALL 按照 Asset Class 对所有持仓进行分组展示
2. THE Dashboard System SHALL 在每个 Asset Class 分组下显示该分组的总价值和占总投资组合的百分比
3. THE Dashboard System SHALL 在每个 Asset Class 分组下列出属于该分组的所有持仓详情
4. THE Dashboard System SHALL 为每个 Asset Class 分组使用不同的视觉标识（如颜色或图标）
5. THE Dashboard System SHALL 按照每个 Asset Class 分组的总价值从高到低排序显示各分组

### Requirement 6

**User Story:** 作为投资者，我希望能够根据货币对持仓进行分组查看，以便清楚了解不同货币资产的占比

#### Acceptance Criteria

1. WHEN 用户选择 "Currency" 分组模式，THE Dashboard System SHALL 按照交易货币（USD 或 RMB）对所有持仓进行分组展示
2. THE Dashboard System SHALL 在每个货币分组下显示该分组的总价值（以当前选择的显示货币计算）和占总投资组合的百分比
3. THE Dashboard System SHALL 在每个货币分组下列出属于该分组的所有持仓详情
4. WHEN 用户切换显示货币时，THE Dashboard System SHALL 保持货币分组模式，并更新所有价值的显示货币

### Requirement 7

**User Story:** 作为投资者，我希望能够查看不分组的持仓列表，以便按照单个持仓查看详细信息

#### Acceptance Criteria

1. WHEN 用户选择 "Individual Holdings" 分组模式，THE Dashboard System SHALL 显示所有持仓的平铺列表，不进行任何分组
2. THE Dashboard System SHALL 在 "Individual Holdings" 模式下为每个持仓显示完整的详细信息，包括股票代码、持有数量、成本基础、当前价格、当前价值、盈亏金额和盈亏百分比
3. THE Dashboard System SHALL 在 "Individual Holdings" 模式下按照持仓价值从高到低排序

### Requirement 8

**User Story:** 作为投资者，我希望能够灵活切换不同的分组模式，以便从不同角度分析我的投资组合

#### Acceptance Criteria

1. THE Dashboard System SHALL 在 Dashboard 页面顶部提供一个分组模式选择器，包含 "Asset Style"、"Asset Class"、"Currency"、"Individual Holdings" 四个选项
2. WHEN 用户选择不同的分组模式，THE Dashboard System SHALL 在 2 秒内重新渲染页面内容以反映新的分组方式
3. THE Dashboard System SHALL 记住用户最后选择的分组模式，并在用户下次访问 Dashboard 页面时自动应用该模式
4. THE Dashboard System SHALL 在切换分组模式时保持当前选择的显示货币不变

### Requirement 9

**User Story:** 作为投资者，我希望在分组视图中看到可视化的占比图表，以便直观了解各分组的资产配置

#### Acceptance Criteria

1. WHEN 用户选择任何分组模式（除 "Individual Holdings" 外），THE Dashboard System SHALL 显示一个饼图展示各分组的价值占比
2. THE Dashboard System SHALL 在饼图中为每个分组使用不同的颜色
3. WHEN 用户将鼠标悬停在饼图的某个分组上，THE Dashboard System SHALL 显示该分组的名称、总价值和占比百分比
4. THE Dashboard System SHALL 在饼图下方显示图例，列出所有分组及其对应的颜色和占比

### Requirement 10

**User Story:** 作为投资者，我希望系统能够正确处理和存储资产的元数据，以便支持各种分组功能

#### Acceptance Criteria

1. THE Dashboard System SHALL 创建一个 AssetStyle 数据模型，包含字段：id、userId、name、createdAt、updatedAt
2. THE Dashboard System SHALL 在 Portfolio 数据模型中添加 assetStyleId 字段（引用 AssetStyle 的 id，必填）
3. THE Dashboard System SHALL 在 Portfolio 数据模型中添加 assetClass 字段（枚举类型，必填，可选值：Stock、ETF、Bond、Cash and Equivalents）
4. WHEN 新用户注册时，THE Dashboard System SHALL 自动为该用户创建一个名为 "Default" 的 AssetStyle
5. THE Dashboard System SHALL 在后端 API 中提供 CRUD 接口用于管理 AssetStyle
6. THE Dashboard System SHALL 在后端 API 中提供接口用于更新 Portfolio 的 assetStyleId 和 assetClass
7. THE Dashboard System SHALL 在后端 API 中提供接口，支持按照 assetStyleId、assetClass、currency 进行分组查询和聚合计算
8. THE Dashboard System SHALL 确保所有分组计算的总和等于投资组合的总价值

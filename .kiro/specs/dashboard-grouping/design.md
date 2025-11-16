# Design Document - Dashboard Grouping Feature

## Overview

本设计文档描述了投资组合 Dashboard 分组展示功能的技术实现方案。该功能允许用户根据资产风格（Asset Style）、资产类别（Asset Class）、货币（Currency）或不分组（Individual Holdings）四种维度对投资组合进行灵活分组查看，并提供可视化的占比图表。

核心设计理念：
- Asset Style 和 Asset Class 是资产（Portfolio）的属性，而非交易（Transaction）的属性
- 用户可以自定义和管理 Asset Style 列表
- 首次添加某个股票时设置其分类，后续交易自动继承
- 支持随时修改已有资产的分类信息
- 分组模式可灵活切换，用户偏好会被记住

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  DashboardPage   │  │ AssetStyleMgmt   │                │
│  │  - Grouping UI   │  │  - CRUD UI       │                │
│  │  - Charts        │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ GroupedHoldings  │  │ AssetClassDialog │                │
│  │  Component       │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Go/Gin)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Analytics Handler│  │ AssetStyle       │                │
│  │ - Dashboard API  │  │  Handler         │                │
│  │ - Grouping API   │  │ - CRUD APIs      │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Portfolio Handler│  │ Portfolio Service│                │
│  │ - Update Asset   │  │ - Grouping Logic │                │
│  │   Metadata       │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ MongoDB Driver
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database (MongoDB)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  asset_styles    │  │   portfolios     │                │
│  │  Collection      │  │   Collection     │                │
│  │                  │  │  + assetStyleId  │                │
│  │                  │  │  + assetClass    │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  transactions    │  │     users        │                │
│  │  Collection      │  │   Collection     │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### 1. 首次添加股票交易流程
```
User → AddTransaction → Check if Portfolio exists
                              ↓ No
                        Show AssetClassDialog
                              ↓
                        User selects Asset Style & Asset Class
                              ↓
                        Create Portfolio with metadata
                              ↓
                        Create Transaction
                              ↓
                        Return success
```

#### 2. 分组查询流程
```
User selects grouping mode → API: /api/analytics/dashboard?groupBy=assetStyle
                                   ↓
                            Fetch all portfolios with metadata
                                   ↓
                            Fetch all transactions
                                   ↓
                            Calculate holdings per portfolio
                                   ↓
                            Group by selected dimension
                                   ↓
                            Calculate group totals & percentages
                                   ↓
                            Return grouped data
```

## Components and Interfaces

### Backend Components

#### 1. Data Models

**AssetStyle Model** (新增)
```go
package models

import (
    "time"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

type AssetStyle struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    UserID    primitive.ObjectID `bson:"user_id" json:"userId" binding:"required"`
    Name      string             `bson:"name" json:"name" binding:"required,max=50"`
    CreatedAt time.Time          `bson:"created_at" json:"createdAt"`
    UpdatedAt time.Time          `bson:"updated_at" json:"updatedAt"`
}

type AssetStyleRequest struct {
    Name string `json:"name" binding:"required,max=50"`
}
```

**Portfolio Model** (扩展现有模型)
```go
// 在 server/models/portfolio.go 中添加字段
type Portfolio struct {
    ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
    UserID       primitive.ObjectID  `bson:"user_id" json:"userId" binding:"required"`
    Symbol       string              `bson:"symbol" json:"symbol" binding:"required"`
    AssetStyleID *primitive.ObjectID `bson:"asset_style_id,omitempty" json:"assetStyleId"` // 新增
    AssetClass   string              `bson:"asset_class,omitempty" json:"assetClass"`      // 新增: Stock, ETF, Bond, Cash and Equivalents
    CreatedAt    time.Time           `bson:"created_at" json:"createdAt"`
    UpdatedAt    time.Time           `bson:"updated_at" json:"updatedAt"`
}

type UpdatePortfolioMetadataRequest struct {
    AssetStyleID string `json:"assetStyleId" binding:"required"`
    AssetClass   string `json:"assetClass" binding:"required,oneof=Stock ETF Bond 'Cash and Equivalents'"`
}
```

#### 2. API Endpoints

**AssetStyle Management APIs** (新增)
```
GET    /api/asset-styles              - 获取用户的所有 Asset Styles
POST   /api/asset-styles              - 创建新的 Asset Style
PUT    /api/asset-styles/:id          - 更新 Asset Style
DELETE /api/asset-styles/:id          - 删除 Asset Style (需要处理关联的 portfolios)
```

**Portfolio Metadata APIs** (新增)
```
PUT    /api/portfolios/:id/metadata   - 更新 Portfolio 的 Asset Style 和 Asset Class
GET    /api/portfolios/:id            - 获取 Portfolio 详情（包含 Asset Style 和 Asset Class）
```

**Analytics APIs** (扩展现有 API)
```
GET    /api/analytics/dashboard?currency=USD&groupBy=assetStyle
       - groupBy 参数: assetStyle, assetClass, currency, none (default)
       - 返回分组后的数据结构
```

#### 3. Service Layer

**AssetStyleService** (新增)
```go
package services

type AssetStyleService struct {}

// CreateAssetStyle creates a new asset style for a user
func (s *AssetStyleService) CreateAssetStyle(userID primitive.ObjectID, name string) (*models.AssetStyle, error)

// GetUserAssetStyles returns all asset styles for a user
func (s *AssetStyleService) GetUserAssetStyles(userID primitive.ObjectID) ([]models.AssetStyle, error)

// UpdateAssetStyle updates an asset style
func (s *AssetStyleService) UpdateAssetStyle(userID primitive.ObjectID, styleID primitive.ObjectID, name string) error

// DeleteAssetStyle deletes an asset style and reassigns portfolios
func (s *AssetStyleService) DeleteAssetStyle(userID primitive.ObjectID, styleID primitive.ObjectID, newStyleID primitive.ObjectID) error

// GetAssetStyleUsageCount returns the number of portfolios using this style
func (s *AssetStyleService) GetAssetStyleUsageCount(styleID primitive.ObjectID) (int64, error)

// CreateDefaultAssetStyle creates the default asset style for a new user
func (s *AssetStyleService) CreateDefaultAssetStyle(userID primitive.ObjectID) (*models.AssetStyle, error)
```

**PortfolioService** (扩展现有服务)
```go
// UpdatePortfolioMetadata updates the asset style and asset class of a portfolio
func (s *PortfolioService) UpdatePortfolioMetadata(userID primitive.ObjectID, portfolioID primitive.ObjectID, assetStyleID primitive.ObjectID, assetClass string) error

// GetPortfolioWithMetadata returns portfolio with asset style and asset class
func (s *PortfolioService) GetPortfolioWithMetadata(userID primitive.ObjectID, portfolioID primitive.ObjectID) (*models.Portfolio, error)

// CheckPortfolioExists checks if a portfolio exists for a symbol
func (s *PortfolioService) CheckPortfolioExists(userID primitive.ObjectID, symbol string) (bool, *models.Portfolio, error)
```

**AnalyticsService** (扩展现有服务)
```go
// GroupedHolding represents holdings grouped by a dimension
type GroupedHolding struct {
    GroupName   string    `json:"groupName"`
    GroupValue  float64   `json:"groupValue"`
    Percentage  float64   `json:"percentage"`
    Holdings    []Holding `json:"holdings"`
}

// GetGroupedDashboardMetrics returns dashboard metrics grouped by specified dimension
func (s *AnalyticsService) GetGroupedDashboardMetrics(userID primitive.ObjectID, currency string, groupBy string) (*GroupedDashboardMetrics, error)

type GroupedDashboardMetrics struct {
    TotalValue       float64          `json:"totalValue"`
    TotalGain        float64          `json:"totalGain"`
    PercentageReturn float64          `json:"percentageReturn"`
    Groups           []GroupedHolding `json:"groups"`
    Currency         string           `json:"currency"`
    GroupBy          string           `json:"groupBy"`
}
```

### Frontend Components

#### 1. React Components

**AssetStyleManagement Component** (新增)
```typescript
// web/src/components/AssetStyleManagement.tsx
interface AssetStyle {
  id: string;
  name: string;
  usageCount: number;
}

const AssetStyleManagement: React.FC = () => {
  // CRUD operations for asset styles
  // Display list with usage counts
  // Handle delete with reassignment dialog
}
```

**AssetClassDialog Component** (新增)
```typescript
// web/src/components/AssetClassDialog.tsx
interface AssetClassDialogProps {
  symbol: string;
  onSave: (assetStyleId: string, assetClass: string) => void;
  onCancel: () => void;
}

const AssetClassDialog: React.FC<AssetClassDialogProps> = ({symbol, onSave, onCancel}) => {
  // Show when adding first transaction for a symbol
  // Asset Style dropdown (with link to management)
  // Asset Class dropdown
  // Save/Cancel buttons
}
```

**GroupedHoldingsView Component** (新增)
```typescript
// web/src/components/GroupedHoldingsView.tsx
interface GroupedHoldingsViewProps {
  groups: GroupedHolding[];
  currency: string;
  onEditAsset: (portfolioId: string) => void;
}

const GroupedHoldingsView: React.FC<GroupedHoldingsViewProps> = ({groups, currency, onEditAsset}) => {
  // Display holdings grouped by selected dimension
  // Expandable/collapsible groups
  // Show group totals and percentages
  // Edit button for each holding
}
```

**EditAssetMetadataDialog Component** (新增)
```typescript
// web/src/components/EditAssetMetadataDialog.tsx
interface EditAssetMetadataDialogProps {
  portfolio: Portfolio;
  onSave: (assetStyleId: string, assetClass: string) => void;
  onCancel: () => void;
}

const EditAssetMetadataDialog: React.FC<EditAssetMetadataDialogProps> = ({portfolio, onSave, onCancel}) => {
  // Edit existing portfolio's asset style and asset class
  // Pre-populate with current values
}
```

**DashboardPage** (扩展现有组件)
```typescript
// web/src/pages/DashboardPage.tsx
// 添加分组模式选择器
const [groupingMode, setGroupingMode] = useState<'assetStyle' | 'assetClass' | 'currency' | 'none'>('none');

// 从 localStorage 读取和保存用户偏好
useEffect(() => {
  const savedMode = localStorage.getItem('dashboardGroupingMode');
  if (savedMode) setGroupingMode(savedMode as any);
}, []);

// 根据 groupingMode 调用不同的 API 或渲染不同的视图
```

#### 2. API Client Functions

```typescript
// web/src/api/assetStyles.ts
export const getAssetStyles = async (): Promise<AssetStyle[]> => { ... }
export const createAssetStyle = async (name: string): Promise<AssetStyle> => { ... }
export const updateAssetStyle = async (id: string, name: string): Promise<void> => { ... }
export const deleteAssetStyle = async (id: string, newStyleId: string): Promise<void> => { ... }

// web/src/api/portfolios.ts
export const updatePortfolioMetadata = async (
  portfolioId: string, 
  assetStyleId: string, 
  assetClass: string
): Promise<void> => { ... }

export const checkPortfolioExists = async (symbol: string): Promise<{
  exists: boolean;
  portfolio?: Portfolio;
}> => { ... }

// web/src/api/analytics.ts (扩展)
export const getDashboardMetrics = async (
  currency: string, 
  groupBy?: 'assetStyle' | 'assetClass' | 'currency' | 'none'
): Promise<DashboardMetrics | GroupedDashboardMetrics> => { ... }
```

## Data Models

### Database Schema

#### asset_styles Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,          // 关联到 users collection
  name: String,               // Asset Style 名称，最多 50 字符
  created_at: ISODate,
  updated_at: ISODate
}

// Indexes
{user_id: 1, name: 1}  // 确保同一用户的 Asset Style 名称唯一
{user_id: 1}           // 查询用户的所有 Asset Styles
```

#### portfolios Collection (扩展)
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  symbol: String,
  asset_style_id: ObjectId,   // 新增：关联到 asset_styles collection
  asset_class: String,        // 新增：Stock, ETF, Bond, Cash and Equivalents
  created_at: ISODate,
  updated_at: ISODate
}

// Indexes (新增)
{user_id: 1, asset_style_id: 1}  // 按 Asset Style 分组查询
{user_id: 1, asset_class: 1}     // 按 Asset Class 分组查询
```

### TypeScript Interfaces

```typescript
// Frontend type definitions

interface AssetStyle {
  id: string;
  userId: string;
  name: string;
  usageCount?: number;  // 前端计算或从 API 获取
  createdAt: string;
  updatedAt: string;
}

interface Portfolio {
  id: string;
  userId: string;
  symbol: string;
  assetStyleId?: string;
  assetClass?: 'Stock' | 'ETF' | 'Bond' | 'Cash and Equivalents';
  createdAt: string;
  updatedAt: string;
}

interface GroupedHolding {
  groupName: string;
  groupValue: number;
  percentage: number;
  holdings: Holding[];
}

interface GroupedDashboardMetrics {
  totalValue: number;
  totalGain: number;
  percentageReturn: number;
  groups: GroupedHolding[];
  currency: string;
  groupBy: 'assetStyle' | 'assetClass' | 'currency' | 'none';
}

type GroupingMode = 'assetStyle' | 'assetClass' | 'currency' | 'none';
```

## Error Handling

### Backend Error Scenarios

1. **Asset Style 名称重复**
   - Error Code: `DUPLICATE_ASSET_STYLE`
   - HTTP Status: 400
   - Message: "Asset style name already exists"

2. **删除正在使用的 Asset Style 但未提供替代**
   - Error Code: `ASSET_STYLE_IN_USE`
   - HTTP Status: 400
   - Message: "Asset style is in use. Please provide a replacement style ID"

3. **更新不存在的 Portfolio**
   - Error Code: `PORTFOLIO_NOT_FOUND`
   - HTTP Status: 404
   - Message: "Portfolio not found"

4. **无效的 Asset Class 值**
   - Error Code: `INVALID_ASSET_CLASS`
   - HTTP Status: 400
   - Message: "Invalid asset class. Must be Stock, ETF, Bond, or Cash and Equivalents"

5. **无效的分组参数**
   - Error Code: `INVALID_GROUP_BY`
   - HTTP Status: 400
   - Message: "Invalid groupBy parameter. Must be assetStyle, assetClass, currency, or none"

### Frontend Error Handling

```typescript
// 统一的错误处理
try {
  await createAssetStyle(name);
} catch (error) {
  if (error.code === 'DUPLICATE_ASSET_STYLE') {
    showError('该资产风格名称已存在，请使用其他名称');
  } else {
    showError('创建失败，请稍后重试');
  }
}

// 删除 Asset Style 时的特殊处理
const handleDeleteAssetStyle = async (styleId: string) => {
  const usageCount = await getAssetStyleUsageCount(styleId);
  
  if (usageCount > 0) {
    // 显示对话框让用户选择替代的 Asset Style
    const newStyleId = await showReassignmentDialog(styleId);
    await deleteAssetStyle(styleId, newStyleId);
  } else {
    await deleteAssetStyle(styleId, '');
  }
};
```

## Testing Strategy

### Unit Tests

#### Backend Unit Tests

1. **AssetStyleService Tests**
   ```go
   // server/services/asset_style_service_test.go
   - TestCreateAssetStyle
   - TestCreateDuplicateAssetStyle (should fail)
   - TestGetUserAssetStyles
   - TestUpdateAssetStyle
   - TestDeleteAssetStyleWithReassignment
   - TestDeleteAssetStyleInUseWithoutReplacement (should fail)
   - TestCreateDefaultAssetStyle
   ```

2. **PortfolioService Tests** (扩展)
   ```go
   // server/services/portfolio_service_test.go
   - TestUpdatePortfolioMetadata
   - TestUpdatePortfolioMetadataInvalidAssetClass (should fail)
   - TestCheckPortfolioExists
   ```

3. **AnalyticsService Tests** (扩展)
   ```go
   // server/services/analytics_service_test.go
   - TestGetGroupedDashboardMetricsByAssetStyle
   - TestGetGroupedDashboardMetricsByAssetClass
   - TestGetGroupedDashboardMetricsByCurrency
   - TestGetGroupedDashboardMetricsInvalidGroupBy (should fail)
   ```

#### Frontend Unit Tests

1. **Component Tests**
   ```typescript
   // web/src/components/__tests__/AssetStyleManagement.test.tsx
   - renders asset style list
   - creates new asset style
   - updates asset style name
   - deletes asset style with reassignment dialog
   
   // web/src/components/__tests__/AssetClassDialog.test.tsx
   - renders with symbol name
   - shows asset style dropdown
   - shows asset class dropdown
   - calls onSave with selected values
   
   // web/src/components/__tests__/GroupedHoldingsView.test.tsx
   - renders grouped holdings
   - expands/collapses groups
   - shows correct percentages
   - calls onEditAsset when edit button clicked
   ```

2. **API Client Tests**
   ```typescript
   // web/src/api/__tests__/assetStyles.test.ts
   - getAssetStyles returns list
   - createAssetStyle sends correct payload
   - updateAssetStyle sends correct payload
   - deleteAssetStyle handles reassignment
   ```

### Integration Tests

1. **完整的添加交易流程**
   - 用户添加新股票的第一笔交易
   - 系统检测到 Portfolio 不存在
   - 显示 AssetClassDialog
   - 用户选择 Asset Style 和 Asset Class
   - 创建 Portfolio 和 Transaction
   - 验证数据正确保存

2. **分组查询流程**
   - 创建多个 Portfolio 和 Transaction
   - 设置不同的 Asset Style 和 Asset Class
   - 调用分组 API
   - 验证返回的分组数据正确
   - 验证百分比计算正确

3. **Asset Style 管理流程**
   - 创建 Asset Style
   - 将其分配给 Portfolio
   - 尝试删除（应该要求重新分配）
   - 重新分配到另一个 Asset Style
   - 删除成功
   - 验证 Portfolio 的 Asset Style 已更新

### End-to-End Tests

1. **用户完整使用流程**
   ```
   1. 用户登录
   2. 创建自定义 Asset Style（如 "Growth Stocks"）
   3. 添加第一笔 AAPL 交易
   4. 在对话框中选择 "Growth Stocks" 和 "Stock"
   5. 添加第一笔 VOO 交易
   6. 在对话框中选择 "Default" 和 "ETF"
   7. 切换到 "Asset Class" 分组模式
   8. 验证看到 Stock 和 ETF 两个分组
   9. 编辑 AAPL 的分类，改为 "Default"
   10. 验证分组视图更新
   11. 切换到 "Asset Style" 分组模式
   12. 验证看到正确的分组
   ```

## Implementation Notes

### 数据迁移

对于现有的 Portfolio 数据，需要进行数据迁移：

```go
// Migration script
func MigrateExistingPortfolios() error {
    // 1. 为每个用户创建 "Default" Asset Style
    // 2. 更新所有现有的 Portfolio，设置 asset_style_id 为 "Default"
    // 3. 设置 asset_class 为 "Stock"（默认值）
}
```

### 性能优化

1. **数据库索引**
   - 在 portfolios collection 上创建复合索引：`{user_id: 1, asset_style_id: 1}`
   - 在 portfolios collection 上创建复合索引：`{user_id: 1, asset_class: 1}`

2. **缓存策略**
   - Asset Styles 列表可以在前端缓存，因为变化不频繁
   - 分组查询结果可以在前端缓存 30 秒

3. **批量查询**
   - 在分组查询时，使用 MongoDB aggregation pipeline 一次性完成分组和聚合计算

### 用户体验优化

1. **首次使用引导**
   - 当用户第一次添加交易时，显示简短的提示说明 Asset Style 和 Asset Class 的作用

2. **快捷操作**
   - 在 AssetClassDialog 中提供"快速添加 Asset Style"的链接
   - 在分组视图中提供快速编辑按钮

3. **视觉反馈**
   - 分组切换时显示加载动画
   - 使用不同颜色区分不同的分组
   - 使用图标表示不同的 Asset Class

### 向后兼容性

- 现有的 API `/api/analytics/dashboard` 在不提供 `groupBy` 参数时保持原有行为
- 现有的 Portfolio 数据通过迁移脚本自动设置默认值
- 前端组件渐进增强，不影响现有功能

## Security Considerations

1. **权限验证**
   - 所有 Asset Style API 必须验证用户只能访问自己的数据
   - Portfolio 更新必须验证用户拥有该 Portfolio

2. **输入验证**
   - Asset Style 名称长度限制为 50 字符
   - Asset Class 必须是预定义的枚举值之一
   - 防止 SQL/NoSQL 注入

3. **数据完整性**
   - 删除 Asset Style 时必须处理关联的 Portfolio
   - 使用事务确保数据一致性（如果 MongoDB 版本支持）

## Future Enhancements

1. **更多分组维度**
   - 按行业（Industry）分组
   - 按地区（Region）分组
   - 自定义标签（Tags）

2. **高级筛选**
   - 组合多个分组维度
   - 按时间范围筛选

3. **导出功能**
   - 导出分组报告为 PDF/Excel
   - 分享分组视图

4. **AI 建议**
   - 根据股票代码自动建议 Asset Class
   - 根据持仓情况建议资产配置优化

# 实现计划

- [x] 1. 配置 Tailwind CSS dark mode 支持
  - 修改 `tailwind.config.js`，启用 `darkMode: 'class'` 策略
  - 扩展颜色配置，定义主题相关的颜色变量（如需要）
  - _需求: 5.1, 5.3_

- [x] 2. 创建主题管理核心功能
  - [x] 2.1 实现 ThemeContext 和 ThemeProvider
    - 创建 `src/contexts/ThemeContext.tsx` 文件
    - 定义 TypeScript 类型：`ThemeMode`、`ResolvedTheme`、`ThemeContextType`
    - 实现 `ThemeProvider` 组件，包含状态管理逻辑
    - 实现主题初始化逻辑（从 localStorage 读取或使用系统默认）
    - 实现系统主题监听（使用 `window.matchMedia`）
    - 实现主题切换时更新 DOM（`document.documentElement.classList`）
    - 实现 localStorage 持久化逻辑
    - _需求: 1.4, 1.5, 2.1, 2.2, 2.3, 5.2, 5.4_
  
  - [x] 2.2 创建 useTheme hook
    - 创建 `src/hooks/useTheme.ts` 文件
    - 实现 `useTheme` hook，提供便捷的 context 访问
    - 添加错误处理（在 Provider 外使用时抛出错误）
    - _需求: 5.2, 5.4_

- [x] 3. 在应用中集成 ThemeProvider
  - 修改 `src/App.tsx`，将 `ThemeProvider` 包装在最外层（在 `AuthProvider` 之外）
  - 确保 ThemeProvider 在应用启动时正确初始化
  - _需求: 1.5, 2.4_

- [x] 4. 实现主题切换 UI 组件
  - [x] 4.1 安装 Radix UI DropdownMenu 依赖
    - 运行 `npm install @radix-ui/react-dropdown-menu` 安装依赖包
    - _需求: 3.1_
  
  - [x] 4.2 创建 ThemeToggle 组件
    - 创建 `src/components/ThemeToggle.tsx` 文件
    - 使用 Radix UI DropdownMenu 实现下拉菜单
    - 添加三个主题选项：Light（Sun 图标）、Dark（Moon 图标）、System（Monitor 图标）
    - 使用 lucide-react 图标库（已存在于项目中）
    - 实现当前主题的视觉高亮
    - 添加 ARIA 属性以支持可访问性
    - 实现响应式设计（桌面端和移动端）
    - _需求: 3.1, 3.2, 3.3, 3.4_

- [x] 5. 将 ThemeToggle 集成到导航栏
  - 修改 `src/components/Navigation.tsx`
  - 在桌面导航栏中添加 ThemeToggle 组件（在 Logout 按钮之前）
  - 在移动端菜单中添加 ThemeToggle 组件
  - 确保在所有已登录页面中可见
  - _需求: 3.1, 3.5_

- [x] 6. 为核心布局组件添加深色主题样式
  - [x] 6.1 更新 Layout 组件
    - 修改 `src/components/Layout.tsx`
    - 为背景色添加 `dark:` 类（`bg-gray-50 dark:bg-gray-900`）
    - _需求: 4.1, 4.2_
  
  - [x] 6.2 更新 Navigation 组件
    - 修改 `src/components/Navigation.tsx`
    - 为导航栏背景、文字、按钮添加 `dark:` 类
    - 确保激活状态和悬停状态在深色主题下清晰可见
    - 更新移动端菜单的深色主题样式
    - _需求: 4.1, 4.2, 4.3_

- [x] 7. 为认证页面添加深色主题样式
  - [x] 7.1 更新 LoginPage 组件
    - 修改 `src/pages/LoginPage.tsx`
    - 为页面背景、卡片、表单输入框、按钮添加 `dark:` 类
    - 确保文字对比度符合 WCAG AA 标准
    - _需求: 4.1, 4.2, 4.3_
  
  - [x] 7.2 更新 RegisterPage 组件
    - 修改 `src/pages/RegisterPage.tsx`
    - 为页面背景、卡片、表单输入框、按钮添加 `dark:` 类
    - 确保文字对比度符合 WCAG AA 标准
    - _需求: 4.1, 4.2, 4.3_

- [x] 8. 为主要功能页面添加深色主题样式
  - [x] 8.1 更新 DashboardPage 组件
    - 修改 `src/pages/DashboardPage.tsx`
    - 为页面容器、标题、内容区域添加 `dark:` 类
    - _需求: 4.1, 4.2_
  
  - [x] 8.2 更新 HoldingsPage 组件
    - 修改 `src/pages/HoldingsPage.tsx`
    - 为页面容器、标题、内容区域添加 `dark:` 类
    - _需求: 4.1, 4.2_
  
  - [x] 8.3 更新 SearchPage 组件
    - 修改 `src/pages/SearchPage.tsx`
    - 为搜索框、结果列表添加 `dark:` 类
    - _需求: 4.1, 4.2_

- [x] 9. 为 UI 组件添加深色主题样式
  - [x] 9.1 更新 PortfolioSummaryCard 组件
    - 修改 `src/components/PortfolioSummaryCard.tsx`
    - 为卡片背景、边框、文字添加 `dark:` 类
    - _需求: 4.1, 4.2, 4.3_
  
  - [x] 9.2 更新 HoldingsTable 组件
    - 修改 `src/components/HoldingsTable.tsx`
    - 为表格背景、表头、行、边框添加 `dark:` 类
    - 确保悬停状态在深色主题下清晰可见
    - _需求: 4.1, 4.2, 4.3_
  
  - [x] 9.3 更新 TransactionsList 组件
    - 修改 `src/components/TransactionsList.tsx`
    - 为列表项、背景、文字添加 `dark:` 类
    - _需求: 4.1, 4.2_
  
  - [x] 9.4 更新 TransactionDialog 组件
    - 修改 `src/components/TransactionDialog.tsx`
    - 为对话框背景、表单输入框、按钮添加 `dark:` 类
    - _需求: 4.1, 4.2, 4.3_
  
  - [x] 9.5 更新 CurrencyToggle 组件
    - 修改 `src/components/CurrencyToggle.tsx`
    - 为切换按钮添加 `dark:` 类
    - _需求: 4.1, 4.3_

- [x] 10. 为辅助组件添加深色主题样式
  - [x] 10.1 更新 LoadingSpinner 组件
    - 修改 `src/components/LoadingSpinner.tsx`
    - 为加载动画颜色添加 `dark:` 类
    - _需求: 4.5_
  
  - [x] 10.2 更新 ErrorAlert 组件
    - 修改 `src/components/ErrorAlert.tsx`
    - 为错误提示背景、边框、文字添加 `dark:` 类
    - 确保错误状态在深色主题下有足够的视觉反馈
    - _需求: 4.5_

- [x] 11. 为图表组件添加主题适配
  - [x] 11.1 创建图表主题工具函数
    - 创建 `src/utils/chartTheme.ts` 文件
    - 实现 `getChartColors` 函数，根据主题返回不同的配色方案
    - 定义亮色和深色主题的图表颜色（文字、网格、工具提示、数据系列）
    - _需求: 4.4_
  
  - [x] 11.2 更新 AllocationPieChart 组件
    - 修改 `src/components/AllocationPieChart.tsx`
    - 使用 `useTheme` hook 获取当前主题
    - 应用 `getChartColors` 函数返回的颜色配置
    - 更新图表的文字、工具提示、数据颜色
    - _需求: 4.4_
  
  - [x] 11.3 更新 HistoricalPerformanceChart 组件
    - 修改 `src/components/HistoricalPerformanceChart.tsx`
    - 使用 `useTheme` hook 获取当前主题
    - 应用 `getChartColors` 函数返回的颜色配置
    - 更新图表的坐标轴、网格线、折线颜色
    - _需求: 4.4_

- [x] 12. 防止主题闪烁
  - 修改 `public/index.html`
  - 在 `<head>` 中添加内联脚本，在页面加载前应用主题
  - 从 localStorage 读取主题偏好并立即应用到 `document.documentElement`
  - _需求: 1.3, 1.5_

- [x] 13. 编写测试
  - [x] 13.1 为 ThemeContext 编写单元测试
    - 创建 `src/contexts/ThemeContext.test.tsx` 文件
    - 测试默认主题加载
    - 测试主题切换功能
    - 测试 localStorage 持久化
    - 测试系统主题监听
    - _需求: 1.4, 1.5, 2.1, 2.2, 2.3_
  
  - [x] 13.2 为 ThemeToggle 组件编写单元测试
    - 创建 `src/components/ThemeToggle.test.tsx` 文件
    - 测试渲染三个主题选项
    - 测试点击切换主题
    - 测试当前主题高亮显示
    - _需求: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 13.3 编写集成测试
    - 创建 `src/__tests__/theme-integration.test.tsx` 文件
    - 测试主题持久化（设置主题 → 刷新 → 验证）
    - 测试系统主题跟随
    - 测试组件在不同主题下的渲染
    - _需求: 1.5, 2.1, 2.4, 4.1_

- [x] 14. 手动测试和验证
  - [x] 14.1 跨浏览器测试
    - 在 Chrome、Firefox、Safari 中测试主题切换
    - 验证移动端响应式布局
    - _需求: 1.1, 1.2, 3.5_
  
  - [x] 14.2 可访问性测试
    - 测试键盘导航（Tab、Enter、Arrow keys、Escape）
    - 使用屏幕阅读器测试
    - 验证 ARIA 属性
    - _需求: 3.4_
  
  - [x] 14.3 视觉验证
    - 验证所有页面的颜色对比度（使用对比度检查工具）
    - 检查图表在两种主题下的可读性
    - 确认没有遗漏的组件或页面
    - _需求: 4.2, 4.3, 4.4, 4.5_

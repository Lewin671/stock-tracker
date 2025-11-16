// Asset Class visual identifiers
export type AssetClass = 'Stock' | 'ETF' | 'Bond' | 'Cash and Equivalents';

export interface AssetClassConfig {
  color: string;
  lightColor: string;
  darkColor: string;
  icon: string;
}

// Color scheme for different Asset Classes
export const assetClassColors: Record<AssetClass, AssetClassConfig> = {
  'Stock': {
    color: '#3B82F6', // blue-500
    lightColor: '#60A5FA', // blue-400
    darkColor: '#2563EB', // blue-600
    icon: '📈',
  },
  'ETF': {
    color: '#10B981', // green-500
    lightColor: '#34D399', // green-400
    darkColor: '#059669', // green-600
    icon: '📊',
  },
  'Bond': {
    color: '#F59E0B', // amber-500
    lightColor: '#FBBF24', // amber-400
    darkColor: '#D97706', // amber-600
    icon: '🏦',
  },
  'Cash and Equivalents': {
    color: '#8B5CF6', // violet-500
    lightColor: '#A78BFA', // violet-400
    darkColor: '#7C3AED', // violet-600
    icon: '💵',
  },
};

// Default color palette for other grouping modes (Asset Style, Currency, etc.)
export const defaultChartColors = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
  '#84CC16', // lime-500
  '#06B6D4', // cyan-500
  '#F43F5E', // rose-500
];

// Get color for a specific Asset Class
export const getAssetClassColor = (assetClass: string): string => {
  if (assetClass in assetClassColors) {
    return assetClassColors[assetClass as AssetClass].color;
  }
  return defaultChartColors[0];
};

// Get icon for a specific Asset Class
export const getAssetClassIcon = (assetClass: string): string => {
  if (assetClass in assetClassColors) {
    return assetClassColors[assetClass as AssetClass].icon;
  }
  return '📌';
};

// Generate colors for grouped data based on grouping mode
export const getGroupColors = (
  groupNames: string[],
  groupingMode: 'assetStyle' | 'assetClass' | 'currency' | 'none'
): string[] => {
  if (groupingMode === 'assetClass') {
    // Use Asset Class specific colors
    return groupNames.map(name => getAssetClassColor(name));
  }
  
  // Use default color palette for other modes
  return groupNames.map((_, index) => defaultChartColors[index % defaultChartColors.length]);
};

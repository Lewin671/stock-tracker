import { ResolvedTheme } from '../contexts/ThemeContext';

export interface ChartColors {
  text: string;
  grid: string;
  tooltip: string;
  colors: string[];
}

export const getChartColors = (theme: ResolvedTheme): ChartColors => {
  return theme === 'dark' ? {
    text: '#e5e7eb',      // gray-200
    grid: '#374151',      // gray-700
    tooltip: '#1f2937',   // gray-800
    colors: [
      '#60a5fa',          // blue-400
      '#34d399',          // emerald-400
      '#fbbf24',          // amber-400
      '#f87171',          // red-400
      '#a78bfa',          // violet-400
      '#fb923c',          // orange-400
      '#2dd4bf',          // teal-400
      '#f472b6',          // pink-400
    ],
  } : {
    text: '#1f2937',      // gray-800
    grid: '#e5e7eb',      // gray-200
    tooltip: '#ffffff',   // white
    colors: [
      '#3b82f6',          // blue-500
      '#10b981',          // emerald-500
      '#f59e0b',          // amber-500
      '#ef4444',          // red-500
      '#8b5cf6',          // violet-500
      '#f97316',          // orange-500
      '#14b8a6',          // teal-500
      '#ec4899',          // pink-500
    ],
  };
};

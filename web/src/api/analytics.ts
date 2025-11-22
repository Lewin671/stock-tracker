import axiosInstance from './axios';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

export type GroupingMode = 'assetStyle' | 'assetClass' | 'currency' | 'none';

export interface AllocationItem {
  symbol: string;
  value: number;
  percentage: number;
}

export interface DashboardMetrics {
  totalValue: number;
  totalGain: number;
  percentageReturn: number;
  dayChange: number;
  dayChangePercent: number;
  allocation: AllocationItem[];
  currency: string;
}

export interface Holding {
  symbol: string;
  name?: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  currency: string;
  portfolioId?: string;
}

export interface GroupedHolding {
  groupName: string;
  groupValue: number;
  percentage: number;
  holdings: Holding[];
}

export interface GroupedDashboardMetrics {
  totalValue: number;
  totalGain: number;
  percentageReturn: number;
  dayChange: number;
  dayChangePercent: number;
  groups: GroupedHolding[];
  currency: string;
  groupBy: GroupingMode;
}

/**
 * Get dashboard metrics with optional grouping
 * Results are cached for 30 seconds to reduce API calls
 */
export const getDashboardMetrics = async (
  currency: string,
  groupBy?: GroupingMode,
  skipCache: boolean = false
): Promise<DashboardMetrics | GroupedDashboardMetrics> => {
  const effectiveGroupBy = groupBy || 'none';
  const cacheKey = CACHE_KEYS.DASHBOARD_METRICS(currency, effectiveGroupBy);

  // Check cache first unless explicitly skipped
  if (!skipCache) {
    const cached = cache.get<DashboardMetrics | GroupedDashboardMetrics>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const params: any = { currency };
  
  if (groupBy && groupBy !== 'none') {
    params.groupBy = groupBy;
  }
  
  const response = await axiosInstance.get('/api/analytics/dashboard', { params });
  const data = response.data;

  // Cache the result
  cache.set(cacheKey, data, CACHE_TTL.DASHBOARD_METRICS);

  return data;
};

/**
 * Invalidate dashboard metrics cache
 * Call this after any transaction or portfolio metadata changes
 */
export const invalidateDashboardCache = (): void => {
  cache.invalidatePattern(/^dashboard_metrics_/);
};

// Type guard to check if response is grouped
export const isGroupedMetrics = (
  metrics: DashboardMetrics | GroupedDashboardMetrics
): metrics is GroupedDashboardMetrics => {
  return 'groups' in metrics && 'groupBy' in metrics;
};

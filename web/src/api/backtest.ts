import axiosInstance from './axios';

// API response types
export interface BacktestResponse {
  period: BacktestPeriod;
  currency: string;
  performance: BacktestDataPoint[];
  metrics: BacktestMetrics;
  assetContributions: AssetContribution[];
  benchmark?: BenchmarkInfo;
}

export interface BacktestPeriod {
  startDate: string;
  endDate: string;
}

export interface BacktestDataPoint {
  date: string;
  portfolioValue: number;
  portfolioReturn: number;
  benchmarkReturn?: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  excessReturn?: number;
}

export interface AssetContribution {
  symbol: string;
  name: string;
  weight: number;
  return: number;
  returnPercent: number;
  contribution: number;
  contributionPercent: number;
}

export interface BenchmarkInfo {
  symbol: string;
  name: string;
  totalReturn: number;
}

/**
 * Run a portfolio backtest
 */
export const runBacktest = async (
  startDate: string,
  endDate: string,
  currency: string,
  benchmark?: string
): Promise<BacktestResponse> => {
  const params: any = {
    startDate,
    endDate,
    currency,
  };

  if (benchmark) {
    params.benchmark = benchmark;
  }

  const response = await axiosInstance.get('/api/backtest', { params });
  return response.data;
};

import axiosInstance from './axios';
import { invalidateDashboardCache } from './analytics';

export interface Portfolio {
  id: string;
  userId: string;
  symbol: string;
  assetStyleId?: string;
  assetClass?: 'Stock' | 'ETF' | 'Bond' | 'Cash and Equivalents';
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePortfolioMetadataRequest {
  assetStyleId: string;
  assetClass: 'Stock' | 'ETF' | 'Bond' | 'Cash and Equivalents';
}

export interface CheckPortfolioResponse {
  exists: boolean;
  portfolio?: Portfolio;
}

/**
 * Check if a portfolio exists for a given symbol
 */
export const checkPortfolioExists = async (symbol: string): Promise<CheckPortfolioResponse> => {
  const response = await axiosInstance.get(`/api/portfolios/check/${symbol}`);
  return response.data;
};

/**
 * Update portfolio metadata (asset style and asset class)
 * Invalidates dashboard cache since grouping data may have changed
 */
export const updatePortfolioMetadata = async (
  portfolioId: string,
  assetStyleId: string,
  assetClass: 'Stock' | 'ETF' | 'Bond' | 'Cash and Equivalents'
): Promise<void> => {
  await axiosInstance.put(`/api/portfolios/${portfolioId}/metadata`, {
    assetStyleId,
    assetClass,
  });

  // Invalidate dashboard cache since portfolio metadata changed
  invalidateDashboardCache();
};

/**
 * Get portfolio details
 */
export const getPortfolio = async (portfolioId: string): Promise<Portfolio> => {
  const response = await axiosInstance.get(`/api/portfolios/${portfolioId}`);
  return response.data.portfolio;
};

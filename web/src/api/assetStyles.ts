import axiosInstance from './axios';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';

export interface AssetStyle {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetStyleWithUsage extends AssetStyle {
  usageCount: number;
}

export interface CreateAssetStyleRequest {
  name: string;
}

export interface UpdateAssetStyleRequest {
  name: string;
}

export interface DeleteAssetStyleRequest {
  newStyleId: string;
}

/**
 * Get all asset styles for the current user
 * Results are cached for 5 minutes to reduce API calls
 */
export const getAssetStyles = async (skipCache: boolean = false): Promise<AssetStyle[]> => {
  // Check cache first unless explicitly skipped
  if (!skipCache) {
    const cached = cache.get<AssetStyle[]>(CACHE_KEYS.ASSET_STYLES);
    if (cached) {
      return cached;
    }
  }

  const response = await axiosInstance.get('/api/asset-styles');
  const data = response.data.assetStyles || [];

  // Cache the result
  cache.set(CACHE_KEYS.ASSET_STYLES, data, CACHE_TTL.ASSET_STYLES);

  return data;
};

/**
 * Create a new asset style
 * Invalidates the asset styles cache
 */
export const createAssetStyle = async (name: string): Promise<AssetStyle> => {
  const response = await axiosInstance.post('/api/asset-styles', { name });
  
  // Invalidate cache since we created a new style
  cache.invalidate(CACHE_KEYS.ASSET_STYLES);
  
  return response.data;
};

/**
 * Update an existing asset style
 * Invalidates the asset styles cache
 */
export const updateAssetStyle = async (id: string, name: string): Promise<void> => {
  await axiosInstance.put(`/api/asset-styles/${id}`, { name });
  
  // Invalidate cache since we updated a style
  cache.invalidate(CACHE_KEYS.ASSET_STYLES);
};

/**
 * Delete an asset style and reassign portfolios to a new style
 * Invalidates the asset styles cache
 */
export const deleteAssetStyle = async (id: string, newStyleId?: string): Promise<void> => {
  const params = newStyleId ? { newStyleId } : {};
  await axiosInstance.delete(`/api/asset-styles/${id}`, { params });
  
  // Invalidate cache since we deleted a style
  cache.invalidate(CACHE_KEYS.ASSET_STYLES);
};

/**
 * Get usage count for an asset style
 */
export const getAssetStyleUsageCount = async (id: string): Promise<number> => {
  const response = await axiosInstance.get(`/api/asset-styles/${id}/usage`);
  return response.data.count;
};

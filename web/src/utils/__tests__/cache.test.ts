import { cache, CACHE_KEYS, CACHE_TTL } from '../cache';

describe('Cache Utility', () => {
  beforeEach(() => {
    cache.clear();
  });

  afterEach(() => {
    cache.clear();
  });

  it('should store and retrieve values', () => {
    const testData = { id: '1', name: 'Test' };
    cache.set('test-key', testData, 1000);

    const retrieved = cache.get('test-key');
    expect(retrieved).toEqual(testData);
  });

  it('should return null for non-existent keys', () => {
    const retrieved = cache.get('non-existent');
    expect(retrieved).toBeNull();
  });

  it('should expire entries after TTL', async () => {
    const testData = { id: '1', name: 'Test' };
    cache.set('test-key', testData, 50); // 50ms TTL

    // Should exist immediately
    expect(cache.get('test-key')).toEqual(testData);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should be expired
    expect(cache.get('test-key')).toBeNull();
  });

  it('should invalidate specific keys', () => {
    cache.set('key1', 'value1', 1000);
    cache.set('key2', 'value2', 1000);

    cache.invalidate('key1');

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should invalidate keys matching pattern', () => {
    cache.set('dashboard_metrics_USD_assetStyle', { data: 1 }, 1000);
    cache.set('dashboard_metrics_RMB_assetClass', { data: 2 }, 1000);
    cache.set('asset_styles', { data: 3 }, 1000);

    cache.invalidatePattern(/^dashboard_metrics_/);

    expect(cache.get('dashboard_metrics_USD_assetStyle')).toBeNull();
    expect(cache.get('dashboard_metrics_RMB_assetClass')).toBeNull();
    expect(cache.get('asset_styles')).toEqual({ data: 3 });
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1', 1000);
    cache.set('key2', 'value2', 1000);

    expect(cache.size()).toBe(2);

    cache.clear();

    expect(cache.size()).toBe(0);
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should generate correct cache keys', () => {
    const key1 = CACHE_KEYS.DASHBOARD_METRICS('USD', 'assetStyle');
    const key2 = CACHE_KEYS.DASHBOARD_METRICS('RMB', 'assetClass');

    expect(key1).toBe('dashboard_metrics_USD_assetStyle');
    expect(key2).toBe('dashboard_metrics_RMB_assetClass');
  });

  it('should have correct TTL values', () => {
    expect(CACHE_TTL.ASSET_STYLES).toBe(5 * 60 * 1000); // 5 minutes
    expect(CACHE_TTL.DASHBOARD_METRICS).toBe(30 * 1000); // 30 seconds
  });
});

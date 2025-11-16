import React, { useState, useEffect } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import PortfolioSummaryCard from '../components/PortfolioSummaryCard';
import AllocationPieChart from '../components/AllocationPieChart';
import HistoricalPerformanceChart from '../components/HistoricalPerformanceChart';
import GroupedHoldingsView from '../components/GroupedHoldingsView';
import {
  getDashboardMetrics,
  isGroupedMetrics,
  DashboardMetrics,
  GroupedDashboardMetrics,
  GroupingMode,
} from '../api/analytics';
import { loadGroupingMode, saveGroupingMode } from '../utils/groupingMode';
import { useToast } from '../contexts/ToastContext';
import { formatErrorMessage } from '../utils/errorHandler';

const DashboardPage: React.FC = () => {
  const { showError } = useToast();
  const [currency, setCurrency] = useState<'USD' | 'RMB'>('USD');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>(() => loadGroupingMode());
  const [metrics, setMetrics] = useState<DashboardMetrics | GroupedDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [currency, groupingMode]);

  const fetchDashboardMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDashboardMetrics(currency, groupingMode);
      setMetrics(data);
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to load dashboard', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (value: string) => {
    if (value === 'USD' || value === 'RMB') {
      setCurrency(value);
    }
  };

  const handleGroupingModeChange = (value: string) => {
    if (value && ['assetStyle', 'assetClass', 'currency', 'none'].includes(value)) {
      const newMode = value as GroupingMode;
      setGroupingMode(newMode);
      saveGroupingMode(newMode);
    }
  };

  const handleViewTransactions = (symbol: string) => {
    // Navigate to holdings page with symbol filter
    window.location.href = `/holdings?symbol=${symbol}`;
  };

  const handleEditAsset = (portfolioId: string, symbol: string) => {
    // This will be implemented when EditAssetMetadataDialog is integrated
    console.log('Edit asset:', portfolioId, symbol);
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Portfolio Dashboard</h1>
              {/* Currency Toggle */}
              <ToggleGroup.Root
                type="single"
                value={currency}
                onValueChange={handleCurrencyChange}
                className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1"
              >
                <ToggleGroup.Item
                  value="USD"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-600 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 dark:data-[state=off]:text-gray-300 data-[state=off]:hover:text-gray-900 dark:data-[state=off]:hover:text-white"
                >
                  USD
                </ToggleGroup.Item>
                <ToggleGroup.Item
                  value="RMB"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-600 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 dark:data-[state=off]:text-gray-300 data-[state=off]:hover:text-gray-900 dark:data-[state=off]:hover:text-white"
                >
                  RMB
                </ToggleGroup.Item>
              </ToggleGroup.Root>
            </div>

            {/* Grouping Mode Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Group by:</span>
              <ToggleGroup.Root
                type="single"
                value={groupingMode}
                onValueChange={handleGroupingModeChange}
                className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex-wrap gap-1"
              >
                <ToggleGroup.Item
                  value="none"
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-600 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 dark:data-[state=off]:text-gray-300 data-[state=off]:hover:text-gray-900 dark:data-[state=off]:hover:text-white whitespace-nowrap"
                >
                  Individual
                </ToggleGroup.Item>
                <ToggleGroup.Item
                  value="assetStyle"
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-600 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 dark:data-[state=off]:text-gray-300 data-[state=off]:hover:text-gray-900 dark:data-[state=off]:hover:text-white whitespace-nowrap"
                >
                  Style
                </ToggleGroup.Item>
                <ToggleGroup.Item
                  value="assetClass"
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-600 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 dark:data-[state=off]:text-gray-300 data-[state=off]:hover:text-gray-900 dark:data-[state=off]:hover:text-white whitespace-nowrap"
                >
                  Class
                </ToggleGroup.Item>
                <ToggleGroup.Item
                  value="currency"
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-600 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 dark:data-[state=off]:text-gray-300 data-[state=off]:hover:text-gray-900 dark:data-[state=off]:hover:text-white whitespace-nowrap"
                >
                  Currency
                </ToggleGroup.Item>
              </ToggleGroup.Root>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={fetchDashboardMetrics}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
            >
              Try again
            </button>
          </div>
        ) : metrics ? (
          <div className="space-y-6">
            {/* Portfolio Summary */}
            <PortfolioSummaryCard
              totalValue={metrics.totalValue}
              totalGain={metrics.totalGain}
              percentageReturn={metrics.percentageReturn}
              currency={currency}
            />

            {isGroupedMetrics(metrics) ? (
              /* Grouped View */
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Allocation Chart for Grouped Data */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {groupingMode === 'assetStyle' && 'Allocation by Asset Style'}
                      {groupingMode === 'assetClass' && 'Allocation by Asset Class'}
                      {groupingMode === 'currency' && 'Allocation by Currency'}
                    </h2>
                    <AllocationPieChart
                      data={metrics.groups.map(g => ({
                        symbol: g.groupName,
                        value: g.groupValue,
                        percentage: g.percentage,
                      }))}
                      groupingMode={groupingMode}
                      currency={currency}
                    />
                  </div>

                  {/* Historical Performance Chart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Historical Performance</h2>
                    <HistoricalPerformanceChart currency={currency} />
                  </div>
                </div>

                {/* Grouped Holdings */}
                <GroupedHoldingsView
                  groups={metrics.groups}
                  currency={currency}
                  groupingMode={groupingMode}
                  onViewTransactions={handleViewTransactions}
                  onEditAsset={handleEditAsset}
                />
              </>
            ) : (
              /* Individual Holdings View */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Allocation Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Allocation</h2>
                  <AllocationPieChart 
                    data={metrics.allocation} 
                    groupingMode="none"
                    currency={currency}
                  />
                </div>

                {/* Historical Performance Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Historical Performance</h2>
                  <HistoricalPerformanceChart currency={currency} />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </Layout>
  );
};

export default DashboardPage;

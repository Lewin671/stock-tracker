import React, { useState, useEffect } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Loader2 } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PortfolioSummaryCard } from '../components/PortfolioSummaryCard';
import { WatchlistWidget } from '../components/WatchlistWidget';
import AllocationPieChart from '../components/AllocationPieChart';
import HistoricalPerformanceChart from '../components/HistoricalPerformanceChart';
import GroupedHoldingsView from '../components/GroupedHoldingsView';
import HoldingsTable from '../components/HoldingsTable';
import {
  getDashboardMetrics,
  isGroupedMetrics,
  DashboardMetrics,
  GroupedDashboardMetrics,
  GroupingMode,
  Holding,
} from '../api/analytics';
import { loadGroupingMode, saveGroupingMode } from '../utils/groupingMode';
import { useToast } from '../contexts/ToastContext';
import { formatErrorMessage } from '../utils/errorHandler';
import axiosInstance from '../api/axios';

const DashboardPage: React.FC = () => {
  const { showError } = useToast();
  const [currency, setCurrency] = useState<'USD' | 'RMB'>('USD');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>(() => loadGroupingMode());
  const [metrics, setMetrics] = useState<DashboardMetrics | GroupedDashboardMetrics | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
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

      // For 'none' mode, fetch full holdings data
      if (groupingMode === 'none') {
        const response = await axiosInstance.get('/api/portfolio/holdings', {
          params: { currency },
        });
        const holdingsData = response.data.holdings || [];
        setHoldings(Array.isArray(holdingsData) ? holdingsData : []);
      }
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
    window.location.href = `/holdings?symbol=${symbol}`;
  };

  const handleEditAsset = (portfolioId: string, symbol: string) => {
    console.log('Edit asset:', portfolioId, symbol);
  };

  return (
    <DashboardLayout>
      {/* Top Bar Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Currency:</span>
            <ToggleGroup.Root
              type="single"
              value={currency}
              onValueChange={handleCurrencyChange}
              className="inline-flex bg-muted rounded-lg p-1"
            >
              <ToggleGroup.Item
                value="USD"
                className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
              >
                USD
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="RMB"
                className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
              >
                RMB
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Group by:</span>
            <ToggleGroup.Root
              type="single"
              value={groupingMode}
              onValueChange={handleGroupingModeChange}
              className="inline-flex bg-muted rounded-lg p-1"
            >
              <ToggleGroup.Item
                value="none"
                className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
              >
                None
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="assetStyle"
                className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
              >
                Style
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="assetClass"
                className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
              >
                Class
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="currency"
                className="px-3 py-1 text-xs font-medium rounded-md transition-all data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground hover:text-foreground"
              >
                Currency
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <p>{error}</p>
          <button
            onClick={fetchDashboardMetrics}
            className="mt-2 text-sm font-medium hover:underline"
          >
            Try again
          </button>
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Portfolio Summary & Charts */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            <PortfolioSummaryCard
              totalValue={metrics.totalValue}
              dayChange={metrics.dayChange}
              dayChangePercent={metrics.dayChangePercent}
              totalGainLoss={metrics.totalGain}
              totalGainLossPercent={metrics.percentageReturn}
              currency={currency}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <HistoricalPerformanceChart currency={currency} />
              <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <h3 className="font-semibold text-lg mb-4">Allocation</h3>
                <div className="h-[400px]">
                  <AllocationPieChart
                    data={
                      isGroupedMetrics(metrics)
                        ? metrics.groups.map((g) => ({
                          symbol: g.groupName,
                          name: g.groupName,
                          value: g.groupValue,
                          percentage: g.percentage,
                        }))
                        : metrics.allocation
                    }
                    groupingMode={groupingMode}
                    currency={currency}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-4">Holdings</h3>
              {isGroupedMetrics(metrics) ? (
                <GroupedHoldingsView
                  groups={metrics.groups}
                  currency={currency}
                  groupingMode={groupingMode}
                  onViewTransactions={handleViewTransactions}
                  onEditAsset={handleEditAsset}
                />
              ) : (
                <HoldingsTable
                  holdings={holdings}
                  currency={currency}
                  onViewTransactions={handleViewTransactions}
                  onEditAsset={handleEditAsset}
                />
              )}
            </div>
          </div>

          {/* Right Column: Watchlist */}
          <div className="col-span-12 lg:col-span-3">
            <WatchlistWidget />
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
};

export default DashboardPage;

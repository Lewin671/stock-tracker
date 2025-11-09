import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import PortfolioSummaryCard from '../components/PortfolioSummaryCard';
import AllocationPieChart from '../components/AllocationPieChart';
import HistoricalPerformanceChart from '../components/HistoricalPerformanceChart';

interface DashboardMetrics {
  totalValue: number;
  totalGain: number;
  percentageReturn: number;
  allocation: AllocationItem[];
  currency: string;
}

interface AllocationItem {
  symbol: string;
  value: number;
  percentage: number;
}

const DashboardPage: React.FC = () => {
  const [currency, setCurrency] = useState<'USD' | 'RMB'>('USD');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [currency]);

  const fetchDashboardMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.get('/api/analytics/dashboard', {
        params: { currency },
      });
      setMetrics(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (value: string) => {
    if (value === 'USD' || value === 'RMB') {
      setCurrency(value);
    }
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
            {/* Currency Toggle */}
            <ToggleGroup.Root
              type="single"
              value={currency}
              onValueChange={handleCurrencyChange}
              className="inline-flex bg-gray-100 rounded-lg p-1"
            >
              <ToggleGroup.Item
                value="USD"
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 data-[state=off]:hover:text-gray-900"
              >
                USD
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="RMB"
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 data-[state=off]:hover:text-gray-900"
              >
                RMB
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchDashboardMetrics}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Summary */}
            <div className="lg:col-span-2">
              <PortfolioSummaryCard
                totalValue={metrics.totalValue}
                totalGain={metrics.totalGain}
                percentageReturn={metrics.percentageReturn}
                currency={currency}
              />
            </div>

            {/* Allocation Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Allocation</h2>
              <AllocationPieChart data={metrics.allocation} />
            </div>

            {/* Historical Performance Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Historical Performance</h2>
              <HistoricalPerformanceChart currency={currency} />
            </div>
          </div>
        ) : null}
      </main>
    </Layout>
  );
};

export default DashboardPage;

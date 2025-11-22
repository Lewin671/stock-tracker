import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import BacktestControls from '../components/BacktestControls';
import BacktestChart from '../components/BacktestChart';
import BacktestMetrics from '../components/BacktestMetrics';
import AssetContribution from '../components/AssetContribution';
import { runBacktest, BacktestResponse } from '../api/backtest';
import { useToast } from '../contexts/ToastContext';
import { formatErrorMessage } from '../utils/errorHandler';

const BacktestPage: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [currency, setCurrency] = useState<'USD' | 'RMB'>('USD');
  
  // Default to 1 year ago
  const defaultStartDate = new Date();
  defaultStartDate.setFullYear(defaultStartDate.getFullYear() - 1);
  
  const [startDate, setStartDate] = useState<Date>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [benchmark, setBenchmark] = useState<string | null>(null);
  const [backtestData, setBacktestData] = useState<BacktestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);

    try {
      // Format dates as YYYY-MM-DD
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const data = await runBacktest(
        startDateStr,
        endDateStr,
        currency,
        benchmark || undefined
      );

      setBacktestData(data);
      showSuccess('回测完成', '回测计算成功完成');
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      showError('回测失败', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">投资组合回测</h2>
      </div>

      {/* Controls */}
      <BacktestControls
        currency={currency}
        startDate={startDate}
        endDate={endDate}
        benchmark={benchmark}
        onCurrencyChange={setCurrency}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onBenchmarkChange={setBenchmark}
        onRunBacktest={handleRunBacktest}
        loading={loading}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <p>{error}</p>
          <button
            onClick={handleRunBacktest}
            className="mt-2 text-sm font-medium hover:underline"
          >
            重试
          </button>
        </div>
      )}

      {/* Results */}
      {backtestData && !loading && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <BacktestMetrics metrics={backtestData.metrics} currency={currency} />

          {/* Performance Chart */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4">累计收益曲线</h3>
            <BacktestChart
              data={backtestData.performance}
              currency={currency}
            />
          </div>

          {/* Asset Contributions */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4">资产贡献度</h3>
            <AssetContribution
              contributions={backtestData.assetContributions}
              currency={currency}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!backtestData && !loading && !error && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-lg">选择回测参数并点击"运行回测"开始</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default BacktestPage;

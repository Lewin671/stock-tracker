import React, { useState, useEffect } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Play } from 'lucide-react';

interface BacktestControlsProps {
  currency: 'USD' | 'RMB';
  startDate: Date;
  endDate: Date;
  benchmark: string | null;
  onCurrencyChange: (currency: 'USD' | 'RMB') => void;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onBenchmarkChange: (benchmark: string | null) => void;
  onRunBacktest: () => void;
  loading: boolean;
}

const BacktestControls: React.FC<BacktestControlsProps> = ({
  currency,
  startDate,
  endDate,
  benchmark,
  onCurrencyChange,
  onStartDateChange,
  onEndDateChange,
  onBenchmarkChange,
  onRunBacktest,
  loading,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate dates whenever they change
  useEffect(() => {
    validateDates();
  }, [startDate, endDate]);

  const validateDates = () => {
    if (startDate >= endDate) {
      setValidationError('开始日期必须早于结束日期');
      return false;
    }

    if (endDate > new Date()) {
      setValidationError('结束日期不能在未来');
      return false;
    }

    const duration = endDate.getTime() - startDate.getTime();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const tenYears = 10 * 365 * 24 * 60 * 60 * 1000;

    if (duration < oneMonth) {
      setValidationError('回测期间至少需要1个月');
      return false;
    }

    if (duration > tenYears) {
      setValidationError('回测期间不能超过10年');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleCurrencyChange = (value: string) => {
    if (value === 'USD' || value === 'RMB') {
      onCurrencyChange(value);
    }
  };

  const handleBenchmarkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onBenchmarkChange(value === '' ? null : value);
  };

  const handleQuickDateSelect = (months: number) => {
    const newStartDate = new Date();
    newStartDate.setMonth(newStartDate.getMonth() - months);
    onStartDateChange(newStartDate);
    onEndDateChange(new Date());
  };

  const handleRunBacktest = () => {
    if (validateDates()) {
      onRunBacktest();
    }
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    onStartDateChange(newDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    onEndDateChange(newDate);
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 mb-6">
      <div className="space-y-4">
        {/* Currency Selection */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground min-w-[80px]">货币:</span>
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

        {/* Date Range Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-muted-foreground min-w-[80px]">
              开始日期:
            </label>
            <input
              type="date"
              value={formatDateForInput(startDate)}
              onChange={handleStartDateChange}
              className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-muted-foreground min-w-[80px]">
              结束日期:
            </label>
            <input
              type="date"
              value={formatDateForInput(endDate)}
              onChange={handleEndDateChange}
              className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
              disabled={loading}
            />
          </div>
        </div>

        {/* Quick Date Selection */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground min-w-[80px]">快捷选择:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickDateSelect(12)}
              className="px-3 py-1 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              disabled={loading}
            >
              1年
            </button>
            <button
              onClick={() => handleQuickDateSelect(36)}
              className="px-3 py-1 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              disabled={loading}
            >
              3年
            </button>
            <button
              onClick={() => handleQuickDateSelect(60)}
              className="px-3 py-1 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              disabled={loading}
            >
              5年
            </button>
          </div>
        </div>

        {/* Benchmark Selection */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-muted-foreground min-w-[80px]">
            基准指数:
          </label>
          <select
            value={benchmark || ''}
            onChange={handleBenchmarkChange}
            className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
            disabled={loading}
          >
            <option value="">无基准</option>
            <option value="^GSPC">S&P 500</option>
            <option value="^IXIC">NASDAQ</option>
            <option value="^DJI">Dow Jones</option>
            <option value="000001.SS">上证指数</option>
            <option value="399001.SZ">深证成指</option>
          </select>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="text-sm text-destructive">
            {validationError}
          </div>
        )}

        {/* Run Button */}
        <div className="flex justify-end">
          <button
            onClick={handleRunBacktest}
            disabled={loading || !!validationError}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4" />
            {loading ? '运行中...' : '运行回测'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BacktestControls;

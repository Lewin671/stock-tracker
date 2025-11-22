import React from 'react';
import { MetricCard } from './ui/MetricCard';
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, Clock } from 'lucide-react';

export interface PerformanceMetrics {
  totalReturn: {
    absolute: number;
    percentage: number;
  };
  periodReturn: {
    absolute: number;
    percentage: number;
  };
  bestDay: {
    date: string;
    change: number;
    changePercent: number;
  };
  worstDay: {
    date: string;
    change: number;
    changePercent: number;
  };
  maxDrawdown: {
    percentage: number;
    absolute: number;
    peakDate: string;
    troughDate: string;
    peakValue: number;
    troughValue: number;
  };
  recoveryTime: {
    status: 'recovered' | 'in_drawdown';
    days: number;
    averageDays: number;
  };
}

interface PerformanceMetricsGridProps {
  metrics: PerformanceMetrics | null;
  currency: 'USD' | 'RMB';
  period: string;
  loading?: boolean;
}

const PerformanceMetricsGrid: React.FC<PerformanceMetricsGridProps> = ({
  metrics,
  currency,
  period,
  loading = false,
}) => {
  const currencySymbol = currency === 'USD' ? '$' : '¥';

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format currency value
  const formatCurrency = (value: number) => {
    return `${currencySymbol}${Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const totalReturnTrend = metrics.totalReturn.percentage >= 0 ? 'up' : 'down';
  const periodReturnTrend = metrics.periodReturn.percentage >= 0 ? 'up' : 'down';
  const isInDrawdown = metrics.recoveryTime.status === 'in_drawdown';
  const hasSignificantDrawdown = metrics.maxDrawdown.percentage > 5;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Total Return Card */}
      <MetricCard
        title="Total Return"
        value={formatCurrency(metrics.totalReturn.absolute)}
        subtitle={formatPercentage(metrics.totalReturn.percentage)}
        trend={totalReturnTrend}
        icon={totalReturnTrend === 'up' ? TrendingUp : TrendingDown}
        tooltip="Total gain or loss since the first transaction"
      />

      {/* Period Return Card */}
      <MetricCard
        title={`${period} Return`}
        value={formatCurrency(metrics.periodReturn.absolute)}
        subtitle={formatPercentage(metrics.periodReturn.percentage)}
        trend={periodReturnTrend}
        icon={Calendar}
        tooltip={`Return for the selected ${period} period`}
      />

      {/* Best Day Card */}
      <MetricCard
        title="Best Day"
        value={formatCurrency(metrics.bestDay.change)}
        subtitle={`${formatDate(metrics.bestDay.date)} • ${formatPercentage(metrics.bestDay.changePercent)}`}
        trend="up"
        icon={TrendingUp}
        tooltip="Best performing day in the selected period"
      />

      {/* Worst Day Card */}
      <MetricCard
        title="Worst Day"
        value={formatCurrency(metrics.worstDay.change)}
        subtitle={`${formatDate(metrics.worstDay.date)} • ${formatPercentage(metrics.worstDay.changePercent)}`}
        trend="down"
        icon={TrendingDown}
        tooltip="Worst performing day in the selected period"
      />

      {/* Maximum Drawdown Card */}
      <MetricCard
        title="Max Drawdown"
        value={`${metrics.maxDrawdown.percentage.toFixed(2)}%`}
        subtitle={`${formatCurrency(metrics.maxDrawdown.absolute)} • ${formatDate(metrics.maxDrawdown.peakDate)} to ${formatDate(metrics.maxDrawdown.troughDate)}`}
        trend="down"
        icon={AlertTriangle}
        highlight={hasSignificantDrawdown && metrics.maxDrawdown.percentage > 10}
        tooltip="Largest peak-to-trough decline in portfolio value"
      />

      {/* Recovery Time Card */}
      {hasSignificantDrawdown && (
        <MetricCard
          title="Recovery Time"
          value={
            isInDrawdown
              ? 'In Drawdown'
              : `${metrics.recoveryTime.days} days`
          }
          subtitle={
            isInDrawdown
              ? `${metrics.recoveryTime.days} days since peak`
              : metrics.recoveryTime.averageDays > 0
              ? `Avg: ${Math.round(metrics.recoveryTime.averageDays)} days`
              : undefined
          }
          trend={isInDrawdown ? 'down' : 'up'}
          icon={Clock}
          highlight={isInDrawdown}
          tooltip={
            isInDrawdown
              ? 'Portfolio is currently below its peak value'
              : 'Time taken to recover from the last significant drawdown'
          }
        />
      )}
    </div>
  );
};

export default PerformanceMetricsGrid;

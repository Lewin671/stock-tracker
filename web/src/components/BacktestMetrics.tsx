import React from 'react';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Target, Award } from 'lucide-react';
import { BacktestMetrics as BacktestMetricsType } from '../api/backtest';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface BacktestMetricsProps {
  metrics: BacktestMetricsType;
  currency: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, trend = 'neutral' }) => {
  const getTrendColor = () => {
    if (trend === 'positive') return 'text-green-600 dark:text-green-400';
    if (trend === 'negative') return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold mt-2 ${getTrendColor()}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${trend === 'positive' ? 'bg-green-100 dark:bg-green-900/20' : trend === 'negative' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-muted'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const BacktestMetrics: React.FC<BacktestMetricsProps> = ({ metrics, currency }) => {
  const getTrend = (value: number): 'positive' | 'negative' | 'neutral' => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Return */}
      <MetricCard
        title="总收益"
        value={formatPercentage(metrics.totalReturnPercent)}
        subtitle={formatCurrency(metrics.totalReturn, currency)}
        icon={
          metrics.totalReturnPercent >= 0 ? (
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          )
        }
        trend={getTrend(metrics.totalReturnPercent)}
      />

      {/* Annualized Return */}
      <MetricCard
        title="年化收益率"
        value={formatPercentage(metrics.annualizedReturn)}
        icon={<Target className="h-5 w-5" />}
        trend={getTrend(metrics.annualizedReturn)}
      />

      {/* Maximum Drawdown */}
      <MetricCard
        title="最大回撤"
        value={formatPercentage(metrics.maxDrawdown)}
        icon={<AlertTriangle className="h-5 w-5" />}
        trend={metrics.maxDrawdown < 0 ? 'negative' : 'neutral'}
      />

      {/* Volatility */}
      <MetricCard
        title="波动率"
        value={formatPercentage(metrics.volatility)}
        subtitle="年化标准差"
        icon={<Activity className="h-5 w-5" />}
        trend="neutral"
      />

      {/* Sharpe Ratio */}
      <MetricCard
        title="夏普比率"
        value={metrics.sharpeRatio.toFixed(2)}
        subtitle="风险调整后收益"
        icon={<Award className="h-5 w-5" />}
        trend={metrics.sharpeRatio > 1 ? 'positive' : metrics.sharpeRatio < 0 ? 'negative' : 'neutral'}
      />

      {/* Excess Return (if benchmark is present) */}
      {metrics.excessReturn !== undefined && (
        <MetricCard
          title="超额收益"
          value={formatPercentage(metrics.excessReturn)}
          subtitle="相对基准"
          icon={
            metrics.excessReturn >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            )
          }
          trend={getTrend(metrics.excessReturn)}
        />
      )}
    </div>
  );
};

export default BacktestMetrics;

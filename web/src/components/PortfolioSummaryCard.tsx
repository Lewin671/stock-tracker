import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

interface PortfolioSummaryCardProps {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  currency: string;
}

export const PortfolioSummaryCard: React.FC<PortfolioSummaryCardProps> = ({
  totalValue,
  dayChange,
  dayChangePercent,
  totalGainLoss,
  totalGainLossPercent,
  currency,
}) => {
  const formatCurrency = (value: number) => {
    const symbol = currency === 'USD' ? '$' : '¥';
    return `${symbol}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isPositiveDay = dayChange >= 0;
  const isPositiveTotal = totalGainLoss >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Value */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Total Portfolio Value</h3>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {currency} Account
        </p>
      </div>

      {/* Day Change */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Day Change</h3>
          {isPositiveDay ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-500" />
          )}
        </div>
        <div className="text-2xl font-bold flex items-center gap-2">
          <span className={isPositiveDay ? 'text-emerald-500' : 'text-rose-500'}>
            {isPositiveDay ? '+' : '-'}{formatCurrency(dayChange)}
          </span>
        </div>
        <p className={`text-xs mt-1 font-medium ${isPositiveDay ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isPositiveDay ? '+' : ''}{dayChangePercent.toFixed(2)}%
        </p>
      </div>

      {/* Total Return */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-sm font-medium text-muted-foreground">Total Return</h3>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold flex items-center gap-2">
          <span className={isPositiveTotal ? 'text-emerald-500' : 'text-rose-500'}>
            {isPositiveTotal ? '+' : '-'}{formatCurrency(totalGainLoss)}
          </span>
        </div>
        <p className={`text-xs mt-1 font-medium ${isPositiveTotal ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isPositiveTotal ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
        </p>
      </div>
    </div>
  );
};

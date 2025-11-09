import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioSummaryCardProps {
  totalValue: number;
  totalGain: number;
  percentageReturn: number;
  currency: 'USD' | 'RMB';
}

const PortfolioSummaryCard: React.FC<PortfolioSummaryCardProps> = ({
  totalValue,
  totalGain,
  percentageReturn,
  currency,
}) => {
  const currencySymbol = currency === 'USD' ? '$' : '¥';
  const isPositive = totalGain >= 0;

  const formatNumber = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Portfolio Value */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Portfolio Value</p>
          <p className="text-3xl font-bold text-gray-900">
            {currencySymbol}{formatNumber(totalValue)}
          </p>
        </div>

        {/* Total Gain/Loss */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Gain/Loss</p>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-6 w-6 text-green-600" />
            ) : (
              <TrendingDown className="h-6 w-6 text-red-600" />
            )}
            <p
              className={`text-3xl font-bold ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPositive ? '+' : ''}{currencySymbol}{formatNumber(totalGain)}
            </p>
          </div>
        </div>

        {/* Percentage Return */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Percentage Return</p>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-6 w-6 text-green-600" />
            ) : (
              <TrendingDown className="h-6 w-6 text-red-600" />
            )}
            <p
              className={`text-3xl font-bold ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isPositive ? '+' : ''}{formatNumber(percentageReturn)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummaryCard;

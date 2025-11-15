import React from 'react';
import { Eye } from 'lucide-react';

interface Holding {
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  currency: string;
}

interface HoldingsTableProps {
  holdings: Holding[];
  currency: string;
  onViewTransactions: (symbol: string) => void;
}

const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, currency, onViewTransactions }) => {
  const formatCurrency = (value: number, curr: string) => {
    const symbol = curr === 'USD' ? '$' : '¥';
    return `${symbol}${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="overflow-x-auto">
      {/* Desktop Table */}
      <table className="hidden md:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Symbol
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Shares
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Cost Basis
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Current Price
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Current Value
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Gain/Loss
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Gain/Loss %
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {holdings.map((holding) => (
            <tr key={holding.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{holding.symbol}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm text-gray-900 dark:text-gray-200">{holding.shares.toFixed(2)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm text-gray-900 dark:text-gray-200">{formatCurrency(holding.costBasis, holding.currency)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm text-gray-900 dark:text-gray-200">{formatCurrency(holding.currentPrice, holding.currency)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(holding.currentValue, holding.currency)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className={`text-sm font-medium ${holding.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(holding.gainLoss, holding.currency)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className={`text-sm font-medium ${holding.gainLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercent(holding.gainLossPercent)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <button
                  onClick={() => onViewTransactions(holding.symbol)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {holdings.map((holding) => (
          <div key={holding.symbol} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{holding.symbol}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{holding.shares.toFixed(2)} shares</p>
              </div>
              <button
                onClick={() => onViewTransactions(holding.symbol)}
                className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                <Eye className="h-4 w-4" />
                View
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Cost Basis</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(holding.costBasis, holding.currency)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Current Price</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(holding.currentPrice, holding.currency)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Current Value</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(holding.currentValue, holding.currency)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Gain/Loss</p>
                <p className={`font-medium ${holding.gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(holding.gainLoss, holding.currency)}
                  <span className="ml-1">({formatPercent(holding.gainLossPercent)})</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HoldingsTable;

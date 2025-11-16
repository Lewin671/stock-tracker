import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Eye } from 'lucide-react';
import { GroupedHolding, Holding } from '../api/analytics';
import { getAssetClassColor, getAssetClassIcon } from '../utils/assetClassColors';

interface GroupedHoldingsViewProps {
  groups: GroupedHolding[];
  currency: string;
  groupingMode?: 'assetStyle' | 'assetClass' | 'currency' | 'none';
  onViewTransactions: (symbol: string) => void;
  onEditAsset?: (portfolioId: string, symbol: string) => void;
}

const GroupedHoldingsView: React.FC<GroupedHoldingsViewProps> = ({
  groups,
  currency,
  groupingMode = 'none',
  onViewTransactions,
  onEditAsset,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups.map(g => g.groupName))
  );

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const formatCurrency = (value: number) => {
    const symbol = currency === 'USD' ? '$' : '¥';
    return `${symbol}${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const renderHolding = (holding: Holding) => (
    <div
      key={holding.symbol}
      className="bg-gray-50 dark:bg-gray-700 border-l-4 border-blue-500 dark:border-blue-400 p-4"
    >
      {/* Desktop View */}
      <div className="hidden md:grid md:grid-cols-8 md:gap-4 md:items-center">
        <div className="col-span-1">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {holding.symbol}
          </div>
        </div>
        <div className="col-span-1 text-right">
          <div className="text-sm text-gray-900 dark:text-gray-200">
            {holding.shares.toFixed(2)}
          </div>
        </div>
        <div className="col-span-1 text-right">
          <div className="text-sm text-gray-900 dark:text-gray-200">
            {formatCurrency(holding.costBasis)}
          </div>
        </div>
        <div className="col-span-1 text-right">
          <div className="text-sm text-gray-900 dark:text-gray-200">
            {formatCurrency(holding.currentPrice)}
          </div>
        </div>
        <div className="col-span-1 text-right">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {formatCurrency(holding.currentValue)}
          </div>
        </div>
        <div className="col-span-1 text-right">
          <div
            className={`text-sm font-medium ${
              holding.gainLoss >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatCurrency(holding.gainLoss)}
          </div>
        </div>
        <div className="col-span-1 text-right">
          <div
            className={`text-sm font-medium ${
              holding.gainLossPercent >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatPercent(holding.gainLossPercent)}
          </div>
        </div>
        <div className="col-span-1 text-right">
          <div className="flex items-center justify-end gap-2">
            {onEditAsset && holding.portfolioId && (
              <button
                onClick={() => onEditAsset(holding.portfolioId!, holding.symbol)}
                className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                title="Edit classification"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onViewTransactions(holding.symbol)}
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              {holding.symbol}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {holding.shares.toFixed(2)} shares
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onEditAsset && holding.portfolioId && (
              <button
                onClick={() => onEditAsset(holding.portfolioId!, holding.symbol)}
                className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                title="Edit classification"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onViewTransactions(holding.symbol)}
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Cost Basis</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(holding.costBasis)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Current Price</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(holding.currentPrice)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Current Value</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(holding.currentValue)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Gain/Loss</p>
            <p
              className={`font-medium ${
                holding.gainLoss >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(holding.gainLoss)}
              <span className="ml-1">({formatPercent(holding.gainLossPercent)})</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.groupName);
        const groupColor = groupingMode === 'assetClass' ? getAssetClassColor(group.groupName) : '#3B82F6';
        const groupIcon = groupingMode === 'assetClass' ? getAssetClassIcon(group.groupName) : null;

        return (
          <div
            key={group.groupName}
            className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 overflow-hidden"
            style={{ borderLeft: `4px solid ${groupColor}` }}
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.groupName)}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                )}
                <div className="text-left min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                    {groupIcon && <span className="text-lg sm:text-xl flex-shrink-0">{groupIcon}</span>}
                    <span className="truncate">{group.groupName}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {group.holdings.length} {group.holdings.length === 1 ? 'holding' : 'holdings'}
                  </p>
                </div>
              </div>
              <div className="text-right ml-2 flex-shrink-0">
                <div className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(group.groupValue)}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {group.percentage.toFixed(2)}%
                </div>
              </div>
            </button>

            {/* Group Holdings */}
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700">
                {/* Desktop Table Header */}
                <div className="hidden md:grid md:grid-cols-8 md:gap-4 bg-gray-100 dark:bg-gray-700 px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="col-span-1">Symbol</div>
                  <div className="col-span-1 text-right">Shares</div>
                  <div className="col-span-1 text-right">Cost Basis</div>
                  <div className="col-span-1 text-right">Current Price</div>
                  <div className="col-span-1 text-right">Current Value</div>
                  <div className="col-span-1 text-right">Gain/Loss</div>
                  <div className="col-span-1 text-right">Gain/Loss %</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* Holdings List */}
                <div className="divide-y divide-gray-200 dark:divide-gray-600">
                  {group.holdings.map(renderHolding)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedHoldingsView;

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
    <tr key={holding.symbol} className="hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3 font-medium">{holding.symbol}</td>
      <td className="px-4 py-3 text-right">{holding.shares.toFixed(2)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">
        {formatCurrency(holding.costBasis)}
      </td>
      <td className="px-4 py-3 text-right font-medium">
        {formatCurrency(holding.currentPrice)}
      </td>
      <td className="px-4 py-3 text-right font-bold">
        {formatCurrency(holding.currentValue)}
      </td>
      <td className={`px-4 py-3 text-right font-medium ${holding.gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
        {formatCurrency(holding.gainLoss)}
      </td>
      <td className={`px-4 py-3 text-right font-medium ${holding.gainLossPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
        {formatPercent(holding.gainLossPercent)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {onEditAsset && holding.portfolioId && (
            <button
              onClick={() => onEditAsset(holding.portfolioId!, holding.symbol)}
              className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="Edit classification"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onViewTransactions(holding.symbol)}
            className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
            title="View transactions"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
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
            className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden"
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.groupName)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              style={{ borderLeft: `4px solid ${groupColor}` }}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex items-center gap-2">
                  {groupIcon && <span className="text-lg">{groupIcon}</span>}
                  <span className="font-semibold">{group.groupName}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {group.holdings.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-sm">{formatCurrency(group.groupValue)}</div>
                  <div className="text-xs text-muted-foreground">{group.percentage.toFixed(2)}%</div>
                </div>
              </div>
            </button>

            {/* Group Holdings */}
            {isExpanded && (
              <div className="border-t border-border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="px-4 py-2">Symbol</th>
                      <th className="px-4 py-2 text-right">Shares</th>
                      <th className="px-4 py-2 text-right">Avg. Cost</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Value</th>
                      <th className="px-4 py-2 text-right">Return</th>
                      <th className="px-4 py-2 text-right">Return %</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.holdings.map(renderHolding)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GroupedHoldingsView;

import React from 'react';
import { Eye, Edit2, MoreHorizontal, Wallet } from 'lucide-react';

interface Holding {
  symbol: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  currency: string;
  portfolioId?: string;
}

interface HoldingsTableProps {
  holdings: Holding[];
  currency: string;
  onViewTransactions: (symbol: string) => void;
  onEditAsset?: (portfolioId: string, symbol: string) => void;
}

const HoldingsTable: React.FC<HoldingsTableProps> = ({ holdings, currency, onViewTransactions, onEditAsset }) => {
  const isCashSymbol = (symbol: string): boolean => {
    return symbol === 'CASH_USD' || symbol === 'CASH_RMB';
  };

  const getCashDisplayName = (symbol: string): string => {
    if (symbol === 'CASH_USD') return 'Cash - USD (现金 - 美元)';
    if (symbol === 'CASH_RMB') return 'Cash - RMB (现金 - 人民币)';
    return symbol;
  };

  const formatCurrency = (value: number, curr: string) => {
    const symbol = curr === 'USD' ? '$' : '¥';
    return `${symbol}${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground font-medium">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-right">Avg. Cost</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Return</th>
              <th className="px-4 py-3 text-right">Return %</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {holdings.map((holding) => {
              const isCash = isCashSymbol(holding.symbol);
              return (
                <tr key={holding.symbol} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {isCash && <Wallet className="h-4 w-4 text-muted-foreground" />}
                      {isCash ? getCashDisplayName(holding.symbol) : holding.symbol}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{holding.shares.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatCurrency(holding.costBasis, holding.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {isCash ? '-' : formatCurrency(holding.currentPrice, holding.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {formatCurrency(holding.currentValue, holding.currency)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${isCash ? 'text-muted-foreground' : holding.gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isCash ? '-' : formatCurrency(holding.gainLoss, holding.currency)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${isCash ? 'text-muted-foreground' : holding.gainLossPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isCash ? '-' : formatPercent(holding.gainLossPercent)}
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HoldingsTable;

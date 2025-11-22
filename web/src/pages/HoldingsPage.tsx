import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Loader2, Plus, Wallet } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import HoldingsTable from '../components/HoldingsTable';
import TransactionDialog from '../components/TransactionDialog';
import CashTransactionDialog from '../components/CashTransactionDialog';
import TransactionsList from '../components/TransactionsList';
import EditAssetMetadataDialog from '../components/EditAssetMetadataDialog';
import { getPortfolio, updatePortfolioMetadata, Portfolio } from '../api/portfolios';
import { useToast } from '../contexts/ToastContext';
import { formatErrorMessage } from '../utils/errorHandler';

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

interface Transaction {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  shares: number;
  price: number;
  date: string;
  currency: 'USD' | 'RMB';
  fees?: number;
}

const HoldingsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [currency, setCurrency] = useState<'USD' | 'RMB'>('USD');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [cashTransactionDialogOpen, setCashTransactionDialogOpen] = useState(false);
  const [transactionsListOpen, setTransactionsListOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [editMetadataDialogOpen, setEditMetadataDialogOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    fetchHoldings();
  }, [currency]);

  const fetchHoldings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get('/api/portfolio/holdings', {
        params: { currency },
      });
      // Backend returns { holdings: [...] }
      const holdingsData = response.data.holdings || [];
      setHoldings(Array.isArray(holdingsData) ? holdingsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load holdings');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = (value: string) => {
    if (value === 'USD' || value === 'RMB') {
      setCurrency(value);
    }
  };

  const handleAddTransaction = () => {
    setSelectedSymbol(undefined);
    setEditingTransaction(undefined);
    setTransactionDialogOpen(true);
  };

  const handleAddCash = () => {
    setCashTransactionDialogOpen(true);
  };

  const handleViewTransactions = (symbol: string) => {
    setSelectedSymbol(symbol);
    setTransactionsListOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionsListOpen(false);
    setTransactionDialogOpen(true);
  };

  const handleTransactionSuccess = () => {
    fetchHoldings();
  };

  const handleTransactionDeleted = () => {
    fetchHoldings();
  };

  const handleEditAsset = async (portfolioId: string, symbol: string) => {
    try {
      const portfolio = await getPortfolio(portfolioId);
      setEditingPortfolio(portfolio);
      setEditMetadataDialogOpen(true);
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to load portfolio', errorMessage);
    }
  };

  const handleSaveMetadata = async (assetStyleId: string, assetClass: string) => {
    if (!editingPortfolio) return;

    // Validate assetClass is one of the allowed values
    const validAssetClasses = ['Stock', 'ETF', 'Bond', 'Cash and Equivalents'];
    if (!validAssetClasses.includes(assetClass)) {
      showError('Invalid asset class', 'Please select a valid asset class');
      return;
    }

    try {
      await updatePortfolioMetadata(
        editingPortfolio.id,
        assetStyleId,
        assetClass as 'Stock' | 'ETF' | 'Bond' | 'Cash and Equivalents'
      );
      setEditMetadataDialogOpen(false);
      setEditingPortfolio(null);
      fetchHoldings();
      showSuccess('Asset updated', `Classification for ${editingPortfolio.symbol} has been updated`);
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      showError('Failed to update asset', errorMessage);
      throw err; // Re-throw so the dialog can handle it
    }
  };

  const handleCancelEditMetadata = () => {
    setEditMetadataDialogOpen(false);
    setEditingPortfolio(null);
  };

  return (
    <DashboardLayout>
      {/* Top Bar Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Holdings</h2>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Currency:</span>
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

          <button
            onClick={handleAddCash}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Wallet className="h-4 w-4" />
            Add Cash
          </button>

          <button
            onClick={handleAddTransaction}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <p>{error}</p>
          <button
            onClick={fetchHoldings}
            className="mt-2 text-sm font-medium hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold">Your Holdings</h3>
          </div>

          {holdings.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No holdings yet</p>
              <p className="text-sm text-muted-foreground/60">Add your first transaction to get started</p>
            </div>
          ) : (
            <div className="p-6">
              <HoldingsTable
                holdings={holdings}
                currency={currency}
                onViewTransactions={handleViewTransactions}
                onEditAsset={handleEditAsset}
              />
            </div>
          )}
        </div>
      )}

      {/* Transaction Dialog */}
      <TransactionDialog
        open={transactionDialogOpen}
        onClose={() => {
          setTransactionDialogOpen(false);
          setEditingTransaction(undefined);
          setSelectedSymbol(undefined);
        }}
        onSuccess={handleTransactionSuccess}
        symbol={selectedSymbol}
        transaction={editingTransaction}
      />

      {/* Cash Transaction Dialog */}
      <CashTransactionDialog
        open={cashTransactionDialogOpen}
        onClose={() => setCashTransactionDialogOpen(false)}
        onSuccess={handleTransactionSuccess}
      />

      {/* Transactions List Dialog */}
      {selectedSymbol && (
        <TransactionsList
          open={transactionsListOpen}
          onClose={() => {
            setTransactionsListOpen(false);
            setSelectedSymbol(undefined);
          }}
          symbol={selectedSymbol}
          onEdit={handleEditTransaction}
          onTransactionDeleted={handleTransactionDeleted}
        />
      )}

      {/* Edit Asset Metadata Dialog */}
      <EditAssetMetadataDialog
        open={editMetadataDialogOpen}
        portfolio={editingPortfolio}
        onSave={handleSaveMetadata}
        onCancel={handleCancelEditMetadata}
      />
    </DashboardLayout>
  );
};

export default HoldingsPage;

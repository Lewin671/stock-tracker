import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axios';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Loader2, Plus } from 'lucide-react';
import Layout from '../components/Layout';
import HoldingsTable from '../components/HoldingsTable';
import TransactionDialog from '../components/TransactionDialog';
import TransactionsList from '../components/TransactionsList';

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
  const [currency, setCurrency] = useState<'USD' | 'RMB'>('USD');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionsListOpen, setTransactionsListOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

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

  return (
    <Layout>
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Holdings</h1>
            {/* Currency Toggle */}
            <ToggleGroup.Root
              type="single"
              value={currency}
              onValueChange={handleCurrencyChange}
              className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1"
            >
              <ToggleGroup.Item
                value="USD"
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-600 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 dark:data-[state=off]:text-gray-300 data-[state=off]:hover:text-gray-900 dark:data-[state=off]:hover:text-white"
              >
                USD
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="RMB"
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors data-[state=on]:bg-white dark:data-[state=on]:bg-gray-600 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm data-[state=off]:text-gray-600 dark:data-[state=off]:text-gray-300 data-[state=off]:hover:text-gray-900 dark:data-[state=off]:hover:text-white"
              >
                RMB
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={fetchHoldings}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Holdings</h2>
                <button
                  onClick={handleAddTransaction}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Transaction
                </button>
              </div>
            </div>
            
            {holdings.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No holdings yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Add your first transaction to get started</p>
              </div>
            ) : (
              <div className="p-6">
                <HoldingsTable
                  holdings={holdings}
                  currency={currency}
                  onViewTransactions={handleViewTransactions}
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
      </main>
    </Layout>
  );
};

export default HoldingsPage;

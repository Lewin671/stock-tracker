import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { Search, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import TransactionDialog from '../components/TransactionDialog';
import { useToast } from '../contexts/ToastContext';
import { formatErrorMessage } from '../utils/errorHandler';

interface StockSearchResult {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  sector?: string;
}

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(undefined);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get(`/api/stocks/${query.toUpperCase()}/info`);
      setSearchResults(response.data);
    } catch (err: any) {
      setSearchResults(null);
      if (err.status === 404) {
        const errorMessage = `Stock symbol "${query.toUpperCase()}" not found`;
        setError(errorMessage);
      } else {
        const errorMessage = formatErrorMessage(err);
        setError(errorMessage);
        showError('Search failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleAddToPortfolio = (symbol: string) => {
    setSelectedSymbol(symbol);
    setTransactionDialogOpen(true);
  };

  const handleTransactionSuccess = () => {
    // Navigate to holdings page after adding transaction
    navigate('/holdings');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Search Input */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search by Stock Symbol
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Enter stock symbol (e.g., AAPL, 600000.SS)"
              className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            US stocks: AAPL, MSFT, GOOGL | Chinese stocks: 600000.SS, 000001.SZ
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Searching...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {!loading && !error && searchResults && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{searchResults.symbol}</h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">{searchResults.name}</p>
                    {searchResults.sector && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sector: {searchResults.sector}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Price</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {searchResults.currency === 'USD' ? '$' : '¥'}
                    {searchResults.currentPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{searchResults.currency}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleAddToPortfolio(searchResults.symbol)}
                  className="w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  Add to Portfolio
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !searchResults && searchQuery.trim() === '' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-12">
            <div className="text-center">
              <Search className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Search for Stocks</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Enter a stock symbol to view information and add it to your portfolio
              </p>
            </div>
          </div>
        )}

        {/* Transaction Dialog */}
        <TransactionDialog
          open={transactionDialogOpen}
          onClose={() => {
            setTransactionDialogOpen(false);
            setSelectedSymbol(undefined);
          }}
          onSuccess={handleTransactionSuccess}
          symbol={selectedSymbol}
        />
      </div>
    </DashboardLayout>
  );
};

export default SearchPage;

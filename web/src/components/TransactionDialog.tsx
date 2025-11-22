import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, DollarSign, Calendar, Hash, TrendingUp, Search } from 'lucide-react';
import axiosInstance from '../api/axios';
import AssetClassDialog from './AssetClassDialog';
import { checkPortfolioExists, updatePortfolioMetadata } from '../api/portfolios';
import { useToast } from '../contexts/ToastContext';
import { formatErrorMessage } from '../utils/errorHandler';

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

interface TransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  symbol?: string;
  transaction?: Transaction;
}

interface TransactionFormData {
  assetType: 'stock' | 'cash';
  symbol: string;
  action: 'buy' | 'sell';
  shares: string;
  price: string;
  date: string;
  currency: 'USD' | 'RMB';
  fees: string;
}

const TransactionDialog: React.FC<TransactionDialogProps> = ({
  open,
  onClose,
  onSuccess,
  symbol,
  transaction,
}) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState<TransactionFormData>({
    assetType: 'stock',
    symbol: symbol || '',
    action: 'buy',
    shares: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    fees: '',
  });
  
  const isCashTransaction = formData.assetType === 'cash';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAssetClassDialog, setShowAssetClassDialog] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  
  // Stock search autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (transaction) {
      // Edit mode - populate form with transaction data
      const isCash = transaction.symbol === 'CASH_USD' || transaction.symbol === 'CASH_RMB';
      setFormData({
        assetType: isCash ? 'cash' : 'stock',
        symbol: transaction.symbol,
        action: transaction.action,
        shares: transaction.shares.toString(),
        price: transaction.price.toString(),
        date: transaction.date.split('T')[0],
        currency: transaction.currency,
        fees: transaction.fees?.toString() || '',
      });
    } else if (symbol) {
      // Add mode with pre-filled symbol
      const isCash = symbol === 'CASH_USD' || symbol === 'CASH_RMB';
      setFormData(prev => ({ 
        ...prev, 
        symbol,
        assetType: isCash ? 'cash' : 'stock'
      }));
    }
  }, [transaction, symbol]);
  
  // Update symbol when asset type or currency changes for cash
  useEffect(() => {
    if (formData.assetType === 'cash') {
      const cashSymbol = formData.currency === 'USD' ? 'CASH_USD' : 'CASH_RMB';
      if (formData.symbol !== cashSymbol) {
        setFormData(prev => ({ ...prev, symbol: cashSymbol, price: '1.0' }));
      }
    }
  }, [formData.assetType, formData.currency]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isCashTransaction && !formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    }

    const shares = parseFloat(formData.shares);
    if (!formData.shares || isNaN(shares) || shares <= 0) {
      newErrors.shares = isCashTransaction ? 'Amount must be a positive number' : 'Shares must be a positive number';
    }

    // For cash, price is always 1.0, skip validation
    if (!isCashTransaction) {
      const price = parseFloat(formData.price);
      if (!formData.price || isNaN(price) || price <= 0) {
        newErrors.price = 'Price must be a positive number';
      }
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (selectedDate > today) {
        newErrors.date = 'Date cannot be in the future';
      }
    }

    if (formData.fees) {
      const fees = parseFloat(formData.fees);
      if (isNaN(fees) || fees < 0) {
        newErrors.fees = 'Fees must be a non-negative number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        symbol: formData.symbol.toUpperCase(),
        action: formData.action,
        shares: parseFloat(formData.shares),
        price: isCashTransaction ? 1.0 : parseFloat(formData.price),
        date: new Date(formData.date).toISOString(),
        currency: formData.currency,
        fees: formData.fees ? parseFloat(formData.fees) : 0,
      };

      if (transaction) {
        // Update existing transaction
        await axiosInstance.put(`/api/portfolio/transactions/${transaction.id}`, payload);
        showSuccess('Transaction updated', `${payload.symbol} transaction has been updated`);
        onSuccess();
        handleClose();
      } else {
        // For cash transactions, skip asset classification dialog (backend handles it automatically)
        if (isCashTransaction) {
          await axiosInstance.post('/api/portfolio/transactions', payload);
          showSuccess('Transaction added', `${payload.symbol} transaction has been added`);
          onSuccess();
          handleClose();
        } else {
          // Check if portfolio exists for this symbol
          const portfolioCheck = await checkPortfolioExists(payload.symbol);

          if (!portfolioCheck.exists) {
            // Portfolio doesn't exist, show asset classification dialog
            setPendingTransaction(payload);
            setShowAssetClassDialog(true);
            setLoading(false);
          } else {
            // Portfolio exists, proceed with transaction
            await axiosInstance.post('/api/portfolio/transactions', payload);
            showSuccess('Transaction added', `${payload.symbol} transaction has been added`);
            onSuccess();
            handleClose();
          }
        }
      }
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to save transaction', errorMessage);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      assetType: 'stock',
      symbol: '',
      action: 'buy',
      shares: '',
      price: '',
      date: new Date().toISOString().split('T')[0],
      currency: 'USD',
      fees: '',
    });
    setErrors({});
    setError(null);
    onClose();
  };

  const handleChange = (field: keyof TransactionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Search for stocks as user types
  const searchStocks = async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    
    try {
      const response = await axiosInstance.get(`/api/stocks/search/${query.toUpperCase()}`);
      setSearchResults([response.data]);
      setShowSearchResults(true);
    } catch (err: any) {
      // If stock not found, clear results
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle symbol input change with debounce
  const handleSymbolChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setSearchQuery(upperValue);
    handleChange('symbol', upperValue);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchStocks(upperValue);
    }, 300);
  };

  // Handle selecting a stock from search results
  const handleSelectStock = (stock: any) => {
    setFormData(prev => ({ ...prev, symbol: stock.symbol }));
    setSearchQuery(stock.symbol);
    setShowSearchResults(false);
    setSearchResults([]);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAssetClassSave = async (assetStyleId: string, assetClass: string) => {
    if (!pendingTransaction) return;

    setLoading(true);
    setError(null);

    try {
      // First, create the transaction which will create the portfolio
      await axiosInstance.post('/api/portfolio/transactions', pendingTransaction);

      // Get the portfolio ID from the response or fetch it
      const portfolioCheck = await checkPortfolioExists(pendingTransaction.symbol);

      if (portfolioCheck.exists && portfolioCheck.portfolio) {
        // Update the portfolio metadata
        await updatePortfolioMetadata(portfolioCheck.portfolio.id, assetStyleId, assetClass as any);
      }

      showSuccess('Transaction added', `${pendingTransaction.symbol} has been added with classification`);
      setPendingTransaction(null);
      setShowAssetClassDialog(false);
      onSuccess();
      handleClose();
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to save transaction', errorMessage);
      setShowAssetClassDialog(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetClassCancel = () => {
    setShowAssetClassDialog(false);
    setPendingTransaction(null);
    setLoading(false);
  };

  return (
    <>
      <AssetClassDialog
        open={showAssetClassDialog}
        symbol={pendingTransaction?.symbol || ''}
        onSave={handleAssetClassSave}
        onCancel={handleAssetClassCancel}
      />

      <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                  {transaction ? 'Edit Transaction' : 'Add Transaction'}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Asset Type */}
                {!transaction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Asset Type *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="stock"
                          checked={formData.assetType === 'stock'}
                          onChange={(e) => handleChange('assetType', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Stock/ETF</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="cash"
                          checked={formData.assetType === 'cash'}
                          onChange={(e) => handleChange('assetType', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Cash</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Symbol - only show for stocks */}
                {!isCashTransaction && (
                  <div className="relative" ref={searchInputRef}>
                    <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Symbol *
                    </label>
                    <div className="relative">
                      <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <input
                        id="symbol"
                        type="text"
                        value={formData.symbol}
                        onChange={(e) => handleSymbolChange(e.target.value)}
                        onFocus={() => {
                          if (searchResults.length > 0) {
                            setShowSearchResults(true);
                          }
                        }}
                        className={`w-full pl-10 pr-10 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.symbol ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        placeholder="AAPL, 600000.SS"
                        disabled={!!transaction}
                        autoComplete="off"
                      />
                      {searchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 animate-spin" />
                      )}
                    </div>
                    
                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((stock, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectStock(stock)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {stock.symbol}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {stock.name}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {stock.currentPrice?.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {stock.currency}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {errors.symbol && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.symbol}</p>}
                  </div>
                )}

                {/* Action */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isCashTransaction ? 'Transaction Type *' : 'Action *'}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="buy"
                        checked={formData.action === 'buy'}
                        onChange={(e) => handleChange('action', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {isCashTransaction ? 'Deposit' : 'Buy'}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="sell"
                        checked={formData.action === 'sell'}
                        onChange={(e) => handleChange('action', e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {isCashTransaction ? 'Withdraw' : 'Sell'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Shares / Amount */}
                <div>
                  <label htmlFor="shares" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isCashTransaction ? 'Amount *' : 'Shares *'}
                  </label>
                  <div className="relative">
                    {isCashTransaction ? (
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    )}
                    <input
                      id="shares"
                      type="number"
                      step="0.01"
                      value={formData.shares}
                      onChange={(e) => handleChange('shares', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.shares ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      placeholder={isCashTransaction ? '1000.00' : '10'}
                    />
                  </div>
                  {errors.shares && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.shares}</p>}
                </div>

                {/* Price - only show for stocks */}
                {!isCashTransaction && (
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Price *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => handleChange('price', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.price ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        placeholder="150.50"
                      />
                    </div>
                    {errors.price && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>}
                  </div>
                )}

                {/* Date */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.date ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                  </div>
                  {errors.date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date}</p>}
                </div>

                {/* Currency */}
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency *
                  </label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="RMB">RMB</option>
                  </select>
                </div>

                {/* Fees (Optional) */}
                <div>
                  <label htmlFor="fees" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fees (Optional)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <input
                      id="fees"
                      type="number"
                      step="0.01"
                      value={formData.fees}
                      onChange={(e) => handleChange('fees', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.fees ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      placeholder="5.00"
                    />
                  </div>
                  {errors.fees && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fees}</p>}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {transaction ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default TransactionDialog;

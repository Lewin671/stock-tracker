import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, DollarSign, Calendar, Hash, TrendingUp } from 'lucide-react';
import axiosInstance from '../api/axios';

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
  const [formData, setFormData] = useState<TransactionFormData>({
    symbol: symbol || '',
    action: 'buy',
    shares: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    fees: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (transaction) {
      // Edit mode - populate form with transaction data
      setFormData({
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
      setFormData(prev => ({ ...prev, symbol }));
    }
  }, [transaction, symbol]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    }

    const shares = parseFloat(formData.shares);
    if (!formData.shares || isNaN(shares) || shares <= 0) {
      newErrors.shares = 'Shares must be a positive number';
    }

    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) {
      newErrors.price = 'Price must be a positive number';
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
        price: parseFloat(formData.price),
        date: new Date(formData.date).toISOString(),
        currency: formData.currency,
        fees: formData.fees ? parseFloat(formData.fees) : 0,
      };

      if (transaction) {
        // Update existing transaction
        await axiosInstance.put(`/api/portfolio/transactions/${transaction.id}`, payload);
      } else {
        // Add new transaction
        await axiosInstance.post('/api/portfolio/transactions', payload);
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
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

  return (
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
              {/* Symbol */}
              <div>
                <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Symbol *
                </label>
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <input
                    id="symbol"
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.symbol ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="AAPL"
                    disabled={!!transaction}
                  />
                </div>
                {errors.symbol && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.symbol}</p>}
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Action *
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
                    <span className="text-sm text-gray-700 dark:text-gray-300">Buy</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="sell"
                      checked={formData.action === 'sell'}
                      onChange={(e) => handleChange('action', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Sell</span>
                  </label>
                </div>
              </div>

              {/* Shares */}
              <div>
                <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-1">
                  Shares *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="shares"
                    type="number"
                    step="0.01"
                    value={formData.shares}
                    onChange={(e) => handleChange('shares', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.shares ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="10"
                  />
                </div>
                {errors.shares && <p className="mt-1 text-sm text-red-600">{errors.shares}</p>}
              </div>

              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.price ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="150.50"
                  />
                </div>
                {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
              </div>

              {/* Date */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
              </div>

              {/* Currency */}
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency *
                </label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="RMB">RMB</option>
                </select>
              </div>

              {/* Fees (Optional) */}
              <div>
                <label htmlFor="fees" className="block text-sm font-medium text-gray-700 mb-1">
                  Fees (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="fees"
                    type="number"
                    step="0.01"
                    value={formData.fees}
                    onChange={(e) => handleChange('fees', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.fees ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="5.00"
                  />
                </div>
                {errors.fees && <p className="mt-1 text-sm text-red-600">{errors.fees}</p>}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
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
  );
};

export default TransactionDialog;

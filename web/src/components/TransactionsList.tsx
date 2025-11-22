import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { X, Edit, Trash, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import axiosInstance from '../api/axios';
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

interface TransactionsListProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  onEdit: (transaction: Transaction) => void;
  onTransactionDeleted: () => void;
}

const TransactionsList: React.FC<TransactionsListProps> = ({
  open,
  onClose,
  symbol,
  onEdit,
  onTransactionDeleted,
}) => {
  const { showSuccess, showError } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && symbol) {
      fetchTransactions();
    }
  }, [open, symbol]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get(`/api/portfolio/transactions/${symbol}`);
      setTransactions(response.data.transactions || []);
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to load transactions', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);

    try {
      await axiosInstance.delete(`/api/portfolio/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t.id !== id));
      setDeleteId(null);
      showSuccess('Transaction deleted', 'The transaction has been removed');
      onTransactionDeleted();
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      showError('Failed to delete transaction', errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const isCashSymbol = (symbol: string): boolean => {
    return symbol === 'CASH_USD' || symbol === 'CASH_RMB';
  };

  const getCashDisplayName = (symbol: string): string => {
    if (symbol === 'CASH_USD') return 'Cash - USD (现金 - 美元)';
    if (symbol === 'CASH_RMB') return 'Cash - RMB (现金 - 人民币)';
    return symbol;
  };

  const getActionLabel = (action: string, isCash: boolean): string => {
    if (isCash) {
      return action === 'buy' ? 'Deposit (存入)' : 'Withdraw (取出)';
    }
    return action === 'buy' ? 'Buy' : 'Sell';
  };

  const formatCurrency = (value: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : '¥';
    return `${symbol}${value.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if date is invalid
    }
    
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                  Transactions for {isCashSymbol(symbol) ? getCashDisplayName(symbol) : symbol}
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

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => {
                    const isCash = isCashSymbol(transaction.symbol);
                    return (
                      <div
                        key={transaction.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {transaction.action === 'buy' ? (
                                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                              )}
                              <span
                                className={`text-sm font-semibold ${
                                  transaction.action === 'buy' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {getActionLabel(transaction.action, isCash)}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(transaction.date)}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {isCash ? 'Amount:' : 'Shares:'}
                                </span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                  {isCash ? formatCurrency(transaction.shares, transaction.currency) : transaction.shares.toFixed(2)}
                                </span>
                              </div>
                              {!isCash && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Price:</span>
                                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(transaction.price, transaction.currency)}
                                  </span>
                                </div>
                              )}
                              {!isCash && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Total:</span>
                                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(
                                      transaction.shares * transaction.price,
                                      transaction.currency
                                    )}
                                  </span>
                                </div>
                              )}
                              {transaction.fees && transaction.fees > 0 && (
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Fees:</span>
                                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(transaction.fees, transaction.currency)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => onEdit(transaction)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                              title="Edit transaction"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(transaction.id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                              title="Delete transaction"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={!!deleteId} onOpenChange={(isOpen) => !isOpen && setDeleteId(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Transaction
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialog.Description>
            <div className="flex gap-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={() => deleteId && handleDelete(deleteId)}
                  className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
};

export default TransactionsList;

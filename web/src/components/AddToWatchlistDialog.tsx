import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Loader2, Plus } from 'lucide-react';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useToast } from '../contexts/ToastContext';

interface AddToWatchlistDialogProps {
    open: boolean;
    onClose: () => void;
}

const AddToWatchlistDialog: React.FC<AddToWatchlistDialogProps> = ({ open, onClose }) => {
    const { addToWatchlist, watchlist } = useWatchlist();
    const { showSuccess, showError } = useToast();
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!symbol.trim()) {
            setError('Please enter a stock symbol');
            return;
        }

        const upperSymbol = symbol.toUpperCase().trim();

        // Check if already in watchlist
        if (watchlist.some(item => item.symbol === upperSymbol)) {
            setError('This symbol is already in your watchlist');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Create a WatchlistItem object with the symbol
            // In a real app, you'd fetch this data from an API
            const newItem = {
                symbol: upperSymbol,
                name: `${upperSymbol} Inc.`, // Placeholder name
                price: 0, // Will be updated when real data is fetched
                change: 0,
                changePercent: 0,
            };

            await addToWatchlist(newItem);
            showSuccess('Added to watchlist', `${upperSymbol} has been added to your watchlist`);
            setSymbol('');
            onClose();
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to add symbol';
            setError(errorMessage);
            showError('Failed to add symbol', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSymbol('');
        setError(null);
        onClose();
    };

    return (
        <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md z-50 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                                Add to Watchlist
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
                            <div>
                                <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Stock Symbol
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <input
                                        id="symbol"
                                        type="text"
                                        value={symbol}
                                        onChange={(e) => {
                                            setSymbol(e.target.value.toUpperCase());
                                            setError(null);
                                        }}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="AAPL, GOOGL, TSLA..."
                                        autoFocus
                                        disabled={loading}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Enter a stock ticker symbol to add to your watchlist
                                </p>
                            </div>

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
                                    <Plus className="h-4 w-4" />
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default AddToWatchlistDialog;

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Loader2, Plus } from 'lucide-react';
import { useWatchlist } from '../contexts/WatchlistContext';
import { useToast } from '../contexts/ToastContext';
import { searchStock, StockInfo } from '../api/stocks';

interface AddToWatchlistDialogProps {
    open: boolean;
    onClose: () => void;
}

const AddToWatchlistDialog: React.FC<AddToWatchlistDialogProps> = ({ open, onClose }) => {
    const { addToWatchlist, isInWatchlist } = useWatchlist();
    const { showSuccess, showError } = useToast();
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchResult, setSearchResult] = useState<StockInfo | null>(null);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setSymbol('');
            setSearchResult(null);
            setError(null);
        }
    }, [open]);

    // Search for stock as user types (with debounce)
    useEffect(() => {
        if (!symbol.trim() || symbol.length < 1) {
            setSearchResult(null);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            setError(null);
            try {
                const result = await searchStock(symbol);
                setSearchResult(result);
            } catch (err: any) {
                setSearchResult(null);
                // Don't show error while typing, only on submit
            } finally {
                setSearching(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [symbol]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!symbol.trim()) {
            setError('Please enter a stock symbol');
            return;
        }

        const upperSymbol = symbol.toUpperCase().trim();

        // Check if already in watchlist
        if (isInWatchlist(upperSymbol)) {
            setError('This symbol is already in your watchlist');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await addToWatchlist(upperSymbol);
            showSuccess('Added to watchlist', `${upperSymbol} has been added to your watchlist`);
            setSymbol('');
            setSearchResult(null);
            onClose();
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to add symbol. Please check if the symbol is valid.';
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
                                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="AAPL, GOOGL, TSLA..."
                                        autoFocus
                                        disabled={loading}
                                    />
                                    {searching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Enter a stock ticker symbol (e.g., AAPL for US stocks, 600519.SS for Chinese stocks)
                                </p>
                            </div>

                            {/* Search Result Preview */}
                            {searchResult && !searching && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                                    {searchResult.symbol}
                                                </h4>
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                                    {searchResult.currency}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                                {searchResult.name}
                                            </p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {searchResult.currency === 'CNY' ? '¥' : '$'}
                                                    {searchResult.currentPrice.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {symbol && !searching && !searchResult && symbol.length >= 1 && (
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        No results found. Make sure the symbol is correct.
                                    </p>
                                </div>
                            )}

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

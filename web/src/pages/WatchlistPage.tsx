import React, { useState } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, X, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useWatchlist } from '../contexts/WatchlistContext';
import AddToWatchlistDialog from '../components/AddToWatchlistDialog';

const WatchlistPage: React.FC = () => {
    const { watchlist, removeFromWatchlist, refreshPrices, isRefreshing } = useWatchlist();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);

    const filteredWatchlist = watchlist.filter(
        (item) =>
            item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            <AddToWatchlistDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
            {/* Top Bar Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Watchlist</h2>
                    {watchlist.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Tracking {watchlist.length} {watchlist.length === 1 ? 'symbol' : 'symbols'}
                        </p>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={refreshPrices}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddDialog(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Symbol
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search symbols or names..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Watchlist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWatchlist.length === 0 ? (
                    <div className="col-span-full rounded-xl border bg-card text-card-foreground shadow-sm p-12 text-center">
                        <p className="text-muted-foreground mb-2">
                            {searchQuery ? 'No symbols found' : 'No symbols in watchlist'}
                        </p>
                        <p className="text-sm text-muted-foreground/60">
                            {searchQuery ? 'Try a different search term' : 'Add symbols to track their performance'}
                        </p>
                    </div>
                ) : (
                    filteredWatchlist.map((item) => (
                        <div
                            key={item.symbol}
                            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 hover:shadow-md transition-shadow group"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">{item.symbol}</h3>
                                        <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                                            {item.currency}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {item.name}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => removeFromWatchlist(item.symbol)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Price */}
                            <div className="mb-3">
                                <p className="text-2xl font-bold">
                                    {item.currency === 'CNY' ? '¥' : '$'}
                                    {item.price.toFixed(2)}
                                </p>
                            </div>

                            {/* Change */}
                            <div
                                className={`flex items-center gap-1 text-sm font-medium ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
                                    }`}
                            >
                                {item.change >= 0 ? (
                                    <TrendingUp className="h-4 w-4" />
                                ) : (
                                    <TrendingDown className="h-4 w-4" />
                                )}
                                <span>
                                    {item.changePercent > 0 ? '+' : ''}
                                    {item.changePercent.toFixed(2)}%
                                </span>
                                <span className="text-muted-foreground">
                                    ({item.change > 0 ? '+' : ''}
                                    {item.change.toFixed(2)})
                                </span>
                            </div>

                            {/* Mini Chart */}
                            <div className="mt-4 h-16">
                                {item.sparklineData && item.sparklineData.length > 0 ? (
                                    <svg
                                        viewBox="0 0 200 60"
                                        className="w-full h-full stroke-current fill-none"
                                        preserveAspectRatio="none"
                                    >
                                        <path
                                            d={(() => {
                                                const data = item.sparklineData;
                                                const min = Math.min(...data);
                                                const max = Math.max(...data);
                                                const range = max - min || 1;
                                                
                                                const points = data.map((price, i) => {
                                                    const x = (i / (data.length - 1)) * 200;
                                                    const y = 60 - ((price - min) / range) * 60;
                                                    return `${x},${y}`;
                                                });
                                                
                                                return `M ${points.join(' L ')}`;
                                            })()}
                                            className={item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                                            strokeWidth="2"
                                        />
                                    </svg>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                        No chart data
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
};

export default WatchlistPage;

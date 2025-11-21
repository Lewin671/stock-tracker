import React, { useState } from 'react';
import { Plus, Search, TrendingUp, TrendingDown, X } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useWatchlist } from '../contexts/WatchlistContext';

const WatchlistPage: React.FC = () => {
    const { watchlist } = useWatchlist();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredWatchlist = watchlist.filter(
        (item) =>
            item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout>
            {/* Top Bar Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Watchlist</h2>

                <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors">
                    <Plus className="h-4 w-4" />
                    Add Symbol
                </button>
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
                            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer group"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{item.symbol}</h3>
                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {item.name}
                                    </p>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded">
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Price */}
                            <div className="mb-3">
                                <p className="text-2xl font-bold">${item.price.toFixed(2)}</p>
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

                            {/* Mini Chart Placeholder */}
                            <div className="mt-4 h-16">
                                <svg
                                    viewBox="0 0 200 60"
                                    className="w-full h-full stroke-current fill-none"
                                    preserveAspectRatio="none"
                                >
                                    <path
                                        d={`M0 30 Q 50 ${item.change >= 0 ? 15 : 45}, 100 30 T 200 ${item.change >= 0 ? 10 : 50
                                            }`}
                                        className={item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                                        strokeWidth="2"
                                    />
                                </svg>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </DashboardLayout>
    );
};

export default WatchlistPage;

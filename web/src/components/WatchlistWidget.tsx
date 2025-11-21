import React from 'react';
import { useWatchlist } from '../contexts/WatchlistContext';
import { TrendingUp, TrendingDown, MoreHorizontal, Plus } from 'lucide-react';

export const WatchlistWidget: React.FC = () => {
    const { watchlist } = useWatchlist();

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full flex flex-col">
            <div className="p-6 pb-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-lg">Watchlist</h3>
                <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-1 overflow-auto p-2">
                <div className="space-y-1">
                    {watchlist.map((item) => (
                        <div
                            key={item.symbol}
                            className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg group cursor-pointer transition-colors"
                        >
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">{item.symbol}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Mini Chart Placeholder */}
                                <div className="w-16 h-8 opacity-50 hidden sm:block">
                                    {/* We can add a sparkline here later */}
                                    <svg viewBox="0 0 100 40" className="w-full h-full stroke-current fill-none">
                                        <path
                                            d={`M0 20 Q 25 ${item.change >= 0 ? 10 : 30}, 50 20 T 100 ${item.change >= 0 ? 5 : 35}`}
                                            className={item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                                            strokeWidth="2"
                                        />
                                    </svg>
                                </div>
                                <div className="flex flex-col items-end min-w-[80px]">
                                    <span className="font-medium text-sm">${item.price.toFixed(2)}</span>
                                    <span
                                        className={`text-xs font-medium flex items-center ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
                                            }`}
                                    >
                                        {item.change >= 0 ? (
                                            <TrendingUp className="w-3 h-3 mr-1" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3 mr-1" />
                                        )}
                                        {item.changePercent > 0 ? '+' : ''}
                                        {item.changePercent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-4 border-t border-border">
                <button className="w-full py-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    View All
                </button>
            </div>
        </div>
    );
};

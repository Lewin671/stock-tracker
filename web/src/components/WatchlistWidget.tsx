import React, { useState } from 'react';
import { useWatchlist } from '../contexts/WatchlistContext';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddToWatchlistDialog from './AddToWatchlistDialog';

export const WatchlistWidget: React.FC = () => {
    const { watchlist } = useWatchlist();
    const [showAddDialog, setShowAddDialog] = useState(false);
    const navigate = useNavigate();

    return (
        <>
            <AddToWatchlistDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm h-full flex flex-col">
                <div className="p-6 pb-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Watchlist</h3>
                    <button
                        onClick={() => setShowAddDialog(true)}
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-2">
                    <div className="space-y-1">
                        {watchlist.map((item) => (
                            <div
                                key={item.symbol}
                                className="flex items-start justify-between p-3 hover:bg-accent/50 rounded-lg group cursor-pointer transition-colors gap-2"
                            >
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-bold text-sm">{item.symbol}</span>
                                    <span className="text-xs text-muted-foreground break-words leading-tight">
                                        {item.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {/* Mini Chart */}
                                    {item.sparklineData && item.sparklineData.length > 0 && (
                                        <div className="w-12 h-8 hidden lg:block">
                                            <svg viewBox="0 0 100 40" className="w-full h-full stroke-current fill-none">
                                                <path
                                                    d={(() => {
                                                        const data = item.sparklineData;
                                                        const min = Math.min(...data);
                                                        const max = Math.max(...data);
                                                        const range = max - min || 1;
                                                        
                                                        const points = data.map((price, i) => {
                                                            const x = (i / (data.length - 1)) * 100;
                                                            const y = 40 - ((price - min) / range) * 40;
                                                            return `${x},${y}`;
                                                        });
                                                        
                                                        return `M ${points.join(' L ')}`;
                                                    })()}
                                                    className={item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                                                    strokeWidth="2"
                                                />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-end min-w-[70px]">
                                        <span className="font-medium text-sm whitespace-nowrap">
                                            {item.currency === 'CNY' ? '¥' : '$'}
                                            {item.price.toFixed(2)}
                                        </span>
                                        <span
                                            className={`text-xs font-medium flex items-center whitespace-nowrap ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
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
                    <button 
                        onClick={() => navigate('/watchlist')}
                        className="w-full py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        View All
                    </button>
                </div>
            </div>
        </>
    );
};

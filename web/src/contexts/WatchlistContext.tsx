import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStockInfoWithChange, batchGetStockInfoWithChange } from '../api/stocks';

interface WatchlistItem {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    lastUpdated?: number;
    sparklineData?: number[]; // Mini chart data points
}

interface WatchlistContextType {
    watchlist: WatchlistItem[];
    addToWatchlist: (symbol: string) => Promise<void>;
    removeFromWatchlist: (symbol: string) => void;
    isInWatchlist: (symbol: string) => boolean;
    refreshPrices: () => Promise<void>;
    isRefreshing: boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
        const saved = localStorage.getItem('watchlist');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return [];
            }
        }
        return [];
    });
    
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Save to localStorage whenever watchlist changes
    useEffect(() => {
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    // Refresh prices for all items in watchlist
    const refreshPrices = useCallback(async () => {
        if (watchlist.length === 0 || isRefreshing) return;
        
        setIsRefreshing(true);
        try {
            const symbols = watchlist.map(item => item.symbol);
            const stockInfos = await batchGetStockInfoWithChange(symbols);
            
            setWatchlist(prev => {
                return prev.map(item => {
                    const info = stockInfos.find(s => s.symbol === item.symbol);
                    if (info) {
                        return {
                            ...item,
                            name: info.name,
                            price: info.currentPrice,
                            currency: info.currency,
                            change: info.change,
                            changePercent: info.changePercent,
                            sparklineData: info.sparklineData,
                            lastUpdated: Date.now(),
                        };
                    }
                    return item;
                });
            });
        } catch (error) {
            console.error('Failed to refresh prices:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [watchlist, isRefreshing]);

    // Auto-refresh prices every 60 seconds
    useEffect(() => {
        if (watchlist.length === 0) return;
        
        // Initial refresh
        refreshPrices();
        
        // Set up interval
        const interval = setInterval(() => {
            refreshPrices();
        }, 60000); // 60 seconds
        
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [watchlist.length]); // Only depend on length to avoid too frequent refreshes

    const addToWatchlist = async (symbol: string) => {
        const upperSymbol = symbol.toUpperCase().trim();
        
        // Check if already exists
        if (watchlist.some(item => item.symbol === upperSymbol)) {
            throw new Error('Symbol already in watchlist');
        }
        
        // Fetch real stock data with change calculation
        const info = await getStockInfoWithChange(upperSymbol);
        
        const newItem: WatchlistItem = {
            symbol: info.symbol,
            name: info.name,
            price: info.currentPrice,
            currency: info.currency,
            change: info.change,
            changePercent: info.changePercent,
            sparklineData: info.sparklineData,
            lastUpdated: Date.now(),
        };
        
        setWatchlist(prev => [...prev, newItem]);
    };

    const removeFromWatchlist = (symbol: string) => {
        setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
    };

    const isInWatchlist = (symbol: string) => {
        return watchlist.some(item => item.symbol === symbol);
    };

    return (
        <WatchlistContext.Provider 
            value={{ 
                watchlist, 
                addToWatchlist, 
                removeFromWatchlist, 
                isInWatchlist,
                refreshPrices,
                isRefreshing,
            }}
        >
            {children}
        </WatchlistContext.Provider>
    );
};

export const useWatchlist = () => {
    const context = useContext(WatchlistContext);
    if (context === undefined) {
        throw new Error('useWatchlist must be used within a WatchlistProvider');
    }
    return context;
};

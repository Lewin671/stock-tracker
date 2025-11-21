import React, { createContext, useContext, useState, useEffect } from 'react';

interface WatchlistItem {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
}

interface WatchlistContextType {
    watchlist: WatchlistItem[];
    addToWatchlist: (item: WatchlistItem) => void;
    removeFromWatchlist: (symbol: string) => void;
    isInWatchlist: (symbol: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export const WatchlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
        const saved = localStorage.getItem('watchlist');
        return saved ? JSON.parse(saved) : [
            // Default items for demo
            { symbol: 'AAPL', name: 'Apple Inc.', price: 189.50, change: 2.30, changePercent: 1.23 },
            { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.85, change: -1.20, changePercent: -0.32 },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.40, change: 0.95, changePercent: 0.69 },
            { symbol: 'TSLA', name: 'Tesla, Inc.', price: 234.30, change: -5.40, changePercent: -2.25 },
            { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 495.20, change: 12.40, changePercent: 2.57 },
        ];
    });

    useEffect(() => {
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    const addToWatchlist = (item: WatchlistItem) => {
        setWatchlist((prev) => {
            if (prev.some((i) => i.symbol === item.symbol)) return prev;
            return [...prev, item];
        });
    };

    const removeFromWatchlist = (symbol: string) => {
        setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
    };

    const isInWatchlist = (symbol: string) => {
        return watchlist.some((item) => item.symbol === symbol);
    };

    return (
        <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }}>
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

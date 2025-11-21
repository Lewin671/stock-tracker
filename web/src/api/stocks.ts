import axiosInstance from './axios';

export interface StockInfo {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  sector?: string;
}

export interface HistoricalPrice {
  date: string;
  price: number;
}

export interface StockHistoryResponse {
  symbol: string;
  period: string;
  data: HistoricalPrice[];
}

// Search for a stock by symbol
export const searchStock = async (symbol: string): Promise<StockInfo> => {
  const response = await axiosInstance.get(`/api/stocks/search/${symbol.toUpperCase()}`);
  return response.data;
};

// Get stock information
export const getStockInfo = async (symbol: string): Promise<StockInfo> => {
  const response = await axiosInstance.get(`/api/stocks/${symbol.toUpperCase()}/info`);
  return response.data;
};

// Get historical stock data
export const getStockHistory = async (
  symbol: string,
  period: '1M' | '3M' | '6M' | '1Y' = '1Y'
): Promise<StockHistoryResponse> => {
  const response = await axiosInstance.get(`/api/stocks/${symbol.toUpperCase()}/history`, {
    params: { period },
  });
  return response.data;
};

// Batch fetch stock info for multiple symbols
export const batchGetStockInfo = async (symbols: string[]): Promise<StockInfo[]> => {
  const promises = symbols.map((symbol) =>
    getStockInfo(symbol).catch((err) => {
      console.error(`Failed to fetch ${symbol}:`, err);
      return null;
    })
  );
  const results = await Promise.all(promises);
  return results.filter((info): info is StockInfo => info !== null);
};

// Get stock info with change calculation (compared to previous day)
export const getStockInfoWithChange = async (
  symbol: string
): Promise<StockInfo & { change: number; changePercent: number; sparklineData: number[] }> => {
  // Fetch current info and 1-month history in parallel
  const [info, history] = await Promise.all([
    getStockInfo(symbol),
    getStockHistory(symbol, '1M').catch(() => null),
  ]);

  let change = 0;
  let changePercent = 0;
  let sparklineData: number[] = [];

  if (history && history.data.length >= 2) {
    // Get the last two data points for change calculation
    const currentPrice = info.currentPrice;
    const previousPrice = history.data[history.data.length - 2].price;
    
    change = currentPrice - previousPrice;
    changePercent = (change / previousPrice) * 100;

    // Get last 30 days for sparkline (or whatever is available)
    sparklineData = history.data.slice(-30).map(d => d.price);
  }

  return {
    ...info,
    change,
    changePercent,
    sparklineData,
  };
};

// Batch fetch stock info with change for multiple symbols
export const batchGetStockInfoWithChange = async (
  symbols: string[]
): Promise<Array<StockInfo & { change: number; changePercent: number; sparklineData: number[] }>> => {
  const promises = symbols.map((symbol) =>
    getStockInfoWithChange(symbol).catch((err) => {
      console.error(`Failed to fetch ${symbol}:`, err);
      return null;
    })
  );
  const results = await Promise.all(promises);
  return results.filter(
    (info): info is StockInfo & { change: number; changePercent: number; sparklineData: number[] } => info !== null
  );
};

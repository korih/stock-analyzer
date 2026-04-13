// Shared TypeScript type definitions for the frontend

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Indicator {
  time: string;
  value: number;
}

export interface StockData {
  symbol: string;
  candles: Candle[];
  indicators?: {
    sma_20?: Indicator[];
    sma_50?: Indicator[];
    sma_200?: Indicator[];
    ema_12?: Indicator[];
    ema_26?: Indicator[];
    rsi_14?: Indicator[];
  };
}

export interface ChartConfig {
  symbol: string;
  timeframe: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
  indicators: string[];
}

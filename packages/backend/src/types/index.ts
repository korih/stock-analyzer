// Shared TypeScript type definitions for the backend

export interface StockCandle {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicator {
  symbol: string;
  date: string;
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  ema_12?: number;
  ema_26?: number;
  rsi_14?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IngestionResult {
  symbol: string;
  recordsInserted: number;
  startDate: string;
  endDate: string;
  duration: number;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  services?: {
    database: string;
  };
}

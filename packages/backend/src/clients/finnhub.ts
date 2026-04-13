interface FinnhubCandle {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  t: number[]; // Timestamps
  v: number[]; // Volumes
  s: string;   // Status
}

interface DailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class FinnhubClient {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';
  private requestCount = 0;
  private resetTime = Date.now() + 60000; // 1 minute

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Rate limiting: Max 60 requests per minute
   */
  private async waitForRateLimit(): Promise<void> {
    if (this.requestCount >= 60 && Date.now() < this.resetTime) {
      const waitTime = this.resetTime - Date.now();
      console.log(`⏳ Rate limit reached, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    if (Date.now() >= this.resetTime) {
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }

    this.requestCount++;
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(url: string, retries = 3): Promise<any> {
    await this.waitForRateLimit();

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);

        if (response.status === 429) {
          // Rate limited - wait and retry
          const waitTime = Math.pow(2, i) * 1000;
          console.log(`⚠️  Rate limited, retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        const waitTime = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Get the most recent daily candle for a symbol
   */
  async getDailyCandle(symbol: string): Promise<DailyCandle> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const to = Math.floor(today.getTime() / 1000);
    const from = Math.floor(yesterday.getTime() / 1000);

    const url = `${this.baseUrl}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`;

    const data: FinnhubCandle = await this.fetchWithRetry(url);

    if (data.s === 'no_data' || !data.c || data.c.length === 0) {
      throw new Error(`No data available for ${symbol}`);
    }

    // Get the most recent candle
    const index = data.c.length - 1;

    return {
      date: new Date(data.t[index] * 1000).toISOString().split('T')[0],
      open: data.o[index],
      high: data.h[index],
      low: data.l[index],
      close: data.c[index],
      volume: data.v[index],
    };
  }

  /**
   * Get historical candles for a symbol
   */
  async getHistoricalCandles(
    symbol: string,
    days: number = 365
  ): Promise<DailyCandle[]> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    const to = Math.floor(today.getTime() / 1000);
    const from = Math.floor(startDate.getTime() / 1000);

    const url = `${this.baseUrl}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`;

    const data: FinnhubCandle = await this.fetchWithRetry(url);

    if (data.s === 'no_data' || !data.c) {
      throw new Error(`No historical data available for ${symbol}`);
    }

    const candles: DailyCandle[] = [];
    for (let i = 0; i < data.c.length; i++) {
      candles.push({
        date: new Date(data.t[i] * 1000).toISOString().split('T')[0],
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      });
    }

    return candles;
  }
}

export const finnhubClient = new FinnhubClient(
  process.env.FINNHUB_API_KEY || ''
);

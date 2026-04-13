'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts'

interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  sma_20?: number
  sma_50?: number
  sma_200?: number
  rsi_14?: number
}

interface StockChartProps {
  symbol: string
}

export function StockChart({ symbol }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<string>('1y')

  // Fetch candle data
  useEffect(() => {
    setLoading(true)

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/stocks/${symbol}/candles?range=${range}`)
      .then(res => res.json())
      .then(data => {
        setCandles(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching candles:', error)
        setLoading(false)
      })
  }, [symbol, range])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    // Convert candles to lightweight-charts format
    const candleData: CandlestickData[] = candles.map(c => ({
      time: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    candlestickSeries.setData(candleData)

    // Add SMA indicators
    if (candles.some(c => c.sma_20)) {
      const sma20Series = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        title: 'SMA 20',
      })
      sma20Series.setData(
        candles
          .filter(c => c.sma_20)
          .map(c => ({ time: c.date, value: c.sma_20! }))
      )
    }

    if (candles.some(c => c.sma_50)) {
      const sma50Series = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        title: 'SMA 50',
      })
      sma50Series.setData(
        candles
          .filter(c => c.sma_50)
          .map(c => ({ time: c.date, value: c.sma_50! }))
      )
    }

    chartRef.current = chart

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [candles])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="stock-chart">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{symbol} Price Chart</h3>
        <div className="flex gap-2">
          {['1d', '1w', '1m', '3m', '1y', '5y'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-sm ${
                range === r
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} />
    </div>
  )
}

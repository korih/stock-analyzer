'use client'

import { useState } from 'react'
import { StockSelector } from '@/components/StockSelector'
import { StockChart } from '@/components/StockChart'

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('AAPL')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Stock Analysis</h2>
        <StockSelector
          selectedSymbol={selectedSymbol}
          onSymbolChange={setSelectedSymbol}
        />
      </div>

      <StockChart symbol={selectedSymbol} />

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">About</h3>
        <p className="text-gray-600">
          Stock Intelligence Platform helps you understand <strong>why</strong> stocks move,
          not just <strong>how</strong> they move. We combine price data, technical indicators,
          news sentiment, SEC filings, and insider trading to provide complete market context.
        </p>
      </div>
    </div>
  )
}

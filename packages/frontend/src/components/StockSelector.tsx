'use client'

import { useEffect, useState } from 'react'

interface Stock {
  id: string
  symbol: string
  name: string
  sector: string
}

interface StockSelectorProps {
  selectedSymbol: string
  onSymbolChange: (symbol: string) => void
}

export function StockSelector({ selectedSymbol, onSymbolChange }: StockSelectorProps) {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/stocks`)
      .then(res => res.json())
      .then(data => {
        setStocks(data)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching stocks:', error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-48"></div>
      </div>
    )
  }

  return (
    <select
      value={selectedSymbol}
      onChange={(e) => onSymbolChange(e.target.value)}
      className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
      data-testid="stock-selector"
    >
      {stocks.map(stock => (
        <option key={stock.id} value={stock.symbol}>
          {stock.symbol} - {stock.name}
        </option>
      ))}
    </select>
  )
}

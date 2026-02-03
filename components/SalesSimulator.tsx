'use client'

import React, { useState } from 'react'
import { CalculationResult, SimulationResult } from '@/types'
import { simulateSales } from '@/utils/calculations'

interface SalesSimulatorProps {
  result: CalculationResult
}

export function SalesSimulator({ result }: SalesSimulatorProps) {
  const [numberOfSales, setNumberOfSales] = useState('100')
  const simulation = simulateSales(result, parseInt(numberOfSales) || 100)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="card bg-gradient-to-br from-gray-50 to-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Simular Vendas</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quantidade de Vendas
        </label>
        <input
          type="number"
          min="1"
          value={numberOfSales}
          onChange={(e) => setNumberOfSales(e.target.value)}
          className="input-field"
          placeholder="100"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Faturamento Total</p>
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(simulation.totalRevenue)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Lucro Total</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(simulation.totalProfit)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Taxas Totais</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(simulation.totalFees)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Custo Total Geral</p>
          <p className="text-2xl font-bold text-gray-700">
            {formatCurrency(simulation.totalCost)}
          </p>
        </div>
      </div>
    </div>
  )
}

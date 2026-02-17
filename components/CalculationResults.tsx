'use client'

import React, { useState } from 'react'
import { CalculationResult } from '@/types'

interface CalculationResultsProps {
  result: CalculationResult
}

export function CalculationResults({ result }: CalculationResultsProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [copied, setCopied] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.suggestedPrice.toFixed(2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Heurística simples: resultados com debug são de Mercado Livre; sem debug, Shopee
  const isMercadoLivre = !!result.debug

  // Para Shopee, queremos exibir o frete total digitado no formulário ("Frete Total (R$)")
  // usando apenas dados já presentes no resultado (sem alterar lógica de cálculo).
  const shopeeFreightTotal = !isMercadoLivre
    ? result.totalCost - result.breakdown.productCost - result.breakdown.otherCosts
    : null

  return (
    <div className="space-y-4">
      <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Preço Sugerido</p>
            <p className="text-4xl font-bold text-primary-700">
              {formatCurrency(result.suggestedPrice)}
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="btn-primary"
          >
            {copied ? '✓ Copiado!' : '📋 Copiar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Lucro por Venda</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(result.profitPerSale)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Taxas Totais</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(result.totalFees)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">Custo Total</p>
          <p className="text-2xl font-bold text-gray-700">
            {formatCurrency(result.totalCost)}
          </p>
        </div>
      </div>

      <div className="card">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full btn-secondary flex items-center justify-center"
        >
          {showBreakdown ? 'Ocultar' : 'Ver'} Detalhamento
          <span className="ml-2">{showBreakdown ? '▲' : '▼'}</span>
        </button>

        {showBreakdown && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Custo do Produto:</span>
              <span className="font-semibold">{formatCurrency(result.breakdown.productCost)}</span>
            </div>
            {isMercadoLivre ? (
              <div className="flex justify-between">
                <span className="text-gray-600">Frete por Unidade:</span>
                <span className="font-semibold">
                  {formatCurrency(result.breakdown.shippingPerUnit)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-gray-600">Frete Total:</span>
                <span className="font-semibold">
                  {formatCurrency(shopeeFreightTotal ?? 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Outros Custos:</span>
              <span className="font-semibold">{formatCurrency(result.breakdown.otherCosts)}</span>
            </div>
            {result.breakdown.categoryPercent !== undefined && (
              <>
                {result.breakdown.mlCategoryEstimate && (
                  <p className="text-sm text-amber-600 mb-2">
                    Taxa estimada. Selecione a categoria para precisão.
                  </p>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {result.breakdown.mlCategoryEstimate ? 'Percentual Estimado:' : 'Percentual da Categoria:'}
                  </span>
                  <span className="font-semibold text-gray-700">
                    {result.breakdown.categoryPercent}%
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Comissão:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(result.breakdown.commission)}
              </span>
            </div>
            {result.breakdown.transactionFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa de Transação:</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(result.breakdown.transactionFee)}
                </span>
              </div>
            )}
            {result.breakdown.transportFee !== undefined && result.breakdown.transportFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa de Transporte:</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(result.breakdown.transportFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Taxa Fixa:</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(result.breakdown.fixedFee)}
              </span>
            </div>
            {result.breakdown.extraCPF450 !== undefined && result.breakdown.extraCPF450 > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Extra CPF 450+ (por item):</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(result.breakdown.extraCPF450)}
                </span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-gray-300 flex justify-between text-lg font-bold">
              <span>Lucro Líquido:</span>
              <span className="text-green-600">{formatCurrency(result.profitPerSale)}</span>
            </div>
            {result.debug && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs font-mono space-y-1">
                <p className="font-bold text-amber-800">DEBUG ML</p>
                <p>mlCategoryId: {String(result.debug.mlCategoryId ?? '(vazio)')}</p>
                <p>mlCategoryEstimate (fallback 12/17): {String(result.debug.mlCategoryEstimate)}</p>
                <p>classicPercentFromApi: {result.debug.classicPercentFromApi ?? '(null)'}</p>
                <p>premiumPercentFromApi: {result.debug.premiumPercentFromApi ?? '(null)'}</p>
                <p>percentUsed (exibido como Percentual): {result.debug.percentUsed}%</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { CalculationInput, CalculationResult } from '@/types'
import { calculatePrice } from '@/utils/calculations'
import { CalculationForm } from '@/components/CalculationForm'
import { CalculationResults } from '@/components/CalculationResults'
import { SalesSimulator } from '@/components/SalesSimulator'
import { ConfigPanel } from '@/components/ConfigPanel'

export default function Home() {
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  const handleCalculate = (input: CalculationInput) => {
    const calculationResult = calculatePrice(input)
    if (calculationResult) {
      setResult(calculationResult)
      // Scroll suave para os resultados
      setTimeout(() => {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
      }, 100)
    } else {
      alert('Erro ao calcular. Verifique os dados informados.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary-700">PRECIFICA PRO</h1>
              <p className="text-sm text-gray-600 mt-1">
                Calculadora profissional de preços para marketplaces
              </p>
            </div>
            <button
              onClick={() => setShowConfig(true)}
              className="p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Configurações"
            >
              <span className="text-2xl">⚙️</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div>
            <CalculationForm onSubmit={handleCalculate} />
          </div>

          {/* Results Section */}
          <div>
            {result && (
              <>
                <CalculationResults result={result} />
              </>
            )}
            {!result && (
              <div className="card text-center py-12">
                <p className="text-gray-500 text-lg">
                  Preencha o formulário e clique em &quot;Calcular&quot; para ver os resultados
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sales Simulator */}
        {result && (
          <div className="mt-8">
            <SalesSimulator result={result} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 text-sm">
          <p>PRECIFICA PRO - Calculadora de Preços para Marketplaces</p>
          <p className="mt-1">© 2024 - Todos os direitos reservados</p>
        </div>
      </footer>

      {/* Config Panel */}
      <ConfigPanel isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  )
}

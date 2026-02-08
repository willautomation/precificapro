'use client'

import React, { useState, useEffect } from 'react'
import { AppConfig } from '@/types'
import { loadConfig, saveConfig, resetConfig, DEFAULT_CONFIG } from '@/utils/config'

interface ConfigPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ConfigPanel({ isOpen, onClose }: ConfigPanelProps) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setConfig(loadConfig())
      setHasChanges(false)
    }
  }, [isOpen])

  const handleSave = () => {
    saveConfig(config)
    setHasChanges(false)
    onClose()
  }

  const handleReset = () => {
    const reset = resetConfig()
    setConfig(reset)
    setHasChanges(true)
  }

  const updateShopeeConfig = (field: keyof AppConfig['shopee'], value: number) => {
    setConfig({
      ...config,
      shopee: {
        ...config.shopee,
        [field]: value,
      },
    })
    setHasChanges(true)
  }

  const updateMLConfig = (field: keyof AppConfig['mercadoLivre'], value: any) => {
    setConfig({
      ...config,
      mercadoLivre: {
        ...config.mercadoLivre,
        [field]: value,
      },
    })
    setHasChanges(true)
  }

  const updateMLFixedFee = (index: number, field: 'min' | 'max' | 'fee', value: number | null) => {
    const newTable = [...config.mercadoLivre.fixedFeeTable]
    newTable[index] = {
      ...newTable[index],
      [field]: value,
    }
    updateMLConfig('fixedFeeTable', newTable)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Shopee Config */}
          <div className="card">
            <h3 className="text-xl font-semibold mb-4 text-primary-700">Shopee</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comissão (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.shopee.commissionPercent}
                  onChange={(e) => updateShopeeConfig('commissionPercent', parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Transação (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.shopee.transactionFeePercent}
                  onChange={(e) => updateShopeeConfig('transactionFeePercent', parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa de Transporte (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.shopee.transportFeePercent}
                  onChange={(e) => updateShopeeConfig('transportFeePercent', parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa Fixa Padrão (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.shopee.fixedFeeDefault}
                  onChange={(e) => updateShopeeConfig('fixedFeeDefault', parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa Fixa CPF (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.shopee.fixedFeeCPF}
                  onChange={(e) => updateShopeeConfig('fixedFeeCPF', parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extra CPF 450+ (R$ por item)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.shopee.cpfHighVolumeExtraFixed ?? 7}
                  onChange={(e) => updateShopeeConfig('cpfHighVolumeExtraFixed', parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Mercado Livre Config */}
          <div className="card">
            <h3 className="text-xl font-semibold mb-4 text-primary-700">Mercado Livre</h3>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percentual Clássico (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.mercadoLivre.defaultCategoryPercentClassico}
                  onChange={(e) => updateMLConfig('defaultCategoryPercentClassico', parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Percentual Premium (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={config.mercadoLivre.defaultCategoryPercentPremium}
                  onChange={(e) => updateMLConfig('defaultCategoryPercentPremium', parseFloat(e.target.value) || 0)}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tabela de Custo Fixo
              </label>
              <div className="space-y-2">
                {config.mercadoLivre.fixedFeeTable.map((range, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.01"
                      value={range.min}
                      onChange={(e) => updateMLFixedFee(index, 'min', parseFloat(e.target.value) || 0)}
                      className="input-field flex-1"
                      placeholder="Mínimo"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      step="0.01"
                      value={range.max || ''}
                      onChange={(e) => updateMLFixedFee(index, 'max', e.target.value ? parseFloat(e.target.value) : null)}
                      className="input-field flex-1"
                      placeholder="Máximo (vazio = ∞)"
                    />
                    <span className="text-gray-500">→</span>
                    <input
                      type="number"
                      step="0.01"
                      value={range.fee}
                      onChange={(e) => updateMLFixedFee(index, 'fee', parseFloat(e.target.value) || 0)}
                      className="input-field flex-1"
                      placeholder="Taxa"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-4">
          <button onClick={handleReset} className="btn-secondary">
            Restaurar Padrão
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={!hasChanges}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { CalculationInput, SellerType, Platform, ObjectiveType, MLPlan } from '@/types'
import { RadioButtonGroup } from './RadioButtonGroup'
import { CategorySelector } from './CategorySelector'
import { MLConnectBlock } from './MLConnectBlock'
import { loadConfig } from '@/utils/config'

interface CalculationFormProps {
  onSubmit: (input: CalculationInput) => void
}

export function CalculationForm({ onSubmit }: CalculationFormProps) {
  const [sellerType, setSellerType] = useState<SellerType>('CPF')
  const [platform, setPlatform] = useState<Platform>('Shopee')
  const [productCost, setProductCost] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [shippingTotal, setShippingTotal] = useState('')
  const [otherCosts, setOtherCosts] = useState('')
  const [objectiveType, setObjectiveType] = useState<ObjectiveType>('lucro')
  const [objectiveValue, setObjectiveValue] = useState('')
  
  // Shopee specific
  const [freeShipping, setFreeShipping] = useState(false)
  const [cpfHighVolume, setCpfHighVolume] = useState(false)
  
  // Mercado Livre specific
  const [mlPlan, setMlPlan] = useState<MLPlan>('classico')
  const [mlClassicoSaleFee, setMlClassicoSaleFee] = useState<number | null>(null)
  const [mlClassicoFixedFee, setMlClassicoFixedFee] = useState<number | null>(null)
  const [mlPremiumSaleFee, setMlPremiumSaleFee] = useState<number | null>(null)
  const [mlPremiumFixedFee, setMlPremiumFixedFee] = useState<number | null>(null)

  useEffect(() => {
    if (platform !== 'MercadoLivre') {
      setMlClassicoSaleFee(null)
      setMlClassicoFixedFee(null)
      setMlPremiumSaleFee(null)
      setMlPremiumFixedFee(null)
    }
  }, [platform])

  const handleCategoryResolved = (
    _categoryId: string | null,
    _categoryName: string | null,
    classicoSaleFee: number | null,
    classicoFixedFee: number | null,
    premiumSaleFee: number | null,
    premiumFixedFee: number | null
  ) => {
    setMlClassicoSaleFee(classicoSaleFee)
    setMlClassicoFixedFee(classicoFixedFee)
    setMlPremiumSaleFee(premiumSaleFee)
    setMlPremiumFixedFee(premiumFixedFee)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const prodCost = parseFloat(productCost) || 0
    const qty = parseInt(quantity) || 1
    
    if (prodCost <= 0) {
      alert('O custo do produto deve ser maior que zero')
      return
    }
    
    if (qty <= 0) {
      alert('A quantidade deve ser maior que zero')
      return
    }
    
    const objValue = parseFloat(objectiveValue) || 0
    if (objValue <= 0) {
      alert('O valor do objetivo deve ser maior que zero')
      return
    }
    
    const input: CalculationInput = {
      sellerType,
      platform,
      productCost: prodCost,
      quantity: qty,
      shippingTotal: parseFloat(shippingTotal) || 0,
      otherCosts: parseFloat(otherCosts) || 0,
      objectiveType,
      objectiveValue: objValue,
    }

    if (platform === 'Shopee') {
      input.shopeeFreeShippingProgram = freeShipping
      input.shopeeCpfHighVolume = sellerType === 'CPF' ? cpfHighVolume : false
    } else {
      input.mlPlan = mlPlan
      input.mlSaleFeePercent = mlPlan === 'premium' ? mlPremiumSaleFee : mlClassicoSaleFee
      input.mlFixedFee = mlPlan === 'premium' ? mlPremiumFixedFee : mlClassicoFixedFee
      if (typeof window !== 'undefined') {
        input.mlReputationLevelId =
          localStorage.getItem('ml_reputation') ?? undefined
      }
    }

    onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      {/* Tipo de Vendedor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Tipo de Vendedor
        </label>
        <RadioButtonGroup
          options={[
            { value: 'CPF', label: 'CPF' },
            { value: 'CNPJ', label: 'CNPJ' },
          ]}
          value={sellerType}
          onChange={(value) => {
            const v = value as SellerType
            setSellerType(v)
            if (v === 'CNPJ') setCpfHighVolume(false)
          }}
        />
      </div>

      {/* Plataforma */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Plataforma
        </label>
        <RadioButtonGroup
          options={[
            { value: 'Shopee', label: 'Shopee', icon: '🛒' },
            { value: 'MercadoLivre', label: 'Mercado Livre', icon: '📦' },
          ]}
          value={platform}
          onChange={(value) => setPlatform(value as Platform)}
        />
      </div>

      {/* Campos Comuns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custo do Produto (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={productCost}
            onChange={(e) => setProductCost(e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantidade
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frete Total (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={shippingTotal}
            onChange={(e) => setShippingTotal(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Outros Custos (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={otherCosts}
            onChange={(e) => setOtherCosts(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Campos Específicos Shopee */}
      {platform === 'Shopee' && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={freeShipping}
              onChange={(e) => setFreeShipping(e.target.checked)}
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-gray-700">Participa do Programa de Frete Grátis</span>
          </label>
          {sellerType === 'CPF' && (
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cpfHighVolume}
                onChange={(e) => setCpfHighVolume(e.target.checked)}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">
                Sou CPF com mais de 450 pedidos nos últimos 90 dias
              </span>
            </label>
          )}
        </div>
      )}

      {/* Campos Específicos Mercado Livre */}
      {platform === 'MercadoLivre' && (
        <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <MLConnectBlock />

          <CategorySelector onCategoryResolved={handleCategoryResolved} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Plano
            </label>
            <RadioButtonGroup
              options={[
                { value: 'classico', label: 'Clássico' },
                { value: 'premium', label: 'Premium' },
              ]}
              value={mlPlan}
              onChange={(value) => setMlPlan(value as MLPlan)}
            />
          </div>
        </div>
      )}

      {/* Objetivo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Objetivo
        </label>
        <RadioButtonGroup
          options={[
            { value: 'lucro', label: 'Lucro em R$' },
            { value: 'margem', label: 'Margem em %' },
          ]}
          value={objectiveType}
          onChange={(value) => setObjectiveType(value as ObjectiveType)}
        />
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor do Objetivo
          </label>
          <input
            type="number"
            step="0.01"
            value={objectiveValue}
            onChange={(e) => setObjectiveValue(e.target.value)}
            className="input-field"
            required
          />
        </div>
      </div>

      <button type="submit" className="btn-primary w-full">
        Calcular
      </button>
    </form>
  )
}

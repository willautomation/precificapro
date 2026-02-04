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
  const [classicoPercent, setClassicoPercent] = useState(12)
  const [premiumPercent, setPremiumPercent] = useState(17)
  const [categoryClassicoPercent, setCategoryClassicoPercent] = useState<number | null>(null)
  const [categoryPremiumPercent, setCategoryPremiumPercent] = useState<number | null>(null)
  // ML extras (não alteram cálculo ainda)
  const [mlPesoG, setMlPesoG] = useState('')
  const [mlDimC, setMlDimC] = useState('')
  const [mlDimL, setMlDimL] = useState('')
  const [mlDimA, setMlDimA] = useState('')
  const [mlCep, setMlCep] = useState('01001-000')

  // Carregar percentuais do config
  useEffect(() => {
    const config = loadConfig()
    setClassicoPercent(config.mercadoLivre.defaultCategoryPercentClassico)
    setPremiumPercent(config.mercadoLivre.defaultCategoryPercentPremium)
    // Resetar percentuais da categoria quando mudar de plataforma
    if (platform !== 'MercadoLivre') {
      setCategoryClassicoPercent(null)
      setCategoryPremiumPercent(null)
    }
  }, [platform])

  // Listener para atualizar quando o config mudar
  useEffect(() => {
    const handleConfigUpdate = () => {
      const config = loadConfig()
      setClassicoPercent(config.mercadoLivre.defaultCategoryPercentClassico)
      setPremiumPercent(config.mercadoLivre.defaultCategoryPercentPremium)
      // Se não houver categoria selecionada, usar os padrões
      if (categoryClassicoPercent === null && categoryPremiumPercent === null) {
        // Os valores já foram atualizados acima
      }
    }

    // Escutar evento customizado disparado quando o config é salvo
    window.addEventListener('configUpdated', handleConfigUpdate)
    // Também escutar mudanças no localStorage (para outras abas)
    window.addEventListener('storage', handleConfigUpdate)

    return () => {
      window.removeEventListener('configUpdated', handleConfigUpdate)
      window.removeEventListener('storage', handleConfigUpdate)
    }
  }, [categoryClassicoPercent, categoryPremiumPercent])

  // Handler para quando uma categoria é selecionada
  const handleCategorySelect = (classico: number | null, premium: number | null) => {
    setCategoryClassicoPercent(classico)
    setCategoryPremiumPercent(premium)
  }

  // Calcular percentuais efetivos (categoria ou padrão)
  const effectiveClassicoPercent = categoryClassicoPercent !== null 
    ? categoryClassicoPercent 
    : classicoPercent
  const effectivePremiumPercent = categoryPremiumPercent !== null 
    ? categoryPremiumPercent 
    : premiumPercent

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
      input.freeShipping = freeShipping
      if (sellerType === 'CPF') {
        input.cpfHighVolume = cpfHighVolume
      }
    } else {
      input.mlPlan = mlPlan
      input.categoryClassicoPercent = categoryClassicoPercent
      input.categoryPremiumPercent = categoryPremiumPercent
      const peso = parseFloat(mlPesoG) || 0
      if (peso > 0) input.mlPesoG = peso
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
          onChange={(value) => setSellerType(value as SellerType)}
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

          <CategorySelector
            priceForFees={parseFloat(productCost) || 100}
            onCategorySelect={handleCategorySelect}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Peso do produto (g)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={mlPesoG}
              onChange={(e) => setMlPesoG(e.target.value)}
              className="input-field"
              placeholder="Ex: 500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dimensões (opcional) — C x L x A (cm)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                value={mlDimC}
                onChange={(e) => setMlDimC(e.target.value)}
                className="input-field"
                placeholder="C"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={mlDimL}
                onChange={(e) => setMlDimL(e.target.value)}
                className="input-field"
                placeholder="L"
              />
              <input
                type="number"
                min="0"
                step="0.1"
                value={mlDimA}
                onChange={(e) => setMlDimA(e.target.value)}
                className="input-field"
                placeholder="A"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CEP de simulação
            </label>
            <input
              type="text"
              value={mlCep}
              onChange={(e) => setMlCep(e.target.value)}
              className="input-field"
              placeholder="01001-000"
            />
          </div>

          {(!mlPesoG.trim() || !mlCep.trim()) && (
            <p className="text-sm text-amber-600">
              ⚠ Peso e CEP são importantes para futura simulação de frete. O cálculo atual não é bloqueado.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Plano
            </label>
            <RadioButtonGroup
              options={[
                { value: 'classico', label: `Clássico ${effectiveClassicoPercent}%` },
                { value: 'premium', label: `Premium ${effectivePremiumPercent}%` },
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

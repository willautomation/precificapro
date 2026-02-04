import {
  CalculationInput,
  CalculationResult,
  SimulationResult,
  AppConfig,
} from '@/types'
import { loadConfig } from './config'
import { getReputationInfo } from './mlReputation'

/** Tabela de frete estimado por faixa de peso (kg) - base para simulação ML */
const ML_FREIGHT_TABLE_KG: { maxKg: number; fee: number }[] = [
  { maxKg: 0.3, fee: 40.9 },
  { maxKg: 0.5, fee: 41.9 },
  { maxKg: 1, fee: 43.9 },
  { maxKg: 2, fee: 46.9 },
  { maxKg: 5, fee: 52.0 },
  { maxKg: 9, fee: 83.9 },
]

function estimateMLFreight(pesoG: number, discountPct: number): number {
  const pesoKg = pesoG / 1000
  let freteBase = 0
  for (const row of ML_FREIGHT_TABLE_KG) {
    if (pesoKg <= row.maxKg) {
      freteBase = row.fee
      break
    }
  }
  if (freteBase === 0 && pesoKg > 0) {
    freteBase = ML_FREIGHT_TABLE_KG[ML_FREIGHT_TABLE_KG.length - 1].fee
  }
  return freteBase * (1 - discountPct)
}

function calculateShopeeFees(
  price: number,
  input: CalculationInput,
  config: AppConfig
): { commission: number; transactionFee: number; transportFee: number; fixedFee: number } {
  const { shopee } = config
  const { sellerType, freeShipping, cpfHighVolume } = input

  // Comissão incide apenas sobre o valor do produto (não inclui frete)
  const commission = price * (shopee.commissionPercent / 100)
  const transactionFee = price * (shopee.transactionFeePercent / 100)

  let transportFee = 0
  if (freeShipping) {
    transportFee = price * (shopee.transportFeePercent / 100)
  }

  let fixedFee = shopee.fixedFeeDefault
  if (sellerType === 'CPF') {
    if (cpfHighVolume) {
      fixedFee = shopee.fixedFeeCPF
    } else {
      fixedFee = shopee.fixedFeeDefault
    }
  }

  return { commission, transactionFee, transportFee, fixedFee }
}

function calculateMLFixedFee(price: number, config: AppConfig): number {
  const { fixedFeeTable } = config.mercadoLivre

  // Se preço < 12.50, custo fixo = metade do preço
  if (price < 12.50) {
    return price / 2
  }

  for (const range of fixedFeeTable) {
    if (range.max === null) {
      if (price >= range.min) return range.fee
    } else {
      if (price >= range.min && price < range.max) {
        return range.fee
      }
    }
  }

  return 0
}

function calculateMLFees(
  price: number,
  input: CalculationInput,
  config: AppConfig
): { commission: number; fixedFee: number; categoryPercent: number } {
  // Determinar percentual baseado no plano selecionado
  let categoryPercent: number
  if (input.mlPlan === 'premium') {
    categoryPercent = config.mercadoLivre.defaultCategoryPercentPremium
  } else {
    categoryPercent = config.mercadoLivre.defaultCategoryPercentClassico
  }
  
  const commission = price * (categoryPercent / 100)
  const fixedFee = calculateMLFixedFee(price, config)

  return { commission, fixedFee, categoryPercent }
}

export function calculatePrice(input: CalculationInput): CalculationResult | null {
  if (input.productCost <= 0 || input.quantity <= 0) {
    return null
  }

  const config = loadConfig()
  let shippingPerUnit = input.shippingTotal / input.quantity
  // ML: usar frete estimado (peso + reputação) quando shippingTotal é 0
  if (
    input.platform === 'MercadoLivre' &&
    input.shippingTotal === 0 &&
    (input.mlPesoG ?? 0) > 0
  ) {
    const repInfo = getReputationInfo(input.mlReputationLevelId)
    shippingPerUnit =
      estimateMLFreight(input.mlPesoG!, repInfo.discountPct) / input.quantity
  }
  const totalCost = input.productCost + input.otherCosts + shippingPerUnit

  let suggestedPrice = 0
  let totalFees = 0

  if (input.platform === 'Shopee') {
    // Calcular taxas para Shopee
    const { commissionPercent, transactionFeePercent, transportFeePercent } = config.shopee
    const { sellerType, freeShipping, cpfHighVolume } = input

    let percentual = commissionPercent + transactionFeePercent
    if (freeShipping) {
      percentual += transportFeePercent
    }

    // Determinar taxa fixa correta conforme tipo de vendedor
    let fixedFee: number
    if (sellerType === 'CPF' && cpfHighVolume) {
      fixedFee = config.shopee.fixedFeeCPF
    } else {
      fixedFee = config.shopee.fixedFeeDefault
    }

    if (input.objectiveType === 'lucro') {
      // preco = (custo_total + lucro_alvo + taxa_fixa) / (1 - percentual)
      suggestedPrice = (totalCost + input.objectiveValue + fixedFee) / (1 - (percentual / 100))
    } else {
      // preco = (custo_total + taxa_fixa) / (1 - percentual - margem)
      const margem = input.objectiveValue / 100
      suggestedPrice = (totalCost + fixedFee) / (1 - (percentual / 100) - margem)
    }

    const fees = calculateShopeeFees(suggestedPrice, input, config)
    totalFees = fees.commission + fees.transactionFee + fees.transportFee + fees.fixedFee
  } else {
    // Mercado Livre
    // Determinar percentual baseado no plano selecionado
    // Se houver percentuais da categoria selecionada, usar eles; senão usar os padrões
    let categoryPercent: number
    if (input.mlPlan === 'premium') {
      categoryPercent = input.categoryPremiumPercent !== null && input.categoryPremiumPercent !== undefined
        ? input.categoryPremiumPercent
        : config.mercadoLivre.defaultCategoryPercentPremium
    } else {
      categoryPercent = input.categoryClassicoPercent !== null && input.categoryClassicoPercent !== undefined
        ? input.categoryClassicoPercent
        : config.mercadoLivre.defaultCategoryPercentClassico
    }
    const percentual = categoryPercent

    if (input.objectiveType === 'lucro') {
      // Precisamos iterar porque o custo fixo depende do preço
      suggestedPrice = (totalCost + input.objectiveValue) / (1 - percentual / 100)
      let lastPrice = 0
      let iterations = 0
      
      while (Math.abs(suggestedPrice - lastPrice) > 0.01 && iterations < 100) {
        lastPrice = suggestedPrice
        const fixedFee = calculateMLFixedFee(suggestedPrice, config)
        suggestedPrice = (totalCost + input.objectiveValue + fixedFee) / (1 - percentual / 100)
        iterations++
      }
    } else {
      const margem = input.objectiveValue / 100
      suggestedPrice = (totalCost) / (1 - percentual / 100 - margem)
      let lastPrice = 0
      let iterations = 0
      
      while (Math.abs(suggestedPrice - lastPrice) > 0.01 && iterations < 100) {
        lastPrice = suggestedPrice
        const fixedFee = calculateMLFixedFee(suggestedPrice, config)
        suggestedPrice = (totalCost + fixedFee) / (1 - percentual / 100 - margem)
        iterations++
      }
    }

    const fees = calculateMLFees(suggestedPrice, input, config)
    totalFees = fees.commission + fees.fixedFee
  }

  const profitPerSale = suggestedPrice - totalFees - totalCost

  let breakdown: CalculationResult['breakdown']

  if (input.platform === 'Shopee') {
    const fees = calculateShopeeFees(suggestedPrice, input, config)
    breakdown = {
      productCost: input.productCost,
      shippingPerUnit,
      otherCosts: input.otherCosts,
      commission: fees.commission,
      transactionFee: fees.transactionFee,
      transportFee: fees.transportFee,
      fixedFee: fees.fixedFee,
    }
  } else {
    const fees = calculateMLFees(suggestedPrice, input, config)
    breakdown = {
      productCost: input.productCost,
      shippingPerUnit,
      otherCosts: input.otherCosts,
      commission: fees.commission,
      transactionFee: 0,
      fixedFee: fees.fixedFee,
      categoryPercent: fees.categoryPercent,
    }
  }

  return {
    suggestedPrice,
    profitPerSale,
    totalFees,
    totalCost,
    breakdown,
  }
}

export function simulateSales(
  result: CalculationResult,
  numberOfSales: number
): SimulationResult {
  return {
    numberOfSales,
    totalRevenue: result.suggestedPrice * numberOfSales,
    totalProfit: result.profitPerSale * numberOfSales,
    totalFees: result.totalFees * numberOfSales,
    totalCost: result.totalCost * numberOfSales,
  }
}

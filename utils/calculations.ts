import {
  CalculationInput,
  CalculationResult,
  SimulationResult,
  AppConfig,
} from '@/types'
import { loadConfig } from './config'

function calculateShopeeFees(
  price: number,
  input: CalculationInput,
  config: AppConfig
): { commission: number; transactionFee: number; transportFee: number; fixedFee: number } {
  const { shopee } = config
  const { sellerType, freeShipping, cpfHighVolume } = input

  const commission = price * (shopee.commissionPercent / 100)
  const transactionFee = price * (shopee.transactionFeePercent / 100)

  let transportFee = 0
  if (freeShipping) {
    transportFee = price * (shopee.transportFeePercent / 100)
  }

  let fixedFee = shopee.fixedFeeDefault
  if (sellerType === 'CPF') {
    fixedFee = cpfHighVolume ? shopee.fixedFeeCPF : shopee.fixedFeeDefault
  }

  return { commission, transactionFee, transportFee, fixedFee }
}

export function calculatePrice(input: CalculationInput): CalculationResult | null {
  if (input.productCost <= 0 || input.quantity <= 0) {
    return null
  }

  const config = loadConfig()
  const shippingPerUnit = input.shippingTotal / input.quantity
  const totalCost = input.productCost + input.otherCosts + shippingPerUnit

  let suggestedPrice = 0
  let totalFees = 0

  if (input.platform === 'Shopee') {
    const { commissionPercent, transactionFeePercent, transportFeePercent } = config.shopee
    const { sellerType, freeShipping, cpfHighVolume } = input

    let percentual = commissionPercent + transactionFeePercent
    if (freeShipping) percentual += transportFeePercent

    let fixedFee: number
    if (sellerType === 'CPF' && cpfHighVolume) {
      fixedFee = config.shopee.fixedFeeCPF
    } else {
      fixedFee = config.shopee.fixedFeeDefault
    }

    if (input.objectiveType === 'lucro') {
      suggestedPrice = (totalCost + input.objectiveValue + fixedFee) / (1 - percentual / 100)
    } else {
      const margem = input.objectiveValue / 100
      suggestedPrice = (totalCost + fixedFee) / (1 - percentual / 100 - margem)
    }

    const fees = calculateShopeeFees(suggestedPrice, input, config)
    totalFees = fees.commission + fees.transactionFee + fees.transportFee + fees.fixedFee
  } else {
    const saleFeePct = input.mlSaleFeePercent ?? 12
    const fixedFee = input.mlFixedFee ?? 0
    const percentual = saleFeePct

    if (input.objectiveType === 'lucro') {
      suggestedPrice = (totalCost + input.objectiveValue + fixedFee) / (1 - percentual / 100)
    } else {
      const margem = input.objectiveValue / 100
      suggestedPrice = (totalCost + fixedFee) / (1 - percentual / 100 - margem)
    }

    totalFees = suggestedPrice * (percentual / 100) + fixedFee
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
    const saleFeePct = input.mlSaleFeePercent ?? 12
    const fixedFee = input.mlFixedFee ?? 0
    breakdown = {
      productCost: input.productCost,
      shippingPerUnit,
      otherCosts: input.otherCosts,
      commission: suggestedPrice * (saleFeePct / 100),
      transactionFee: 0,
      fixedFee,
      categoryPercent: saleFeePct,
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

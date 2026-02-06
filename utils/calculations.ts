import {
  CalculationInput,
  CalculationResult,
  SimulationResult,
  AppConfig,
} from '@/types'
import { loadConfig } from './config'

function calcularPelaTabela(
  tabela: { min: number; max: number | null; fee: number }[],
  preco: number
): number {
  for (const range of tabela) {
    if (range.max === null) {
      if (preco >= range.min) return range.fee
    } else {
      if (preco >= range.min && preco < range.max) {
        return range.fee
      }
    }
  }
  return 0
}

export function calculatePrice(input: CalculationInput): CalculationResult | null {
  if (input.productCost <= 0 || input.quantity <= 0) {
    return null
  }

  const config = loadConfig()
  const cfgShopee = config.shopee
  const cfgML = config.mercadoLivre

  const shippingPerUnit = input.shippingTotal / input.quantity
  const totalCost = input.productCost + input.otherCosts + shippingPerUnit

  let suggestedPrice = 0
  let totalFees = 0

  if (input.platform === 'Shopee') {
    const pctBase = cfgShopee.commissionPercent
    const pctFreteGratis = input.shopeeFreeShippingProgram
      ? cfgShopee.transportFeePercent
      : 0
    const pctHighVolume = input.shopeeCpfHighVolume
      ? cfgShopee.transactionFeePercent
      : 0
    const pctTotal = pctBase + pctFreteGratis + pctHighVolume
    const fixedFee =
      input.sellerType === 'CPF'
        ? cfgShopee.fixedFeeCPF
        : cfgShopee.fixedFeeDefault

    if (input.objectiveType === 'lucro') {
      suggestedPrice =
        (totalCost + input.objectiveValue + fixedFee) / (1 - pctTotal / 100)
    } else {
      const margem = input.objectiveValue / 100
      suggestedPrice = (totalCost + fixedFee) / (1 - pctTotal / 100 - margem)
    }

    totalFees = suggestedPrice * (pctTotal / 100) + fixedFee
  } else {
    let taxaPercentualML =
      input.mlPlan === 'premium'
        ? cfgML.defaultCategoryPercentPremium / 100
        : cfgML.defaultCategoryPercentClassico / 100

    if (input.mlSaleFeePercent != null) {
      taxaPercentualML = input.mlSaleFeePercent / 100
    }

    const getTaxaFixa = (preco: number) =>
      input.mlFixedFee != null
        ? input.mlFixedFee
        : calcularPelaTabela(cfgML.fixedFeeTable, preco)

    if (input.objectiveType === 'lucro') {
      suggestedPrice = (totalCost + input.objectiveValue) / (1 - taxaPercentualML)
      let lastPrice = 0
      let iterations = 0
      while (Math.abs(suggestedPrice - lastPrice) > 0.01 && iterations < 100) {
        lastPrice = suggestedPrice
        const taxaFixaML = getTaxaFixa(suggestedPrice)
        suggestedPrice =
          (totalCost + input.objectiveValue + taxaFixaML) / (1 - taxaPercentualML)
        iterations++
      }
    } else {
      const margem = input.objectiveValue / 100
      suggestedPrice = totalCost / (1 - taxaPercentualML - margem)
      let lastPrice = 0
      let iterations = 0
      while (Math.abs(suggestedPrice - lastPrice) > 0.01 && iterations < 100) {
        lastPrice = suggestedPrice
        const taxaFixaML = getTaxaFixa(suggestedPrice)
        suggestedPrice = (totalCost + taxaFixaML) / (1 - taxaPercentualML - margem)
        iterations++
      }
    }

    const taxaFixaML = getTaxaFixa(suggestedPrice)
    totalFees = suggestedPrice * taxaPercentualML + taxaFixaML
  }

  const profitPerSale = suggestedPrice - totalFees - totalCost

  let breakdown: CalculationResult['breakdown']

  if (input.platform === 'Shopee') {
    const pctBase = cfgShopee.commissionPercent
    const pctFreteGratis = input.shopeeFreeShippingProgram
      ? cfgShopee.transportFeePercent
      : 0
    const pctHighVolume = input.shopeeCpfHighVolume
      ? cfgShopee.transactionFeePercent
      : 0
    const fixedFee =
      input.sellerType === 'CPF'
        ? cfgShopee.fixedFeeCPF
        : cfgShopee.fixedFeeDefault
    breakdown = {
      productCost: input.productCost,
      shippingPerUnit,
      otherCosts: input.otherCosts,
      commission: suggestedPrice * (pctBase / 100),
      transactionFee: input.shopeeCpfHighVolume
        ? suggestedPrice * (pctHighVolume / 100)
        : 0,
      transportFee: input.shopeeFreeShippingProgram
        ? suggestedPrice * (pctFreteGratis / 100)
        : 0,
      fixedFee,
    }
  } else {
    let taxaPercentualML =
      input.mlPlan === 'premium'
        ? cfgML.defaultCategoryPercentPremium / 100
        : cfgML.defaultCategoryPercentClassico / 100
    if (input.mlSaleFeePercent != null) {
      taxaPercentualML = input.mlSaleFeePercent / 100
    }
    const taxaFixaML =
      input.mlFixedFee != null
        ? input.mlFixedFee
        : calcularPelaTabela(cfgML.fixedFeeTable, suggestedPrice)
    const categoryPercent = taxaPercentualML * 100
    breakdown = {
      productCost: input.productCost,
      shippingPerUnit,
      otherCosts: input.otherCosts,
      commission: suggestedPrice * taxaPercentualML,
      transactionFee: 0,
      fixedFee: taxaFixaML,
      categoryPercent,
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

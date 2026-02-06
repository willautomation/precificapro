import {
  CalculationInput,
  CalculationResult,
  SimulationResult,
  AppConfig,
} from '@/types'
import { loadConfig } from './config'

type SellerType = 'CPF' | 'CNPJ'

interface ShopeeInput {
  precoVenda: number
  quantidade: number
  sellerType: SellerType
  participaFreteGratis: boolean
}

export function calcularShopeeOficial(input: ShopeeInput) {
  const {
    precoVenda,
    quantidade,
    sellerType,
    participaFreteGratis,
  } = input

  const COMISSAO_PERCENT = 0.12
  const TRANSACAO_PERCENT = 0.02
  const TRANSPORTE_PERCENT = participaFreteGratis ? 0.06 : 0

  const TAXA_FIXA = sellerType === 'CPF' ? 7 : 4

  const percentualTotal =
    COMISSAO_PERCENT +
    TRANSACAO_PERCENT +
    TRANSPORTE_PERCENT

  const valorPercentual = precoVenda * percentualTotal
  const valorFixo = TAXA_FIXA * quantidade

  const totalTaxas = valorPercentual + valorFixo

  return {
    comissao: precoVenda * COMISSAO_PERCENT,
    taxaTransacao: precoVenda * TRANSACAO_PERCENT,
    taxaTransporte: precoVenda * TRANSPORTE_PERCENT,
    taxaFixa: valorFixo,
    totalTaxas,
  }
}

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
  const cfgML = config.mercadoLivre

  const shippingPerUnit = input.shippingTotal / input.quantity
  const totalCost = input.productCost + input.otherCosts + shippingPerUnit

  let suggestedPrice = 0
  let totalFees = 0

  if (input.platform === 'Shopee') {
    const participaFreteGratis = !!input.shopeeFreeShippingProgram
    const TAXA_FIXA = input.sellerType === 'CPF' ? 7 : 4
    const percentualTotal = 0.12 + 0.02 + (participaFreteGratis ? 0.06 : 0)

    if (input.objectiveType === 'lucro') {
      suggestedPrice =
        (totalCost + input.objectiveValue + TAXA_FIXA * input.quantity) /
        (1 - percentualTotal)
    } else {
      const margem = input.objectiveValue / 100
      suggestedPrice =
        (totalCost + TAXA_FIXA * input.quantity) /
        (1 - percentualTotal - margem)
    }

    const shopee = calcularShopeeOficial({
      precoVenda: suggestedPrice,
      quantidade: input.quantity,
      sellerType: input.sellerType,
      participaFreteGratis,
    })
    totalFees = shopee.totalTaxas
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
    const shopee = calcularShopeeOficial({
      precoVenda: suggestedPrice,
      quantidade: input.quantity,
      sellerType: input.sellerType,
      participaFreteGratis: !!input.shopeeFreeShippingProgram,
    })
    breakdown = {
      productCost: input.productCost,
      shippingPerUnit,
      otherCosts: input.otherCosts,
      commission: shopee.comissao,
      transactionFee: shopee.taxaTransacao,
      transportFee: shopee.taxaTransporte,
      fixedFee: shopee.taxaFixa,
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

import {
  CalculationInput,
  CalculationResult,
  SimulationResult,
} from '@/types'
import { loadConfig, DEFAULT_ML_CONFIG } from './config'

type SellerType = 'CPF' | 'CNPJ'

interface ShopeeInput {
  precoVenda: number
  quantidade: number
  sellerType: SellerType
  participaFreteGratis: boolean
  cpfHighVolume: boolean
}

interface ShopeeFeesPerItem {
  comissao: number
  taxaTransacao: number
  taxaTransporte: number
  taxaFixa: number
  extraCPF450: number
  totalPorItem: number
}

function getShopeeConfigValues(shopeeConfig: { commissionPercent?: number; transactionFeePercent?: number; transportFeePercent?: number; fixedFeeDefault?: number; fixedFeeCPF?: number; cpfHighVolumeFixedFeeExtra?: number; cpfHighVolumeExtraFixed?: number; commissionCapPerItem?: number }) {
  const s = shopeeConfig
  const commissionPercent = (s.commissionPercent ?? 12) / 100
  const transactionPercent = (s.transactionFeePercent ?? 2) / 100
  const transportPercent = s.transportFeePercent ?? 6
  const fixedFeeDefault = s.fixedFeeDefault ?? 4
  const fixedFeeCPF = s.fixedFeeCPF ?? 7
  const cpfHighVolumeExtra = s.cpfHighVolumeExtraFixed ?? s.cpfHighVolumeFixedFeeExtra ?? 7
  const commissionCapPerItem = s.commissionCapPerItem ?? 100
  return {
    commissionPercent,
    transactionPercent,
    transportPercent,
    fixedFeeDefault,
    fixedFeeCPF,
    cpfHighVolumeExtra,
    commissionCapPerItem,
  }
}

export function calcularShopeeOficial(input: ShopeeInput): {
  comissao: number
  taxaTransacao: number
  taxaTransporte: number
  taxaFixa: number
  extraCPF450: number
  totalTaxas: number
} {
  const config = loadConfig()
  const cfg = getShopeeConfigValues(config.shopee)

  const { precoVenda, quantidade, sellerType, participaFreteGratis, cpfHighVolume } = input

  const transportPercent = participaFreteGratis ? cfg.transportPercent / 100 : 0

  const comissaoBruta = precoVenda * cfg.commissionPercent
  const comissao = Math.min(comissaoBruta, cfg.commissionCapPerItem)

  const taxaTransacao = precoVenda * cfg.transactionPercent
  const taxaTransporte = precoVenda * transportPercent

  let fixedFeeBase: number
  if (sellerType === 'CNPJ') {
    fixedFeeBase = cfg.fixedFeeDefault
  } else {
    fixedFeeBase = cfg.fixedFeeCPF
  }

  let taxaFixaPorItem = fixedFeeBase
  if (precoVenda < 10) {
    taxaFixaPorItem = Math.min(fixedFeeBase, precoVenda / 2)
  }

  const extraPorItem = sellerType === 'CPF' && cpfHighVolume ? (cfg.cpfHighVolumeExtra ?? 7) : 0
  const extraCPF450Total = extraPorItem * quantidade

  const totalPorItem = comissao + taxaTransacao + taxaTransporte + taxaFixaPorItem + extraPorItem
  const totalTaxas = totalPorItem * quantidade

  return {
    comissao: comissao * quantidade,
    taxaTransacao: taxaTransacao * quantidade,
    taxaTransporte: taxaTransporte * quantidade,
    taxaFixa: taxaFixaPorItem * quantidade,
    extraCPF450: extraCPF450Total,
    totalTaxas,
  }
}

function calcularTaxasShopeePorPreco(
  precoVenda: number,
  quantidade: number,
  sellerType: SellerType,
  participaFreteGratis: boolean,
  cpfHighVolume: boolean
): ShopeeFeesPerItem & { totalTaxas: number } {
  const config = loadConfig()
  const cfg = getShopeeConfigValues(config.shopee)

  const transportPercent = participaFreteGratis ? cfg.transportPercent / 100 : 0

  const comissaoBruta = precoVenda * cfg.commissionPercent
  const comissao = Math.min(comissaoBruta, cfg.commissionCapPerItem)

  const taxaTransacao = precoVenda * cfg.transactionPercent
  const taxaTransporte = precoVenda * transportPercent

  let fixedFeeBase: number
  if (sellerType === 'CNPJ') {
    fixedFeeBase = cfg.fixedFeeDefault
  } else {
    fixedFeeBase = cfg.fixedFeeCPF
  }

  let taxaFixaPorItem = fixedFeeBase
  if (precoVenda < 10) {
    taxaFixaPorItem = Math.min(fixedFeeBase, precoVenda / 2)
  }

  const extraPorItem = sellerType === 'CPF' && cpfHighVolume ? (cfg.cpfHighVolumeExtra ?? 7) : 0
  const totalPorItem = comissao + taxaTransacao + taxaTransporte + taxaFixaPorItem + extraPorItem

  return {
    comissao,
    taxaTransacao,
    taxaTransporte,
    taxaFixa: taxaFixaPorItem,
    extraCPF450: extraPorItem * quantidade,
    totalPorItem,
    totalTaxas: totalPorItem * quantidade,
  }
}

function calcularPelaTabela(
  tabela: { min: number; max: number | null; fee: number }[] | undefined,
  precoVenda: number
): number {
  const t = tabela?.length ? tabela : DEFAULT_ML_CONFIG.fixedFeeTable
  for (const range of t) {
    if (range.max === null) {
      if (precoVenda >= range.min) return range.fee
    } else {
      if (precoVenda >= range.min && precoVenda < range.max) {
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
    const cpfHighVolume = input.sellerType === 'CPF' ? !!input.shopeeCpfHighVolume : false

    const getTaxas = (preco: number) =>
      calcularTaxasShopeePorPreco(
        preco,
        input.quantity,
        input.sellerType,
        participaFreteGratis,
        cpfHighVolume
      )

    const margem = input.objectiveValue / 100
    let lastPrice = 0
    let iterations = 0

    if (input.objectiveType === 'lucro') {
      suggestedPrice = totalCost + input.objectiveValue + 20
      while (Math.abs(suggestedPrice - lastPrice) > 0.01 && iterations < 100) {
        lastPrice = suggestedPrice
        const taxas = getTaxas(suggestedPrice)
        suggestedPrice = totalCost + input.objectiveValue + taxas.totalTaxas
        iterations++
      }
    } else {
      suggestedPrice = totalCost / (1 - margem)
      while (Math.abs(suggestedPrice - lastPrice) > 0.01 && iterations < 100) {
        lastPrice = suggestedPrice
        const taxas = getTaxas(suggestedPrice)
        suggestedPrice = (totalCost + taxas.totalTaxas) / (1 - margem)
        iterations++
      }
    }

    const shopee = calcularShopeeOficial({
      precoVenda: suggestedPrice,
      quantidade: input.quantity,
      sellerType: input.sellerType,
      participaFreteGratis,
      cpfHighVolume,
    })
    totalFees = shopee.totalTaxas
  } else {
    const categoryPercentClassic = (input as { mlCategory?: { saleFeeClassicPercent?: number } }).mlCategory?.saleFeeClassicPercent ?? (input.mlPlan === 'classico' ? input.mlSaleFeePercent : undefined)
    const categoryPercentPremium = (input as { mlCategory?: { saleFeePremiumPercent?: number } }).mlCategory?.saleFeePremiumPercent ?? (input.mlPlan === 'premium' ? input.mlSaleFeePercent : undefined)
    const percentClassico = categoryPercentClassic ?? cfgML.defaultCategoryPercentClassico
    const percentPremium = categoryPercentPremium ?? cfgML.defaultCategoryPercentPremium
    const taxaPercentualML = (input.mlPlan === 'premium' ? percentPremium : percentClassico) / 100

    const getTaxaFixa = (precoVenda: number) =>
      (input.mlFixedFee != null && input.mlFixedFee > 0)
        ? input.mlFixedFee
        : calcularPelaTabela(cfgML.fixedFeeTable, precoVenda)

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
      cpfHighVolume: input.sellerType === 'CPF' ? !!input.shopeeCpfHighVolume : false,
    })
    breakdown = {
      productCost: input.productCost,
      shippingPerUnit,
      otherCosts: input.otherCosts,
      commission: shopee.comissao,
      transactionFee: shopee.taxaTransacao,
      transportFee: shopee.taxaTransporte,
      fixedFee: shopee.taxaFixa,
      extraCPF450: input.sellerType === 'CPF' ? shopee.extraCPF450 : undefined,
    }
  } else {
    const categoryPercentClassic = (input as { mlCategory?: { saleFeeClassicPercent?: number } }).mlCategory?.saleFeeClassicPercent ?? (input.mlPlan === 'classico' ? input.mlSaleFeePercent : undefined)
    const categoryPercentPremium = (input as { mlCategory?: { saleFeePremiumPercent?: number } }).mlCategory?.saleFeePremiumPercent ?? (input.mlPlan === 'premium' ? input.mlSaleFeePercent : undefined)
    const percentClassico = categoryPercentClassic ?? cfgML.defaultCategoryPercentClassico
    const percentPremium = categoryPercentPremium ?? cfgML.defaultCategoryPercentPremium
    const taxaPercentualML = (input.mlPlan === 'premium' ? percentPremium : percentClassico) / 100
    const taxaFixaML =
      (input.mlFixedFee != null && input.mlFixedFee > 0)
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

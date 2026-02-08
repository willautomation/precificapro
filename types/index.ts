export type SellerType = 'CPF' | 'CNPJ'
export type Platform = 'Shopee' | 'MercadoLivre'
export type ObjectiveType = 'lucro' | 'margem'
export type MLPlan = 'classico' | 'premium'

export interface CalculationInput {
  sellerType: SellerType
  platform: Platform
  productCost: number
  quantity: number
  shippingTotal: number
  otherCosts: number
  objectiveType: ObjectiveType
  objectiveValue: number
  // Shopee specific
  shopeeFreeShippingProgram?: boolean
  shopeeCpfHighVolume?: boolean
  // Mercado Livre specific
  mlPlan?: MLPlan
  /** Taxa percentual de venda da categoria (API ML) */
  mlSaleFeePercent?: number | null
  /** Taxa fixa da categoria (API ML) */
  mlFixedFee?: number | null
  /** level_id ou power_seller_status da API, para reputação */
  mlReputationLevelId?: string | null
}

export interface CalculationResult {
  suggestedPrice: number
  profitPerSale: number
  totalFees: number
  totalCost: number
  breakdown: {
    productCost: number
    shippingPerUnit: number
    otherCosts: number
    commission: number
    transactionFee: number
    transportFee?: number
    fixedFee: number
    extraCPF450?: number
    categoryPercent?: number
  }
}

export interface SimulationResult {
  numberOfSales: number
  totalRevenue: number
  totalProfit: number
  totalFees: number
  totalCost: number
}

export interface ShopeeConfig {
  commissionPercent: number
  transactionFeePercent?: number
  transportFeePercent?: number
  fixedFeeDefault: number
  fixedFeeCPF: number
  freeShippingExtraPercent: number
  cpfHighVolumeExtraPercent: number
  cpfHighVolumeFixedFeeExtra: number
  /** R$ por item para checkbox "Sou CPF com mais de 450 pedidos nos últimos 90 dias" */
  cpfHighVolumeExtraFixed?: number
  commissionCapPerItem?: number
}

export interface MercadoLivreConfig {
  fixedFeeTable: {
    min: number
    max: number | null
    fee: number
  }[]
  defaultCategoryPercentClassico: number
  defaultCategoryPercentPremium: number
}

export interface AppConfig {
  shopee: ShopeeConfig
  mercadoLivre: MercadoLivreConfig
}

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
  freeShipping?: boolean
  cpfHighVolume?: boolean
  // Mercado Livre specific
  mlPlan?: MLPlan
  categoryClassicoPercent?: number | null
  categoryPremiumPercent?: number | null
  /** Peso em gramas, para estimativa de frete quando shippingTotal é 0 */
  mlPesoG?: number
  /** level_id ou power_seller_status da API, para aplicar desconto na estimativa de frete */
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
  transactionFeePercent: number
  transportFeePercent: number
  fixedFeeDefault: number
  fixedFeeCPF: number
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

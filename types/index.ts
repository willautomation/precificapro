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
  /** Taxa percentual Clássico (API listing_prices) */
  mlClassicoSaleFeePercent?: number | null
  /** Taxa percentual Premium (API listing_prices) */
  mlPremiumSaleFeePercent?: number | null
  /** Taxa fixa da categoria (API ML) — Clássico ou Premium conforme plano */
  mlFixedFee?: number | null
  /** Categoria selecionada (API ML) — quando definido, usa taxa real; senão fallback estimado */
  mlCategoryId?: string | null
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
    /** true = taxa vinda do fallback (12%/17%), não da categoria */
    mlCategoryEstimate?: boolean
  }
  /** DEBUG ML - temporário */
  debug?: {
    mlCategoryId: string | null | undefined
    mlCategoryEstimate: boolean
    classicPercentFromApi: number | null | undefined
    premiumPercentFromApi: number | null | undefined
    percentUsed: number
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

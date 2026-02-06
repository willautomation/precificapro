import { AppConfig, ShopeeConfig, MercadoLivreConfig } from '@/types'

const DEFAULT_SHOPEE_CONFIG: ShopeeConfig = {
  commissionPercent: 12,
  transactionFeePercent: 2,
  transportFeePercent: 6,
  fixedFeeDefault: 4,
  fixedFeeCPF: 7,
  freeShippingExtraPercent: 6,
  cpfHighVolumeExtraPercent: 0,
  cpfHighVolumeFixedFeeExtra: 0,
}

const DEFAULT_ML_CONFIG: MercadoLivreConfig = {
  fixedFeeTable: [
    { min: 0, max: 12.50, fee: 0 }, // será metade do preço
    { min: 12.50, max: 29, fee: 6.25 },
    { min: 29, max: 50, fee: 6.50 },
    { min: 50, max: 79, fee: 6.75 },
    { min: 79, max: null, fee: 0 },
  ],
  defaultCategoryPercentClassico: 12,
  defaultCategoryPercentPremium: 17,
}

export const DEFAULT_CONFIG: AppConfig = {
  shopee: DEFAULT_SHOPEE_CONFIG,
  mercadoLivre: DEFAULT_ML_CONFIG,
}

const CONFIG_STORAGE_KEY = 'precifica-pro-config'

export function saveConfig(config: AppConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
    // Disparar evento customizado para notificar outros componentes
    window.dispatchEvent(new CustomEvent('configUpdated'))
  }
}

export function loadConfig(): AppConfig {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY)
    if (saved) {
      try {
        const config = JSON.parse(saved) as any
        
        // Migração Shopee: garantir novos campos e opcionais
        if (config.shopee) {
          if (config.shopee.freeShippingExtraPercent == null) {
            config.shopee.freeShippingExtraPercent = 6
          }
          if (config.shopee.cpfHighVolumeExtraPercent == null) {
            config.shopee.cpfHighVolumeExtraPercent = 0
          }
          if (config.shopee.cpfHighVolumeFixedFeeExtra == null) {
            config.shopee.cpfHighVolumeFixedFeeExtra = 0
          }
          if (config.shopee.transactionFeePercent == null) {
            config.shopee.transactionFeePercent = 2
          }
          if (config.shopee.transportFeePercent == null) {
            config.shopee.transportFeePercent = 6
          }
        }
        // Migração: se existir defaultCategoryPercent antigo, converter para os novos campos
        if (config.mercadoLivre && 'defaultCategoryPercent' in config.mercadoLivre) {
          const oldPercent = config.mercadoLivre.defaultCategoryPercent
          if (!config.mercadoLivre.defaultCategoryPercentClassico) {
            config.mercadoLivre.defaultCategoryPercentClassico = oldPercent || 12
          }
          if (!config.mercadoLivre.defaultCategoryPercentPremium) {
            config.mercadoLivre.defaultCategoryPercentPremium = oldPercent || 17
          }
          delete config.mercadoLivre.defaultCategoryPercent
          // Salvar a configuração migrada
          saveConfig(config as AppConfig)
        }
        
        return config as AppConfig
      } catch (e) {
        console.error('Erro ao carregar configuração:', e)
      }
    }
  }
  return DEFAULT_CONFIG
}

export function resetConfig(): AppConfig {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CONFIG_STORAGE_KEY)
  }
  return DEFAULT_CONFIG
}

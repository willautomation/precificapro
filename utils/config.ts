import { AppConfig, ShopeeConfig, MercadoLivreConfig } from '@/types'

const SHOPEE_STORAGE_KEY = 'precifica_config_shopee_v1'
const ML_STORAGE_KEY = 'precifica_config_ml_v1'
const LEGACY_STORAGE_KEY = 'precifica-pro-config'

export const DEFAULT_SHOPEE_CONFIG: ShopeeConfig = {
  commissionPercent: 12,
  transactionFeePercent: 2,
  transportFeePercent: 6,
  fixedFeeDefault: 4,
  fixedFeeCPF: 7,
  freeShippingExtraPercent: 6,
  cpfHighVolumeExtraPercent: 0,
  cpfHighVolumeFixedFeeExtra: 7,
  cpfHighVolumeExtraFixed: 7,
  commissionCapPerItem: 100,
}

export const DEFAULT_ML_CONFIG: MercadoLivreConfig = {
  fixedFeeTable: [
    { min: 0, max: 12.50, fee: 0 },
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

function deepMerge<T extends object>(defaults: T, overrides: Partial<T> | null): T {
  if (!overrides || typeof overrides !== 'object') return { ...defaults }
  const result = { ...defaults }
  for (const key of Object.keys(overrides) as (keyof T)[]) {
    const defVal = defaults[key]
    const ovVal = overrides[key]
    if (ovVal !== undefined && ovVal !== null) {
      if (typeof defVal === 'object' && defVal !== null && !Array.isArray(defVal) && typeof ovVal === 'object' && ovVal !== null) {
        (result as any)[key] = deepMerge(defVal as object, ovVal as object)
      } else {
        (result as any)[key] = ovVal
      }
    }
  }
  return result
}

function migrateLegacyConfig(): void {
  if (typeof window === 'undefined') return
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacy) return
  try {
    const parsed = JSON.parse(legacy) as any
    if (parsed.shopee) {
      localStorage.setItem(SHOPEE_STORAGE_KEY, JSON.stringify(parsed.shopee))
    }
    if (parsed.mercadoLivre) {
      localStorage.setItem(ML_STORAGE_KEY, JSON.stringify(parsed.mercadoLivre))
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
}

function loadShopeeConfig(): ShopeeConfig {
  migrateLegacyConfig()
  if (typeof window === 'undefined') return DEFAULT_SHOPEE_CONFIG
  const saved = localStorage.getItem(SHOPEE_STORAGE_KEY)
  if (!saved) return DEFAULT_SHOPEE_CONFIG
  try {
    const overrides = JSON.parse(saved) as Partial<ShopeeConfig>
    const merged = deepMerge(DEFAULT_SHOPEE_CONFIG, overrides)
    if (merged.cpfHighVolumeExtraFixed == null && merged.cpfHighVolumeFixedFeeExtra != null) {
      merged.cpfHighVolumeExtraFixed = merged.cpfHighVolumeFixedFeeExtra
    }
    if (merged.cpfHighVolumeExtraFixed == null) merged.cpfHighVolumeExtraFixed = 7
    return merged
  } catch {
    return DEFAULT_SHOPEE_CONFIG
  }
}

function loadMLConfig(): MercadoLivreConfig {
  migrateLegacyConfig()
  if (typeof window === 'undefined') return DEFAULT_ML_CONFIG
  const saved = localStorage.getItem(ML_STORAGE_KEY)
  if (!saved) return DEFAULT_ML_CONFIG
  try {
    const overrides = JSON.parse(saved) as Partial<MercadoLivreConfig>
    const merged = deepMerge(DEFAULT_ML_CONFIG, overrides)
    return merged
  } catch {
    return DEFAULT_ML_CONFIG
  }
}

export function saveConfig(config: AppConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SHOPEE_STORAGE_KEY, JSON.stringify(config.shopee))
    localStorage.setItem(ML_STORAGE_KEY, JSON.stringify(config.mercadoLivre))
    window.dispatchEvent(new CustomEvent('configUpdated'))
  }
}

export function loadConfig(): AppConfig {
  return {
    shopee: loadShopeeConfig(),
    mercadoLivre: loadMLConfig(),
  }
}

export function resetConfig(): AppConfig {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SHOPEE_STORAGE_KEY)
    localStorage.removeItem(ML_STORAGE_KEY)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('configUpdated'))
  }
  return DEFAULT_CONFIG
}

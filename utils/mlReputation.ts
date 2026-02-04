/**
 * Mapeamento de reputação do Mercado Livre (API -> PT-BR + desconto no frete).
 * levelId vem de user.seller_reputation.level_id ou power_seller_status.
 */

export interface ReputationInfo {
  labelPt: string
  colorKey: string
  discountPct: number
}

const REPUTATION_MAP: Record<string, ReputationInfo> = {
  '5_green': { labelPt: 'Verde (Excelente)', colorKey: 'green', discountPct: 0.6 },
  '4_light_green': { labelPt: 'Verde-claro (Bom)', colorKey: 'light_green', discountPct: 0.5 },
  '3_yellow': { labelPt: 'Amarelo (Regular)', colorKey: 'yellow', discountPct: 0.4 },
  '2_orange': { labelPt: 'Laranja (Atenção)', colorKey: 'orange', discountPct: 0.3 },
  '1_red': { labelPt: 'Vermelho (Baixo)', colorKey: 'red', discountPct: 0 },
  // power_seller_status (MercadoLíder)
  gold: { labelPt: 'Ouro (MercadoLíder)', colorKey: 'gold', discountPct: 0.6 },
  platinum: { labelPt: 'Platina (MercadoLíder)', colorKey: 'platinum', discountPct: 0.65 },
  silver: { labelPt: 'Prata (MercadoLíder)', colorKey: 'silver', discountPct: 0.55 },
}

const DEFAULT: ReputationInfo = {
  labelPt: 'Não identificada',
  colorKey: 'unknown',
  discountPct: 0,
}

export function getReputationInfo(levelId: string | null | undefined): ReputationInfo {
  if (levelId == null || typeof levelId !== 'string') {
    return DEFAULT
  }
  const key = levelId.trim().toLowerCase()
  return REPUTATION_MAP[key] ?? DEFAULT
}

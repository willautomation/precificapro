import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ML_BASE = process.env.ML_BASE_URL || 'https://api.mercadolibre.com'

type SaleFeeDetailItem = { type?: string; percentage_fee?: number }
type ListingPriceItem = {
  listing_type_id?: string
  sale_fee_amount?: number
  sale_fee_details?: SaleFeeDetailItem[]
  listing_fee_amount?: number
  listing_fee_details?: { fixed_fee?: number; gross_amount?: number }
}

function getPercentFromItem(saleFeeDetails: unknown, saleFeeAmount: number | undefined, price: number): { percent: number | null; used: 'percentage_fee' | 'sale_fee_amount_calc'; percentNullReason?: string } {
  const calcPercent = saleFeeAmount != null && price > 0 ? Math.round((saleFeeAmount / price) * 10000) / 100 : null
  const details = Array.isArray(saleFeeDetails) ? saleFeeDetails : []
  const feeDetail = details.find((d: { percentage_fee?: unknown }) => typeof (d as { percentage_fee?: number })?.percentage_fee === 'number')
  const pct = feeDetail ? (feeDetail as { percentage_fee: number }).percentage_fee : undefined
  if (typeof pct === 'number') {
    return { percent: pct, used: 'percentage_fee' }
  }
  if (calcPercent != null) {
    return { percent: calcPercent, used: 'sale_fee_amount_calc' }
  }
  return { percent: null, used: 'sale_fee_amount_calc', percentNullReason: 'NO_SALE_FEE_AMOUNT_OR_PRICE' }
}

type ListingPricesResult = {
  classico: number | null
  classicoFixed: number | null
  premium: number | null
  premiumFixed: number | null
  debug: {
    usedPrice: number
    categoryId: string
    listingTypeIdClassic: string | null
    listingTypeIdPremium: string | null
    classicPercentFromApi: number | null
    premiumPercentFromApi: number | null
    classicFieldUsed: 'percentage_fee' | 'sale_fee_amount_calc' | null
    premiumFieldUsed: 'percentage_fee' | 'sale_fee_amount_calc' | null
    rawItems: Array<{
      listing_type_id?: string
      sale_fee_amount?: number
      sale_fee_details?: unknown
      listing_fee_amount?: number
      listing_fee_details?: unknown
      firstItemKeys?: string[]
      percentNullReason?: string
    }>
    fallbackReason?: string
  }
}

async function fetchFromListingPrices(
  categoryId: string,
  price: number
): Promise<ListingPricesResult> {
  const url = `${ML_BASE}/sites/MLB/listing_prices?price=${price}&category_id=${categoryId}`
  console.log('[ml/fees] REQUEST', { category_id: categoryId, price, listing_prices_url: url })
  let classico: number | null = null
  let classicoFixed: number | null = null
  let premium: number | null = null
  let premiumFixed: number | null = null
  let listingTypeIdClassic: string | null = null
  let listingTypeIdPremium: string | null = null
  let classicFieldUsed: 'percentage_fee' | 'sale_fee_amount_calc' | null = null
  let premiumFieldUsed: 'percentage_fee' | 'sale_fee_amount_calc' | null = null
  const rawItems: Array<{ listing_type_id?: string; sale_fee_amount?: number; sale_fee_details?: unknown; listing_fee_amount?: number; listing_fee_details?: unknown; firstItemKeys?: string[]; percentNullReason?: string }> = []
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PrecificaPro/1.0',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.log('[ml/fees] listing_prices NOT OK', res.status)
      return { classico, classicoFixed, premium, premiumFixed, debug: { usedPrice: price, categoryId, listingTypeIdClassic, listingTypeIdPremium, classicPercentFromApi: null, premiumPercentFromApi: null, classicFieldUsed: null, premiumFieldUsed: null, rawItems, fallbackReason: `ML_API_ERROR status=${res.status}` } }
    }
    const data = (await res.json()) as ListingPriceItem[]
    const arr = Array.isArray(data) ? data : []
    console.log('[ml/fees] listing_prices RESPONSE', arr.map((i) => ({ listing_type_id: i.listing_type_id, sale_fee_amount: i.sale_fee_amount, sale_fee_details: i.sale_fee_details, listing_fee_amount: i.listing_fee_amount, listing_fee_details: i.listing_fee_details })))
    for (const item of arr) {
      const firstItemKeys = item && typeof item === 'object' ? Object.keys(item) : []
      const { percent, used, percentNullReason } = getPercentFromItem(item.sale_fee_details, item.sale_fee_amount, price)
      rawItems.push({
        listing_type_id: item.listing_type_id,
        sale_fee_amount: item.sale_fee_amount,
        sale_fee_details: item.sale_fee_details,
        listing_fee_amount: item.listing_fee_amount,
        listing_fee_details: item.listing_fee_details,
        firstItemKeys,
        percentNullReason,
      })
      const ld = item.listing_fee_details as { fixed_fee?: number; gross_amount?: number } | undefined
      const fixed = ld?.fixed_fee ?? ld?.gross_amount ?? item.listing_fee_amount ?? null
      if (item.listing_type_id === 'gold_special') {
        classico = percent
        classicoFixed = fixed
        listingTypeIdClassic = 'gold_special'
        classicFieldUsed = used
      } else if (item.listing_type_id === 'gold_pro') {
        premium = percent
        premiumFixed = fixed
        listingTypeIdPremium = 'gold_pro'
        premiumFieldUsed = used
      }
    }
    return { classico, classicoFixed, premium, premiumFixed, debug: { usedPrice: price, categoryId, listingTypeIdClassic, listingTypeIdPremium, classicPercentFromApi: classico, premiumPercentFromApi: premium, classicFieldUsed, premiumFieldUsed, rawItems } }
  } catch (e) {
    console.log('[ml/fees] listing_prices ERROR', e)
    return { classico, classicoFixed, premium, premiumFixed, debug: { usedPrice: price, categoryId, listingTypeIdClassic, listingTypeIdPremium, classicPercentFromApi: null, premiumPercentFromApi: null, classicFieldUsed: null, premiumFieldUsed: null, rawItems, fallbackReason: 'ML_API_ERROR' } }
  }
}

async function fetchFromCategories(categoryId: string): Promise<{ classico: number | null; classicoFixed: number | null; premium: number | null; premiumFixed: number | null }> {
  const res = await fetch(`${ML_BASE}/categories/${categoryId}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) return { classico: null, classicoFixed: null, premium: null, premiumFixed: null }
  const data = await res.json()
  const settings = data.settings?.listing_types ?? []
  const pick = (lt: { sale_fees?: { percentage?: number; ratio?: number }[]; listing_fee_details?: { fixed_fee?: number } | number; sale_fee_details?: { fixed_fee?: number } }) => {
    let saleFee: number | null = null
    let fixedFee: number | null = null
    const saleFees = lt?.sale_fees ?? []
    const fee0 = saleFees[0]
    if (fee0) {
      if (typeof fee0.percentage === 'number') saleFee = fee0.percentage
      else if (typeof fee0.ratio === 'number') saleFee = fee0.ratio * 100
    }
    const ld = lt?.listing_fee_details ?? 0
    if (typeof ld === 'number') fixedFee = ld
    else if (ld?.fixed_fee != null) fixedFee = ld.fixed_fee
    if (lt?.sale_fee_details?.fixed_fee != null) fixedFee = lt.sale_fee_details.fixed_fee
    return { saleFee, fixedFee }
  }
  const goldPro = settings.find((t: { id?: string }) => t.id === 'gold_pro')
  const goldSpecial = settings.find((t: { id?: string }) => t.id === 'gold_special')
  const c = pick(goldPro ?? goldSpecial ?? settings[0])
  const s = pick(goldSpecial ?? goldPro ?? settings[0])
  return {
    classico: s.saleFee,
    classicoFixed: s.fixedFee,
    premium: c.saleFee,
    premiumFixed: c.fixedFee,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId') ?? searchParams.get('category_id')
  const priceParam = searchParams.get('price')
  const price = priceParam ? parseFloat(priceParam) : NaN

  if (!categoryId) {
    return NextResponse.json(
      { error: 'category_id é obrigatório' },
      { status: 400 }
    )
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { error: 'price é obrigatório e deve ser um número maior que zero' },
      { status: 400 }
    )
  }

  try {
    const fromListingPrices = await fetchFromListingPrices(categoryId, price)
    const hasListingPrices =
      (fromListingPrices.classico != null || fromListingPrices.premium != null)
    if (hasListingPrices) {
      return NextResponse.json({
        classico: fromListingPrices.classico,
        premium: fromListingPrices.premium,
        classico_fixed: fromListingPrices.classicoFixed,
        premium_fixed: fromListingPrices.premiumFixed,
        debug: fromListingPrices.debug,
      })
    }
    const fromCategories = await fetchFromCategories(categoryId)
    return NextResponse.json({
      classico: fromCategories.classico,
      premium: fromCategories.premium,
      classico_fixed: fromCategories.classicoFixed,
      premium_fixed: fromCategories.premiumFixed,
      debug: { ...fromListingPrices.debug, fallbackReason: fromListingPrices.debug.fallbackReason ?? 'LISTING_PRICES_EMPTY_FELLBACK_TO_CATEGORIES' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ml/fees] Erro:', message)
    return NextResponse.json({
      error: message,
      debug: { usedPrice: price, categoryId: categoryId ?? '', listingTypeIdClassic: null, listingTypeIdPremium: null, classicPercentFromApi: null, premiumPercentFromApi: null, classicFieldUsed: null, premiumFieldUsed: null, rawItems: [], fallbackReason: 'ML_API_ERROR' },
    }, { status: 500 })
  }
}

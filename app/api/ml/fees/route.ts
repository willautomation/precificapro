import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ML_BASE = process.env.ML_BASE_URL || 'https://api.mercadolibre.com'

type ListingPriceItem = {
  listing_type_id?: string
  sale_fee_amount?: number
  sale_fee_details?: { percentage_fee?: number }
  listing_fee_amount?: number
  listing_fee_details?: { fixed_fee?: number; gross_amount?: number }
}

async function fetchFromListingPrices(
  categoryId: string,
  price: number
): Promise<{ classico: number | null; classicoFixed: number | null; premium: number | null; premiumFixed: number | null }> {
  const url = `${ML_BASE}/sites/MLB/listing_prices?price=${price}&category_id=${categoryId}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!res.ok) return { classico: null, classicoFixed: null, premium: null, premiumFixed: null }
  const data = (await res.json()) as ListingPriceItem[]
  const arr = Array.isArray(data) ? data : []
  let classico: number | null = null
  let classicoFixed: number | null = null
  let premium: number | null = null
  let premiumFixed: number | null = null
  for (const item of arr) {
    const percent = item.sale_fee_details?.percentage_fee ?? (item.sale_fee_amount != null && price > 0 ? (item.sale_fee_amount / price) * 100 : null)
    const fixed = item.listing_fee_details?.fixed_fee ?? item.listing_fee_details?.gross_amount ?? item.listing_fee_amount ?? null
    if (item.listing_type_id === 'gold_special') {
      classico = percent
      classicoFixed = fixed
    } else if (item.listing_type_id === 'gold_pro') {
      premium = percent
      premiumFixed = fixed
    }
  }
  return { classico, classicoFixed, premium, premiumFixed }
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
  const price = priceParam ? parseFloat(priceParam) : 100

  if (!categoryId) {
    return NextResponse.json(
      { error: 'category_id é obrigatório' },
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
      })
    }
    const fromCategories = await fetchFromCategories(categoryId)
    return NextResponse.json({
      classico: fromCategories.classico,
      premium: fromCategories.premium,
      classico_fixed: fromCategories.classicoFixed,
      premium_fixed: fromCategories.premiumFixed,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ml/fees] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const ML_BASE = process.env.ML_BASE_URL || 'https://api.mercadolibre.com'
const SITE = 'MLB'

function getToken(req: Request): string | null {
  const auth = req.headers.get('authorization')
  const bearer = auth?.replace(/^Bearer\s+/i, '').trim()
  if (bearer) return bearer
  return null
}

type ListingPriceItem = {
  listing_type_id: string
  sale_fee_details?: {
    percentage_fee?: number
    fixed_fee?: number
  }
  listing_fee_details?: {
    fixed_fee?: number
  }
}

export async function GET(request: Request) {
  let token = getToken(request)
  if (!token) {
    const cookieStore = await cookies()
    token =
      cookieStore.get('ml_access_token')?.value ??
      cookieStore.get('access_token')?.value ??
      null
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Token não encontrado. Conecte o Mercado Livre.' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const categoryId =
    searchParams.get('categoryId') ?? searchParams.get('category_id')
  const price = parseFloat(searchParams.get('price') ?? '100') || 100
  const listingType = searchParams.get('listingType') ?? searchParams.get('listing_type_id')

  if (!categoryId) {
    return NextResponse.json(
      { error: 'categoryId (ou category_id) é obrigatório' },
      { status: 400 }
    )
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': 'PrecificaPRO/1.0',
  }

  try {
    let url = `${ML_BASE}/sites/${SITE}/listing_prices?price=${encodeURIComponent(price)}&category_id=${encodeURIComponent(categoryId)}`
    if (listingType) {
      url += `&listing_type_id=${encodeURIComponent(listingType)}`
    }

    const res = await fetch(url, { headers, cache: 'no-store' })

    if (!res.ok) {
      const text = await res.text()
      console.error('[ml/fees] listing_prices não-ok:', res.status, text)
      return NextResponse.json(
        { error: 'Falha ao buscar taxas do Mercado Livre' },
        { status: res.status }
      )
    }

    const data = await res.json()
    const items: ListingPriceItem[] = Array.isArray(data) ? data : [data]

    const pick = (item: ListingPriceItem) => {
      const saleDetails = item.sale_fee_details ?? {}
      const listingDetails = item.listing_fee_details ?? {}
      const saleFeePercent = saleDetails.percentage_fee ?? 0
      const saleFixedFee = saleDetails.fixed_fee ?? 0
      const listingFixedFee = listingDetails.fixed_fee ?? 0
      return {
        sale_fee_percent: saleFeePercent,
        fixed_fee: saleFixedFee || listingFixedFee,
        listing_type_id: item.listing_type_id,
        category_id: categoryId,
      }
    }

    // gold_pro = Clássico, gold_special = Premium
    const goldPro = items.find(
      (i) => i.listing_type_id === 'gold_pro'
    )
    const goldSpecial = items.find(
      (i) => i.listing_type_id === 'gold_special'
    )

    const classicoData = goldPro ? pick(goldPro) : null
    const premiumData = goldSpecial ? pick(goldSpecial) : null

    // Resposta normalizada + retrocompatível
    const primary = classicoData ?? premiumData
    return NextResponse.json({
      sale_fee_percent: (classicoData?.sale_fee_percent ?? premiumData?.sale_fee_percent) ?? null,
      fixed_fee: (classicoData?.fixed_fee ?? premiumData?.fixed_fee) ?? 0,
      listing_type_id: (listingType || primary?.listing_type_id) ?? null,
      category_id: categoryId,
      classico: classicoData?.sale_fee_percent ?? null,
      premium: premiumData?.sale_fee_percent ?? null,
      classico_fixed_fee: classicoData?.fixed_fee ?? 0,
      premium_fixed_fee: premiumData?.fixed_fee ?? 0,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ml/fees] Erro:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

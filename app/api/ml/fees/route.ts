import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ML_BASE = process.env.ML_BASE_URL || 'https://api.mercadolibre.com'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categoryId =
    searchParams.get('categoryId') ?? searchParams.get('category_id')

  if (!categoryId) {
    return NextResponse.json(
      { error: 'category_id é obrigatório' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(`${ML_BASE}/categories/${categoryId}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[ml/fees] categories não-ok:', res.status, text)
      return NextResponse.json(
        { error: 'Falha ao buscar taxas da categoria' },
        { status: res.status }
      )
    }

    const data = await res.json()
    const settings = data.settings?.listing_types ?? []

    const pick = (lt: { sale_fees?: { percentage?: number; ratio?: number }[]; listing_fee_details?: { fixed_fee?: number } | number; sale_fee_details?: { fixed_fee?: number } }) => {
      let sale_fee: number | null = null
      let listing_type_fee = 0
      let fixed_fee = 0
      const saleFees = lt?.sale_fees ?? []
      const fee0 = saleFees[0]
      if (fee0) {
        if (typeof fee0.percentage === 'number') sale_fee = fee0.percentage
        else if (typeof fee0.ratio === 'number') sale_fee = fee0.ratio * 100
      }
      const ld = lt?.listing_fee_details ?? 0
      if (typeof ld === 'number') listing_type_fee = ld
      else if (ld?.fixed_fee != null) listing_type_fee = ld.fixed_fee
      if (lt?.sale_fee_details?.fixed_fee != null) fixed_fee = lt.sale_fee_details.fixed_fee
      return { sale_fee, listing_type_fee, fixed_fee }
    }

    const goldPro = settings.find((t: { id?: string }) => t.id === 'gold_pro')
    const goldSpecial = settings.find((t: { id?: string }) => t.id === 'gold_special')
    const c = pick(goldPro ?? goldSpecial ?? settings[0])
    const s = pick(goldSpecial ?? goldPro ?? settings[0])

    return NextResponse.json({
      sale_fee: c.sale_fee ?? s.sale_fee,
      listing_type_fee: c.listing_type_fee || s.listing_type_fee,
      fixed_fee: c.fixed_fee || s.fixed_fee,
      classico: s.sale_fee,
      premium: c.sale_fee,
      classico_fixed: s.fixed_fee,
      premium_fixed: c.fixed_fee,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ml/fees] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

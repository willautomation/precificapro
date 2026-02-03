import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const ML_BASE = process.env.ML_BASE_URL || 'https://api.mercadolibre.com'

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('ml_access_token')?.value

  if (!accessToken) {
    return NextResponse.json({
      seller_id: null,
      reputation: null,
      origin: null,
    })
  }

  try {
    const headers: HeadersInit = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    }

    const meRes = await fetch(`${ML_BASE}/users/me`, { headers })
    if (!meRes.ok) {
      return NextResponse.json({
        seller_id: null,
        reputation: null,
        origin: null,
      })
    }

    const me = await meRes.json()
    const sellerId = me.id?.toString() ?? null

    let reputation: string | null = null
    let origin: string | null = null

    if (sellerId) {
      try {
        const userRes = await fetch(`${ML_BASE}/users/${sellerId}`, { headers })
        if (userRes.ok) {
          const user = await userRes.json()
          const level = user.seller_reputation?.level_id
          const powerSeller = user.seller_reputation?.power_seller_status
          if (powerSeller) {
            reputation = powerSeller
          } else if (level) {
            reputation = level
          }
        }
      } catch {
        // ignore
      }

      try {
        const addrRes = await fetch(`${ML_BASE}/users/${sellerId}/addresses`, { headers })
        if (addrRes.ok) {
          const addresses = await addrRes.json()
          const selling = addresses.find((a: any) => a.address_type === 'default_selling_address') || addresses[0]
          if (selling?.city?.name && selling?.state?.name) {
            origin = `${selling.city.name}/${selling.state.name}`
          } else if (selling?.city?.name) {
            origin = selling.city.name
          }
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      seller_id: sellerId,
      reputation: reputation ?? null,
      origin: origin ?? null,
    })
  } catch {
    return NextResponse.json({
      seller_id: null,
      reputation: null,
      origin: null,
    })
  }
}

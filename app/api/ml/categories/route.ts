import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const ML_CATEGORIES_URL = 'https://api.mercadolibre.com/sites/MLB/categories'
const TIMEOUT_MS = 10_000

function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get('authorization')
  const bearer = auth?.replace(/^Bearer\s+/i, '').trim()
  if (bearer) return bearer
  return null
}

export async function GET(req: Request) {
  let token: string | null = getTokenFromRequest(req)
  if (!token) {
    const cookieStore = await cookies()
    token = cookieStore.get('ml_access_token')?.value ?? cookieStore.get('access_token')?.value ?? null
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Token não encontrado. Conecte o Mercado Livre para carregar categorias.' },
      { status: 401 }
    )
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(ML_CATEGORIES_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'PrecificaPRO/1.0',
      },
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const text = await response.text()
      console.error('[ml/categories] ML não-ok:', response.status, text)
      return NextResponse.json(
        { error: 'ML categories error', status: response.status, body: text },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

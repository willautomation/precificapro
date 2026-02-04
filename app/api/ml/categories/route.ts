import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ML_CATEGORIES_URL = 'https://api.mercadolibre.com/sites/MLB/categories'
const TIMEOUT_MS = 10_000

export async function GET() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(ML_CATEGORIES_URL, {
      headers: {
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
    console.error('[ml/categories] Erro:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

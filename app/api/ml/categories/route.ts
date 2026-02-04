import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://api.mercadolibre.com/sites/MLB/categories', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: 'ML categories error', status: response.status, body: text },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token'
const REDIRECT_URI = "https://precificapro-pi.vercel.app/api/ml/callback"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: REDIRECT_URI,
  })

  const res = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number }

  if (!data.access_token) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const response = NextResponse.redirect(new URL('/', req.url))

  response.cookies.set('ml_access_token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: data.expires_in ?? 21600,
  })

  if (data.refresh_token) {
    response.cookies.set('ml_refresh_token', data.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    })
  }

  return response
}

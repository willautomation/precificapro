export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface TokenSuccess {
  access_token: string
  expires_in: number
  refresh_token?: string
}

interface TokenError {
  error: string
  message?: string
}

type TokenResponse = TokenSuccess | TokenError

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, req.url))

  if (error) {
    return redirect(`/?ml_error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return redirect('/?ml_error=no_code')
  }

  const cookieStore = cookies()
  const savedState = cookieStore.get('ml_oauth_state')?.value

  if (!state || !savedState || state !== savedState) {
    return redirect('/?ml_error=invalid_state')
  }

  const clientId = process.env.ML_CLIENT_ID!
  const clientSecret = process.env.ML_CLIENT_SECRET!
  const redirectUri = process.env.ML_REDIRECT_URI!

  try {
    const tokenResponse = await fetch(
      'https://api.mercadolibre.com/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      }
    )

    const tokenData: TokenResponse = await tokenResponse.json()

    if ('error' in tokenData) {
      console.error('[ML CALLBACK] Erro no token:', tokenData)
      return redirect('/?ml_error=token_exchange_failed')
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const res = NextResponse.redirect(
      new URL('/?ml_auth=success', req.url)
    )

    res.cookies.set('ml_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in,
    })

    if (tokenData.refresh_token) {
      res.cookies.set('ml_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 180,
      })
    }

    res.cookies.delete('ml_oauth_state')

    return res
  } catch (err) {
    console.error('[ML CALLBACK] erro geral:', err)
    return redirect('/?ml_error=callback_error')
  }
}

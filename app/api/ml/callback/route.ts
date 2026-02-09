export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const DEFAULT_REDIRECT_URI = 'https://precificapro-pi.vercel.app/api/ml/callback'

interface TokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  user_id?: number
}

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

  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  const redirectUri = process.env.ML_REDIRECT_URI ?? DEFAULT_REDIRECT_URI

  if (!clientId || !clientSecret) {
    console.error('[ML CALLBACK] Faltando ML_CLIENT_ID ou ML_CLIENT_SECRET')
    return redirect('/?ml_error=token_exchange_failed')
  }

  try {
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
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
    })

    const rawBody = await tokenResponse.text()
    let tokenData: TokenResponse & Record<string, unknown> = {}
    try {
      tokenData = JSON.parse(rawBody) as TokenResponse & Record<string, unknown>
    } catch {
      // body não é JSON
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      const logBody = rawBody.length > 500 ? rawBody.slice(0, 500) + '...' : rawBody
      console.error('[ML CALLBACK] token exchange falhou:', {
        httpStatus: tokenResponse.status,
        httpStatusText: tokenResponse.statusText,
        errorBody: logBody,
        redirectUriUsed: redirectUri,
      })
      return redirect('/?ml_error=token_exchange_failed')
    }

    const res = NextResponse.redirect(new URL('/?ml_auth=success', req.url))

    res.cookies.set('ml_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in ?? 21600,
    })

    if (tokenData.refresh_token) {
      res.cookies.set('ml_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 180,
      })
    }

    if (tokenData.user_id != null) {
      res.cookies.set('ml_user_id', String(tokenData.user_id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      })
    }

    res.cookies.delete('ml_oauth_state')

    return res
  } catch (err) {
    console.error('[ML CALLBACK] exception:', { exceptionMessage: String(err) })
    return redirect('/?ml_error=token_exchange_failed')
  }
}

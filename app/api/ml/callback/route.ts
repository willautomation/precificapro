import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
  user_id: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const isProduction = process.env.NODE_ENV === 'production'

  // Verificar se houve erro no OAuth
  if (error) {
    return NextResponse.redirect(`${appUrl}/?ml_error=${encodeURIComponent(error)}`)
  }

  // Validar state (CSRF protection)
  const cookieStore = await cookies()
  const savedState = cookieStore.get('ml_oauth_state')?.value

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/?ml_error=invalid_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?ml_error=no_code`)
  }

  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  const redirectUri = process.env.ML_REDIRECT_URI

  if (!redirectUri) {
    return NextResponse.redirect(`${appUrl}/?ml_error=config_error`)
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/?ml_error=config_error`)
  }

  try {
    // Trocar código por access_token
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Erro ao trocar código por token:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })
      
      return NextResponse.redirect(`${appUrl}/?ml_error=token_exchange_failed`)
    }

    const tokenData: TokenResponse = await tokenResponse.json()

    // Salvar tokens em cookies httpOnly
    const response = NextResponse.redirect(`${appUrl}/?ml_auth=success`)

    // Salvar access_token (maxAge = expires_in)
    response.cookies.set('ml_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in || 21600, // expires_in em segundos
    })

    // Salvar refresh_token (maxAge = 180 dias, se existir)
    if (tokenData.refresh_token) {
      response.cookies.set('ml_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 180, // 180 dias
      })
    }

    // Remover cookie ml_oauth_state
    response.cookies.delete('ml_oauth_state')

    return response
  } catch (error: any) {
    console.error('Erro completo no callback OAuth:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    })

    return NextResponse.redirect(`${appUrl}/?ml_error=callback_error`)
  }
}

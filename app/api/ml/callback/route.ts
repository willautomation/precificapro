import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
  user_id: number
}

function sanitizeTokenBody(raw: string): string {
  if (!raw || raw.length > 500) return raw.slice(0, 500) + (raw.length > 500 ? '...' : '')
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const safe: Record<string, string> = {}
    for (const [k, v] of Object.entries(o)) {
      if (k.toLowerCase().includes('token') || k.toLowerCase().includes('secret')) {
        safe[k] = '[REDACTED]'
      } else {
        safe[k] = String(v)
      }
    }
    return JSON.stringify(safe)
  } catch {
    return raw.replace(/access_token|refresh_token|"[^"]*token[^"]*"/gi, '"***"')
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const isProduction = process.env.NODE_ENV === 'production'

  console.log('[ML callback] recebido:', { hasCode: Boolean(code), hasState: Boolean(state), error: error ?? 'nenhum' })

  if (error) {
    return NextResponse.redirect(`${appUrl}/?ml_error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    console.log('[ML callback] ausência de code — redirecionando com ml_error=no_code')
    return NextResponse.redirect(`${appUrl}/?ml_error=no_code`)
  }

  // Validar state (CSRF protection)
  const cookieStore = await cookies()
  const savedState = cookieStore.get('ml_oauth_state')?.value

  if (!state || !savedState || state !== savedState) {
    console.log('[ML callback] state inválido ou ausente')
    return NextResponse.redirect(`${appUrl}/?ml_error=invalid_state`)
  }

  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  const redirectUri = process.env.ML_REDIRECT_URI
  console.log('[ML callback] redirect_uri usado na troca por token:', redirectUri ?? '(não definido)')

  if (!redirectUri) {
    console.error('[ML callback] ML_REDIRECT_URI não definido')
    return NextResponse.redirect(`${appUrl}/?ml_error=config_error`)
  }

  if (!clientId || !clientSecret) {
    console.error('[ML callback] ML_CLIENT_ID ou ML_CLIENT_SECRET ausente')
    return NextResponse.redirect(`${appUrl}/?ml_error=config_error`)
  }

  try {
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

    const status = tokenResponse.status
    const errorText = await tokenResponse.text()

    if (!tokenResponse.ok) {
      console.error('[ML callback] POST /oauth/token falhou:', {
        status,
        statusText: tokenResponse.statusText,
        bodySanitizado: sanitizeTokenBody(errorText),
      })
      return NextResponse.redirect(`${appUrl}/?ml_error=token_exchange_failed`)
    }

    const tokenData: TokenResponse = await tokenResponse.json()
    console.log('[ML callback] token obtido com sucesso (expires_in:', tokenData.expires_in, 's)')

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

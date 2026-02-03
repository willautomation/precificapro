import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('ml_refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Refresh token não encontrado. Faça login novamente.' },
      { status: 401 }
    )
  }

  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Credenciais OAuth não configuradas' },
      { status: 500 }
    )
  }

  try {
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Erro ao renovar token:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })

      // Se o refresh token expirou, limpar cookies
      const response = NextResponse.json(
        { error: 'Refresh token inválido ou expirado' },
        { status: 401 }
      )
      response.cookies.delete('ml_access_token')
      response.cookies.delete('ml_refresh_token')
      return response
    }

    const tokenData: TokenResponse = await tokenResponse.json()

    // Atualizar tokens
    const response = NextResponse.json({
      success: true,
      expires_in: tokenData.expires_in,
    })

    response.cookies.set('ml_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 21600,
    })

    if (tokenData.refresh_token) {
      response.cookies.set('ml_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 180,
      })
    }

    return response
  } catch (error: any) {
    console.error('Erro ao renovar token:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    })

    return NextResponse.json(
      { error: 'Erro ao renovar token' },
      { status: 500 }
    )
  }
}

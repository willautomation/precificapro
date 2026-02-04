import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const clientId = process.env.ML_CLIENT_ID
  const redirectUri = process.env.ML_REDIRECT_URI

  if (!clientId) {
    return NextResponse.json({ error: 'Faltando ML_CLIENT_ID' }, { status: 500 })
  }

  if (!redirectUri) {
    return NextResponse.json({ error: 'Faltando ML_REDIRECT_URI' }, { status: 500 })
  }

  console.log('[ML login] redirect_uri usado:', redirectUri)

  // Gerar state para segurança (CSRF protection)
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  // Salvar state em cookie para validação no callback (redirect_uri URL-encoded)
  const response = NextResponse.redirect(
    `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  )
  
  // Salvar state em cookie httpOnly por 10 minutos
  response.cookies.set('ml_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })

  return response
}

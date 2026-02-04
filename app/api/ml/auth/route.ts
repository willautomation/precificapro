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

  console.log('[ML auth] redirect_uri usado:', redirectUri)

  // Gerar state para segurança (CSRF protection)
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  // Construir URL de autorização (redirect_uri URL-encoded)
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  
  // Salvar state em cookie para validação no callback
  const response = NextResponse.redirect(authUrl)
  
  // Salvar state em cookie httpOnly
  // Em DEV (NODE_ENV != "production") usar secure=false
  const isProduction = process.env.NODE_ENV === 'production'
  
  response.cookies.set('ml_oauth_state', state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutos
  })

  return response
}

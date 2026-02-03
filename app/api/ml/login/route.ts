import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.ML_CLIENT_ID
  const redirectUri = process.env.ML_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ml/callback`
  
  if (!clientId) {
    return NextResponse.json(
      { error: 'ML_CLIENT_ID não configurado nas variáveis de ambiente' },
      { status: 500 }
    )
  }

  // Gerar state para segurança (CSRF protection)
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  // Salvar state em cookie para validação no callback
  const response = NextResponse.redirect(
    `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  )
  
  // Salvar state em cookie httpOnly por 10 minutos
  response.cookies.set('ml_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutos
  })

  return response
}

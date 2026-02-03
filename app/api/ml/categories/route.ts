import { NextResponse } from 'next/server'

/**
 * Categorias do Mercado Livre: endpoint público.
 * Não exige login/token. Usa a API pública do ML.
 */
export async function GET() {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), 10000) // 10 segundos

  try {
    const response = await fetch('https://api.mercadolibre.com/sites/MLB/categories', {
      signal: abortController.signal,
      next: { revalidate: 7 * 24 * 60 * 60 }, // Cache por 7 dias
      headers: {
        Accept: 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorBody = ''
      try {
        errorBody = await response.text()
      } catch {
        errorBody = 'Não foi possível ler o corpo da resposta'
      }

      const errorDetails = {
        error: 'Falha ao buscar categorias do Mercado Livre',
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: 'https://api.mercadolibre.com/sites/MLB/categories',
      }

      console.error('Erro na resposta da API do Mercado Livre:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      })

      return NextResponse.json(errorDetails, { status: response.status })
    }

    const categories = await response.json()
    return NextResponse.json(categories)
  } catch (error: any) {
    clearTimeout(timeoutId)

    let errorDetails: any = {
      error: 'Erro ao buscar categorias do Mercado Livre',
      message: error?.message || 'Erro desconhecido',
    }

    if (error?.name === 'AbortError' || error?.code === 'ECONNABORTED') {
      errorDetails = {
        ...errorDetails,
        error: 'Timeout ao buscar categorias',
        message: 'A requisição excedeu o tempo limite de 10 segundos',
        hint: 'O servidor do Mercado Livre pode estar lento ou indisponível',
      }
    }

    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      errorDetails = {
        ...errorDetails,
        error: 'Erro de conexão',
        message: error.message,
        hint: 'Não foi possível conectar ao servidor do Mercado Livre',
      }
    }

    if (process.env.NODE_ENV === 'development' && error?.stack) {
      errorDetails.stack = error.stack
    }

    console.error('Erro completo ao buscar categorias:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      cause: error?.cause,
    })

    return NextResponse.json(errorDetails, { status: 500 })
  }
}

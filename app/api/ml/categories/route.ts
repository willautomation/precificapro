import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const ML_BASE = process.env.ML_BASE_URL || 'https://api.mercadolibre.com'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const MAX_ITEMS = 50
const MAX_CATEGORIES = 100

type CacheEntry = { data: { id: string; name: string }[]; expiresAt: number }
const categoriesCache = new Map<string, CacheEntry>()

function getToken(req: Request): string | null {
  const auth = req.headers.get('authorization')
  const bearer = auth?.replace(/^Bearer\s+/i, '').trim()
  if (bearer) return bearer
  return null
}

export async function GET(req: Request) {
  let token = getToken(req)
  if (!token) {
    const cookieStore = await cookies()
    token =
      cookieStore.get('ml_access_token')?.value ??
      cookieStore.get('access_token')?.value ??
      null
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Token não encontrado. Conecte o Mercado Livre para carregar categorias.' },
      { status: 401 }
    )
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': 'PrecificaPRO/1.0',
  }

  try {
    // 1. Obter seller_id via users/me
    const meRes = await fetch(`${ML_BASE}/users/me`, { headers })
    if (!meRes.ok) {
      const text = await meRes.text()
      console.error('[ml/categories] users/me não-ok:', meRes.status, text)
      return NextResponse.json(
        { error: 'Não foi possível obter o usuário.' },
        { status: meRes.status }
      )
    }

    const me = await meRes.json()
    const sellerId = me.id?.toString()
    if (!sellerId) {
      return NextResponse.json(
        { error: 'Seller ID não encontrado.' },
        { status: 500 }
      )
    }

    // 2. Cache (24h por seller)
    const cached = categoriesCache.get(sellerId)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data)
    }

    // 3. Buscar itens do vendedor
    const searchRes = await fetch(
      `${ML_BASE}/users/${sellerId}/items/search?search_type=scan&limit=${MAX_ITEMS}`,
      { headers }
    )

    if (!searchRes.ok) {
      const text = await searchRes.text()
      console.error('[ml/categories] items/search não-ok:', searchRes.status, text)
      return NextResponse.json(
        { error: 'Não foi possível buscar itens do vendedor.' },
        { status: searchRes.status }
      )
    }

    const searchData = (await searchRes.json()) as { results?: string[] }
    const itemIds = searchData.results ?? []
    if (itemIds.length === 0) {
      const empty: { id: string; name: string }[] = []
      categoriesCache.set(sellerId, {
        data: empty,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })
      return NextResponse.json(empty)
    }

    // 4. Buscar detalhes dos itens para extrair category_id (em lotes)
    const categoryIds = new Set<string>()
    const batchSize = 20
    for (let i = 0; i < Math.min(itemIds.length, MAX_ITEMS); i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize)
      const itemPromises = batch.map((itemId) =>
        fetch(`${ML_BASE}/items/${itemId}`, { headers }).then((r) =>
          r.ok ? r.json() : null
        )
      )
      const items = await Promise.all(itemPromises)
      for (const item of items) {
        if (item?.category_id) {
          categoryIds.add(item.category_id)
          if (categoryIds.size >= MAX_CATEGORIES) break
        }
      }
      if (categoryIds.size >= MAX_CATEGORIES) break
    }

    if (categoryIds.size === 0) {
      const empty: { id: string; name: string }[] = []
      categoriesCache.set(sellerId, { data: empty, expiresAt: Date.now() + CACHE_TTL_MS })
      return NextResponse.json(empty)
    }

    // 5. Buscar nomes das categorias
    const categoryPromises = Array.from(categoryIds).map((catId) =>
      fetch(`${ML_BASE}/categories/${catId}`, { headers }).then((r) =>
        r.ok ? r.json() : null
      )
    )
    const categoryData = await Promise.all(categoryPromises)
    const categories = categoryData
      .filter((c): c is { id: string; name: string } => !!c?.id && !!c?.name)
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name))

    categoriesCache.set(sellerId, {
      data: categories,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    return NextResponse.json(categories)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ml/categories] Erro:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

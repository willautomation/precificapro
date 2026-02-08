'use client'

import React, { useState } from 'react'

interface CategoryOption {
  id: string
  name: string
  breadcrumb: string
}

interface CategorySelectorProps {
  onCategoryResolved: (
    categoryId: string | null,
    categoryName: string | null,
    classicoSaleFee: number | null,
    classicoFixedFee: number | null,
    premiumSaleFee: number | null,
    premiumFixedFee: number | null,
    breadcrumb?: string | null
  ) => void
}

const ML_API = 'https://api.mercadolibre.com'

async function fetchBreadcrumb(categoryId: string): Promise<string> {
  const res = await fetch(`${ML_API}/categories/${categoryId}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return categoryId
  const data = await res.json()
  const path = data.path_from_root as { id: string; name: string }[] | undefined
  if (!Array.isArray(path) || path.length === 0) return data.name ?? categoryId
  return path.map((p: { name: string }) => p.name).join(' > ')
}

export function CategorySelector({ onCategoryResolved }: CategorySelectorProps) {
  const [searchText, setSearchText] = useState('')
  const [options, setOptions] = useState<CategoryOption[]>([])
  const [resolvedCategory, setResolvedCategory] = useState<CategoryOption | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doSearch = async () => {
    const q = searchText.trim()
    if (!q) {
      setOptions([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    setOptions([])
    setResolvedCategory(null)
    onCategoryResolved(null, null, null, null, null, null)
    try {
      const res = await fetch(
        `${ML_API}/sites/MLB/domain_discovery/search?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) throw new Error('Falha na busca')
      const data = await res.json()
      const arr = Array.isArray(data) ? data : []
      const byId = new Map<string, { id: string; name: string }>()
      for (const x of arr as { category_id?: string; category_name?: string }[]) {
        if (!x?.category_id) continue
        if (!byId.has(x.category_id)) {
          byId.set(x.category_id, {
            id: x.category_id,
            name: x.category_name ?? x.category_id,
          })
        }
      }
      const unique = Array.from(byId.values())
      const list: CategoryOption[] = await Promise.all(
        unique.map(async (cat) => {
          const breadcrumb = await fetchBreadcrumb(cat.id)
          return { id: cat.id, name: cat.name, breadcrumb }
        })
      )
      setOptions(list)
      if (list.length === 0) setError('Nenhuma categoria encontrada.')
    } catch {
      setError('Não foi possível buscar categorias.')
      setOptions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (cat: CategoryOption) => {
    setResolvedCategory(cat)
    setOptions([])
    setSearchText(cat.breadcrumb)
    setError(null)
    try {
      const feeRes = await fetch(
        `/api/ml/fees?category_id=${encodeURIComponent(cat.id)}`
      )
      if (feeRes.ok) {
        const fees = await feeRes.json()
        if (typeof window !== 'undefined') {
          console.log('ML FEES RESPONSE', fees)
        }
        onCategoryResolved(
          cat.id,
          cat.name,
          fees.classico ?? null,
          fees.classico_fixed ?? null,
          fees.premium ?? null,
          fees.premium_fixed ?? null,
          cat.breadcrumb ?? null
        )
      } else {
        onCategoryResolved(cat.id, cat.name, null, null, null, null, cat.breadcrumb ?? null)
      }
    } catch (e) {
      if (typeof window !== 'undefined') {
        console.log('ML FEES ERROR', e)
      }
      onCategoryResolved(cat.id, cat.name, null, null, null, null, cat.breadcrumb ?? null)
    }
  }

  const handleClear = () => {
    setSearchText('')
    setOptions([])
    setResolvedCategory(null)
    setError(null)
    onCategoryResolved(null, null, null, null, null, null, null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      doSearch()
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Categoria do Produto (Mercado Livre)
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ex: camiseta masculina, tênis, calça jeans"
          className="input-field flex-1"
          disabled={loading}
        />
        <button
          type="button"
          onClick={doSearch}
          disabled={loading}
          className="btn-primary whitespace-nowrap"
        >
          Buscar
        </button>
        {resolvedCategory && (
          <button
            type="button"
            onClick={handleClear}
            className="btn-secondary whitespace-nowrap"
          >
            Limpar
          </button>
        )}
      </div>
      {loading && <p className="text-sm text-gray-500">Buscando categorias...</p>}
      {error && <p className="text-sm text-amber-600">{error}</p>}
      {options.length > 0 && (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
              >
                {opt.breadcrumb}
              </button>
            </li>
          ))}
        </ul>
      )}
      {resolvedCategory && !loading && options.length === 0 && (
        <p className="text-sm text-green-600">
          ✓ {resolvedCategory.breadcrumb}
        </p>
      )}
    </div>
  )
}

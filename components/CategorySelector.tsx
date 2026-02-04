'use client'

import React, { useState, useRef } from 'react'

interface CategorySelectorProps {
  onCategoryResolved: (
    categoryId: string | null,
    categoryName: string | null,
    classicoSaleFee: number | null,
    classicoFixedFee: number | null,
    premiumSaleFee: number | null,
    premiumFixedFee: number | null
  ) => void
}

export function CategorySelector({ onCategoryResolved }: CategorySelectorProps) {
  const [searchText, setSearchText] = useState('')
  const [resolvedCategory, setResolvedCategory] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchByText = async (text: string) => {
    const q = text.trim()
    if (!q) {
      setResolvedCategory(null)
      onCategoryResolved(null, null, null, null, null, null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(q)}`
      )
      if (!res.ok) throw new Error('Falha na busca')
      const data = await res.json()
      const first = Array.isArray(data) ? data[0] : null
      if (!first?.category_id) {
        setResolvedCategory(null)
        onCategoryResolved(null, null, null, null, null, null)
        return
      }
      const cat = { id: first.category_id, name: first.category_name ?? first.category_id }
      setResolvedCategory(cat)
      const feeRes = await fetch(
        `/api/ml/fees?category_id=${encodeURIComponent(cat.id)}`
      )
      if (feeRes.ok) {
        const fees = await feeRes.json()
        onCategoryResolved(
          cat.id,
          cat.name,
          fees.classico ?? null,
          fees.classico_fixed ?? null,
          fees.premium ?? null,
          fees.premium_fixed ?? null
        )
      } else {
        onCategoryResolved(cat.id, cat.name, null, null, null, null)
      }
    } catch {
      setError('Não foi possível identificar a categoria.')
      setResolvedCategory(null)
      onCategoryResolved(null, null, null, null, null, null)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setSearchText(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!v.trim()) {
      setResolvedCategory(null)
      onCategoryResolved(null, null, null, null, null, null)
      return
    }
    debounceRef.current = setTimeout(() => searchByText(v), 400)
  }

  const handleClear = () => {
    setSearchText('')
    setResolvedCategory(null)
    setError(null)
    onCategoryResolved(null, null, null, null, null, null)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Categoria do Produto (Mercado Livre)
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchText}
          onChange={handleChange}
          placeholder="Ex: celular samsung"
          className="input-field"
          disabled={loading}
        />
        {resolvedCategory && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Limpar
          </button>
        )}
      </div>
      {loading && <p className="text-sm text-gray-500">Buscando categoria...</p>}
      {error && <p className="text-sm text-amber-600">{error}</p>}
      {resolvedCategory && !loading && (
        <p className="text-sm text-green-600">
          ✓ {resolvedCategory.name}
        </p>
      )}
    </div>
  )
}

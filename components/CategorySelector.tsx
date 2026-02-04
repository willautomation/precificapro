'use client'

import React, { useState, useEffect, useRef } from 'react'

interface Category {
  id: string
  name: string
}

interface CategorySelectorProps {
  onCategorySelect: (classicoPercent: number | null, premiumPercent: number | null) => void
}

const CACHE_KEY = 'ml_categories_cache'
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 dias

export function CategorySelector({ onCategorySelect }: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFees, setLoadingFees] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [needsConnect, setNeedsConnect] = useState(false)

  // Carregar categorias sempre de /api/ml/categories (autenticado)
  useEffect(() => {
    const loadCategories = async () => {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        try {
          const cache = JSON.parse(cached)
          const now = Date.now()
          if (now - cache.timestamp < CACHE_DURATION && cache.data?.length) {
            setCategories(cache.data)
            setFilteredCategories(cache.data)
            setError(null)
            setNeedsConnect(false)
            return
          }
        } catch {
          // cache inválido
        }
      }

      setLoading(true)
      setError(null)
      setNeedsConnect(false)

      let data: Category[] | null = null
      let status = 0

      try {
        const res = await fetch('/api/ml/categories', { credentials: 'include' })
        status = res.status

        if (res.ok) {
          data = await res.json()
        } else if (res.status === 401) {
          const body = await res.json().catch(() => ({}))
          if (
            body?.error?.includes('Token não encontrado') ||
            body?.error?.includes('Conecte')
          ) {
            setNeedsConnect(true)
          } else {
            setError('Não foi possível carregar as categorias. Usando valores padrão.')
            console.error('Erro ao carregar categorias:', status, body)
          }
        } else {
          setError('Não foi possível carregar as categorias. Usando valores padrão.')
          console.error('Erro ao carregar categorias:', status, await res.text())
        }
      } catch (err) {
        setError('Não foi possível carregar as categorias. Usando valores padrão.')
        console.error('Erro ao carregar categorias:', err)
      }

      if (Array.isArray(data)) {
        setCategories(data)
        setFilteredCategories(data)
        setError(null)
        setNeedsConnect(false)
        if (data.length > 0) {
          const cache = { data, timestamp: Date.now() }
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
        }
      } else if (!needsConnect) {
        setError('Não foi possível carregar as categorias. Usando valores padrão.')
        if (status) console.error('Erro ao carregar categorias:', status)
      }

      setLoading(false)
    }

    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, [])

  // Filtrar categorias conforme pesquisa
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories)
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = categories.filter(cat =>
      cat.name.toLowerCase().includes(term)
    )
    setFilteredCategories(filtered)
  }, [searchTerm, categories])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCategorySelect = async (category: Category) => {
    setSelectedCategory(category)
    setSearchTerm(category.name)
    setShowDropdown(false)
    setLoadingFees(true)
    setError(null)

    try {
      const response = await fetch(`/api/ml/fees?category_id=${category.id}`)
      if (!response.ok) {
        throw new Error('Erro ao buscar taxas')
      }

      const fees = await response.json()
      
      // Atualizar percentuais
      onCategorySelect(fees.classico, fees.premium)
    } catch (err) {
      setError('Não foi possível buscar as taxas desta categoria. Usando valores padrão.')
      console.error('Erro ao buscar taxas:', err)
      // Usar valores padrão (null indica para usar os padrões)
      onCategorySelect(null, null)
    } finally {
      setLoadingFees(false)
    }
  }

  const handleClear = () => {
    setSelectedCategory(null)
    setSearchTerm('')
    setError(null)
    // Voltar aos valores padrão
    onCategorySelect(null, null)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Categoria do Produto (Mercado Livre)
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setShowDropdown(true)
            if (!e.target.value) {
              setSelectedCategory(null)
            }
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Pesquisar categoria..."
          className="input-field"
          disabled={loading}
        />
        
        {selectedCategory && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            Limpar categoria
          </button>
        )}

        {showDropdown && filteredCategories.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredCategories.slice(0, 20).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategorySelect(category)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                {category.name}
              </button>
            ))}
            {filteredCategories.length > 20 && (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">
                Mostrando 20 de {filteredCategories.length} resultados
              </div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Carregando categorias...</p>
      )}

      {loadingFees && selectedCategory && (
        <p className="text-sm text-gray-500">Buscando taxas da categoria...</p>
      )}

      {needsConnect && (
        <div className="space-y-2">
          <p className="text-sm text-amber-600">
            Conecte o Mercado Livre para carregar as categorias.
          </p>
          <a
            href="/api/ml/auth"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            Conectar Mercado Livre
          </a>
        </div>
      )}

      {error && !needsConnect && (
        <p className="text-sm text-amber-600">{error}</p>
      )}

      {selectedCategory && !loadingFees && !error && (
        <p className="text-sm text-green-600">
          ✓ Categoria selecionada: {selectedCategory.name}
        </p>
      )}
    </div>
  )
}

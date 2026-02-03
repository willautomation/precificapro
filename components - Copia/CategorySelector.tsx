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

  // Carregar categorias
  useEffect(() => {
    const loadCategories = async () => {
      // Verificar cache
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const cache = JSON.parse(cached)
        const now = Date.now()
        
        if (now - cache.timestamp < CACHE_DURATION && cache.data) {
          setCategories(cache.data)
          setFilteredCategories(cache.data)
          return
        }
      }

      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/ml/categories')
        if (!response.ok) {
          throw new Error('Erro ao buscar categorias')
        }
        
        const data = await response.json()
        setCategories(data)
        setFilteredCategories(data)
        
        // Salvar no cache
        const cache = {
          data,
          timestamp: Date.now()
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
      } catch (err) {
        setError('Não foi possível carregar as categorias. Usando valores padrão.')
        console.error('Erro ao carregar categorias:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
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

      {error && (
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

'use client'

import React, { useState, useEffect } from 'react'
import { getReputationInfo } from '@/utils/mlReputation'

const STORAGE_KEYS = {
  connected: 'ml_connected',
  sellerId: 'ml_seller_id',
  reputation: 'ml_reputation',
  origin: 'ml_origin',
} as const

interface MLMe {
  seller_id: string | null
  reputation: string | null
  origin: string | null
}

function readFromStorage(): MLMe | null {
  if (typeof window === 'undefined') return null
  const c = localStorage.getItem(STORAGE_KEYS.connected)
  if (c !== 'true') return null
  return {
    seller_id: localStorage.getItem(STORAGE_KEYS.sellerId),
    reputation: localStorage.getItem(STORAGE_KEYS.reputation),
    origin: localStorage.getItem(STORAGE_KEYS.origin),
  }
}

function writeToStorage(data: MLMe) {
  if (typeof window === 'undefined') return
  if (data.seller_id) {
    localStorage.setItem(STORAGE_KEYS.connected, 'true')
    localStorage.setItem(STORAGE_KEYS.sellerId, data.seller_id)
    localStorage.setItem(STORAGE_KEYS.reputation, data.reputation ?? '')
    localStorage.setItem(STORAGE_KEYS.origin, data.origin ?? '')
  } else {
    localStorage.removeItem(STORAGE_KEYS.connected)
    localStorage.removeItem(STORAGE_KEYS.sellerId)
    localStorage.removeItem(STORAGE_KEYS.reputation)
    localStorage.removeItem(STORAGE_KEYS.origin)
  }
}

export function MLConnectBlock() {
  const [me, setMe] = useState<MLMe | null>(() => readFromStorage())
  const [loading, setLoading] = useState(false)

  const fetchMe = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ml/me')
      const data: MLMe = await res.json()
      setMe(data.seller_id ? data : null)
      writeToStorage(data)
    } catch {
      setMe(null)
      writeToStorage({ seller_id: null, reputation: null, origin: null })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    if (params?.get('ml_auth') === 'success') {
      fetchMe()
      // Limpar query para não re-fetch em toda navegação
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    fetchMe()
  }, [])

  // Caminho relativo: sem domínio, sem localhost. Funciona em qualquer origem (local ou Vercel).
  const mlAuthPath = '/api/ml/auth'

  if (loading && !me) {
    return (
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm text-gray-600">Verificando conexão...</p>
      </div>
    )
  }

  if (me?.seller_id) {
    return (
      <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800">
            Conectado ✅
          </span>
        </div>
        <div className="text-sm text-gray-700 space-y-1">
          <p><span className="font-medium">Seller ID:</span> {me.seller_id}</p>
          <p><span className="font-medium">Reputação:</span> {getReputationInfo(me.reputation).labelPt}</p>
          <p><span className="font-medium">Origem:</span> {me.origin || '–'}</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">Detectado da sua conta</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
      <a
        href={mlAuthPath}
        className="btn-primary w-full block text-center"
      >
        Conectar Mercado Livre
      </a>
      <p className="text-xs text-gray-500 mt-2">Conecte para ver reputação e origem da sua conta</p>
    </div>
  )
}

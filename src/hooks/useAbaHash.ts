import { useCallback, useEffect, useState } from 'react'

export type AbaId = 'mapa' | 'treino' | 'queixas' | 'composicao'

export const ABAS: AbaId[] = ['treino', 'composicao', 'mapa', 'queixas']

export const ROTULO_ABA: Record<AbaId, string> = {
  mapa: 'Corpo',
  treino: 'Meu treino',
  queixas: 'Queixas',
  composicao: 'Meu cenário',
}

export const ICONE_ABA: Record<AbaId, string> = {
  mapa: '◍',
  treino: '▤',
  queixas: '⚑',
  composicao: '◒',
}

function abaDoHash(): AbaId {
  const bruto = window.location.hash.replace(/^#\/?/, '')
  if (bruto === 'exercicios' || bruto === 'sessao') return 'treino'
  return (ABAS as string[]).includes(bruto) ? (bruto as AbaId) : 'treino'
}

export function useAbaHash(): [AbaId, (aba: AbaId) => void] {
  const [aba, setAba] = useState<AbaId>(abaDoHash)

  useEffect(() => {
    const aoMudar = () => setAba(abaDoHash())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])

  const navegar = useCallback((proxima: AbaId) => {
    window.location.hash = `/${proxima}`
  }, [])

  return [aba, navegar]
}

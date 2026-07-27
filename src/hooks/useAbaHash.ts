import { useCallback, useEffect, useState } from 'react'

export type AbaId = 'mapa' | 'exercicios' | 'queixas' | 'sessao'

export const ABAS: AbaId[] = ['mapa', 'exercicios', 'queixas', 'sessao']

export const ROTULO_ABA: Record<AbaId, string> = {
  mapa: 'Corpo',
  exercicios: 'Exercícios',
  queixas: 'Queixas',
  sessao: 'Sessão',
}

export const ICONE_ABA: Record<AbaId, string> = {
  mapa: '◍',
  exercicios: '▤',
  queixas: '⚑',
  sessao: '◎',
}

function abaDoHash(): AbaId {
  const bruto = window.location.hash.replace(/^#\/?/, '')
  return (ABAS as string[]).includes(bruto) ? (bruto as AbaId) : 'mapa'
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

import { useCallback, useEffect, useState } from 'react'

/** useState persistido em localStorage. Falha silenciosamente em modo privado
 *  ou com armazenamento cheio: perder a sessao e melhor que a app nao abrir. */
export function useArmazenado<T>(chave: string, inicial: T): [T, (valor: T | ((anterior: T) => T)) => void] {
  const [valor, definir] = useState<T>(() => {
    try {
      const bruto = window.localStorage.getItem(chave)
      return bruto ? (JSON.parse(bruto) as T) : inicial
    } catch {
      return inicial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(chave, JSON.stringify(valor))
    } catch {
      // ignorado de proposito
    }
  }, [chave, valor])

  const atualizar = useCallback((proximo: T | ((anterior: T) => T)) => {
    definir(proximo)
  }, [])

  return [valor, atualizar]
}

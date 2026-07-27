import { useCallback, useState } from 'react'
import { musculoPorId } from '../../data'
import type { MusculoId, PropsCorpo } from '../../types'
import { Corpo } from './index'

/**
 * O corpo com uma linha que diz o nome do musculo sob o cursor.
 *
 * `PropsCorpo.onDestacar` existia no contrato e o CorpoSVG ja o implementava,
 * mas nenhum chamador o passava: identificar um musculo passando o rato
 * dependia do tooltip nativo do <title>, que o sistema so mostra depois de
 * cerca de um segundo parado. Um segundo por musculo torna inutil justamente o
 * gesto de percorrer o corpo a procura do que se quer.
 *
 * A altura da linha e reservada: se ela aparecesse e desaparecesse, o corpo
 * saltaria a cada movimento do rato. Em toque nao existe hover, e ai a linha
 * mostra o musculo selecionado — o toque, que abre a ficha, continua a ser o
 * caminho no telemovel.
 *
 * Envolve `Corpo`, nunca `CorpoSVG`: um renderizador 3D herda isto de graca,
 * porque so precisa de chamar `onDestacar`.
 */
export function CorpoComLeitura({ onDestacar, ...props }: PropsCorpo) {
  const [sobre, setSobre] = useState<MusculoId | null>(null)

  const destacar = useCallback(
    (id: MusculoId | null) => {
      setSobre(id)
      onDestacar?.(id)
    },
    [onDestacar],
  )

  // Hover ganha da selecao: enquanto o rato passeia, a linha segue o rato.
  const foco = sobre ?? props.selecionado
  const musculo = foco ? musculoPorId.get(foco) : undefined
  const estado = foco ? props.realces.get(foco) : undefined

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1">
        <Corpo {...props} onDestacar={destacar} />
      </div>
      <p className="mt-1 h-5 shrink-0 truncate text-center text-xs" aria-live="polite">
        {musculo ? (
          <>
            <span className="font-medium text-ink">{musculo.nomeCurto}</span>
            {estado && <span className="text-muted"> · {estado.rotulo}</span>}
          </>
        ) : (
          <span className="text-muted">Toque ou passe o cursor sobre um músculo</span>
        )}
      </p>
    </div>
  )
}

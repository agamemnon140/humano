import { Fragment, useId } from 'react'
import { geometriaDaVista, musculoPorId, silhuetaDaVista } from '../../data'
import { ALTURA_CORPO, LARGURA_CORPO, type PropsCorpo } from '../../types'

/**
 * Renderizador 2D. Recebe apenas MapaDeRealce — tons semanticos, sem cores.
 * As cores vivem em src/index.css, seletores `.musculo[data-tom=...]`.
 *
 * Espelhamento: cada musculo tem UM <path> em <defs> e DOIS <use>, um deles
 * com translate(480,0) scale(-1,1). O `d` existe uma vez so, a simetria fica
 * garantida, e ambas as instancias sao nos DOM reais e clicaveis.
 *
 * O <path> em <defs> NAO pode ter atributo `fill`, senao a instancia espelhada
 * deixa de herdar a cor do <use>. Isso e estruturalmente impossivel de quebrar
 * aqui porque geometria-*.json so guarda `d`.
 */
export function CorpoSVG({ vista, camada, realces, selecionado, onSelecionar, onDestacar }: PropsCorpo) {
  const prefixo = useId().replace(/:/g, '')
  const geometria = geometriaDaVista(vista)
  const { d: silhuetaD, contornos } = silhuetaDaVista(vista)
  const entradas = Object.entries(geometria)

  const espelho = `translate(${LARGURA_CORPO},0) scale(-1,1)`

  return (
    <svg
      className="corpo"
      viewBox={`0 0 ${LARGURA_CORPO} ${ALTURA_CORPO}`}
      data-camada={camada}
      role="img"
      aria-label={`Mapa muscular, vista de ${vista}`}
      onClick={(e) => {
        // Clique no fundo limpa a selecao.
        if (e.target === e.currentTarget) onSelecionar(null)
      }}
    >
      <defs>
        {entradas.map(([id, forma]) => (
          <path key={id} id={`${prefixo}-${id}`} d={forma.d} />
        ))}
        <path id={`${prefixo}-silhueta`} d={silhuetaD} />
      </defs>

      <g className="silhueta">
        <use href={`#${prefixo}-silhueta`} />
        <use href={`#${prefixo}-silhueta`} transform={espelho} />
      </g>

      {/* Alvos de toque alargados, sob os visiveis: musculos de poucos
          milimetros num telemovel continuam tocaveis. */}
      <g className="alvos">
        {entradas.map(([id]) => {
          const m = musculoPorId.get(id)
          return (
            <Fragment key={id}>
              <use
                className="alvo"
                href={`#${prefixo}-${id}`}
                data-camada-musculo={m?.camada}
                onClick={() => onSelecionar(id)}
              />
              <use
                className="alvo"
                href={`#${prefixo}-${id}`}
                transform={espelho}
                data-camada-musculo={m?.camada}
                onClick={() => onSelecionar(id)}
              />
            </Fragment>
          )
        })}
      </g>

      <g className="musculos">
        {entradas.map(([id]) => {
          const m = musculoPorId.get(id)
          const estado = realces.get(id)
          const tom = id === selecionado ? 'selecionado' : (estado?.tom ?? 'neutro')
          const titulo = m ? `${m.nomeCurto}${estado ? ` · ${estado.rotulo}` : ''}` : id

          const comum = {
            className: 'musculo',
            href: `#${prefixo}-${id}`,
            'data-musculo': id,
            'data-tom': tom,
            'data-camada-musculo': m?.camada,
            'data-selecionado': id === selecionado ? 'true' : undefined,
            onClick: () => onSelecionar(id),
            onMouseEnter: onDestacar ? () => onDestacar(id) : undefined,
            onMouseLeave: onDestacar ? () => onDestacar(null) : undefined,
          }

          return (
            <Fragment key={id}>
              <use {...comum}>
                <title>{titulo}</title>
              </use>
              <use {...comum} transform={espelho}>
                <title>{titulo}</title>
              </use>
            </Fragment>
          )
        })}
      </g>

      <g className="contornos" pointerEvents="none">
        {contornos.map((d) => (
          <Fragment key={d}>
            <path d={d} />
            {/* Contornos na linha media nao se espelham: ficariam duplicados
                exatamente por cima de si proprios. */}
            {!ehLinhaMedia(d) && <path d={d} transform={espelho} />}
          </Fragment>
        ))}
      </g>
    </svg>
  )
}

function ehLinhaMedia(d: string): boolean {
  const xs = d.match(/-?\d+(?:\.\d+)?/g)?.filter((_, i) => i % 2 === 0).map(Number) ?? []
  return xs.every((x) => Math.abs(x - LARGURA_CORPO / 2) < 1)
}

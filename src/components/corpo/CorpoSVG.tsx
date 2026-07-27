import { Fragment, useCallback, useId, useMemo, useRef, useState } from 'react'
import { geometriaDaVista, musculoPorId, silhuetaDaVista } from '../../data'
import { ALTURA_CORPO, LARGURA_CORPO, LINHA_MEDIA, type MusculoId, type PropsCorpo } from '../../types'

/**
 * Renderizador 2D. Recebe apenas MapaDeRealce — tons semanticos, sem cores.
 * As cores vivem em src/index.css, seletores `.musculo[data-tom=...]`.
 *
 * Espelhamento: cada musculo tem UM <path> em <defs> e DOIS <use>, um deles
 * com translate(480,0) scale(-1,1). O `d` existe uma vez so, a simetria fica
 * garantida, e ambas as instancias sao nos DOM reais.
 *
 * O <path> em <defs> NAO pode ter atributo `fill`, senao a instancia espelhada
 * deixa de herdar a cor do <use>. Isso e estruturalmente impossivel de quebrar
 * aqui porque geometria-*.json so guarda `d`.
 *
 * O TOQUE nao e resolvido pelas formas visiveis, e sim por `resolver` — ver o
 * comentario dessa funcao. As formas sao inertes (`pointer-events: none`) e ha
 * um retangulo de captura por cima de tudo.
 */
export function CorpoSVG({ vista, camada, realces, selecionado, onSelecionar, onDestacar }: PropsCorpo) {
  const prefixo = useId().replace(/:/g, '')
  const geometria = geometriaDaVista(vista)
  const { d: silhuetaD, contornos } = silhuetaDaVista(vista)
  const entradas = Object.entries(geometria)

  const espelho = `translate(${LARGURA_CORPO},0) scale(-1,1)`

  const svgRef = useRef<SVGSVGElement>(null)
  // Hover vive aqui porque `:hover` do CSS deixou de servir: o rato esta sempre
  // sobre o retangulo de captura, nunca sobre a forma.
  const [sobre, setSobre] = useState<MusculoId | null>(null)

  // So os musculos da camada visivel entram no hit-test. Em vista profunda os
  // superficiais ficam esbatidos e inertes; em superficial os profundos nem
  // sao desenhados. Ver as regras de camada em index.css.
  // A ordem e a mesma em que as formas sao desenhadas, e e ela que decide os
  // empates: quem esta por cima ganha, porque e o que se ve.
  const candidatas = useMemo(
    () =>
      Object.entries(geometria)
        .filter(([id]) => musculoPorId.get(id)?.camada === camada)
        .map(([id, forma]) => ({ id, caminho: new Path2D(forma.d) })),
    [geometria, camada],
  )

  const pincel = useMemo(() => document.createElement('canvas').getContext('2d'), [])

  /**
   * Que musculo esta sob este ponto da tela.
   *
   * Duas passagens, e a ordem entre elas e a coisa toda: CONTER ganha de ESTAR
   * PERTO. Antes disto o alvo de toque era um traco largo e invisivel por cima
   * de cada forma, e media-se em Chrome que um toque no meio do reto femoral
   * respondia "sartorio" — a tira fina e diagonal do sartorio cruza a coxa, e a
   * sua banda cobria o interior do vizinho. Nao ha largura de banda que resolva
   * isso, porque o problema nao e de tamanho e sim de precedencia.
   *
   * 1. Contem o ponto? Entre varios, ganha o ultimo desenhado — o que esta por
   *    cima e portanto o que se ve. Um desempate por espessura foi tentado e
   *    media mal: o sartorio e uma tira diagonal de caixa larga, era julgado
   *    gordo, e tocar no sartorio respondia "reto femoral".
   * 2. Nenhum contem? O mais proximo, em aneis crescentes — folga para os
   *    musculos finos onde ha espaco livre em volta deles.
   *
   * Trabalha em unidades do viewBox: `getScreenCTM` cuida da escala, e a metade
   * esquerda e refletida de volta para a direita, que e a unica desenhada.
   */
  const resolver = useCallback(
    (clienteX: number, clienteY: number): MusculoId | null => {
      const svg = svgRef.current
      const ctm = svg?.getScreenCTM()
      if (!svg || !ctm || !pincel) return null

      const ponto = new DOMPoint(clienteX, clienteY).matrixTransform(ctm.inverse())
      const x = ponto.x < LINHA_MEDIA ? LARGURA_CORPO - ponto.x : ponto.x
      const y = ponto.y

      const dentro = candidatas.filter((c) => pincel.isPointInPath(c.caminho, x, y))
      if (dentro.length > 0) return dentro[dentro.length - 1].id

      // Aneis em unidades do viewBox. Generosos porque nao custam nada a
      // ninguem: conter ja ganhou antes de chegar aqui, entao isto so alcanca
      // espaco vazio — a borda do corpo, o vao entre as pernas, o pescoco.
      for (const tolerancia of [12, 24, 36]) {
        pincel.lineWidth = tolerancia * 2
        const perto = candidatas.filter((c) => pincel.isPointInStroke(c.caminho, x, y))
        if (perto.length > 0) return perto[perto.length - 1].id
      }

      return null
    },
    [candidatas, pincel],
  )

  const destacar = useCallback(
    (id: MusculoId | null) => {
      setSobre((anterior) => {
        if (anterior !== id) onDestacar?.(id)
        return id
      })
    },
    [onDestacar],
  )

  return (
    <svg
      ref={svgRef}
      className="corpo"
      viewBox={`0 0 ${LARGURA_CORPO} ${ALTURA_CORPO}`}
      data-camada={camada}
      role="img"
      aria-label={`Mapa muscular, vista de ${vista}`}
      onClick={(e) => {
        // A moldura em volta do desenho — o retangulo de captura cobre o
        // viewBox, nao a caixa do elemento. Clicar ali limpa a selecao.
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
            'data-sobre': id === sobre ? 'true' : undefined,
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

      <g className="contornos">
        {contornos.map((d) => (
          <Fragment key={d}>
            <path d={d} />
            {/* Contornos na linha media nao se espelham: ficariam duplicados
                exatamente por cima de si proprios. */}
            {!ehLinhaMedia(d) && <path d={d} transform={espelho} />}
          </Fragment>
        ))}
      </g>

      {/* Captura tudo, por cima de tudo. Um clique que nao resolve em musculo
          limpa a selecao — era o que o clique no fundo fazia. */}
      <rect
        className="captura"
        width={LARGURA_CORPO}
        height={ALTURA_CORPO}
        style={{ cursor: sobre ? 'pointer' : 'default' }}
        onClick={(e) => onSelecionar(resolver(e.clientX, e.clientY))}
        onPointerMove={(e) => {
          // Em toque nao existe hover: o pointermove que precede o toque
          // acenderia um musculo que o dedo esta a tapar.
          if (e.pointerType === 'mouse') destacar(resolver(e.clientX, e.clientY))
        }}
        onPointerLeave={() => destacar(null)}
      />
    </svg>
  )
}

function ehLinhaMedia(d: string): boolean {
  const xs = d.match(/-?\d+(?:\.\d+)?/g)?.filter((_, i) => i % 2 === 0).map(Number) ?? []
  return xs.every((x) => Math.abs(x - LARGURA_CORPO / 2) < 1)
}

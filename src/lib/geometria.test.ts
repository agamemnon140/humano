import { describe, expect, it } from 'vitest'
import { geometriaFrente, geometriaCostas, musculos, silhueta } from '../data'
import { ALTURA_CORPO, LARGURA_CORPO, LINHA_MEDIA, type MapaGeometria, type MusculoId, type RegiaoCorporal, type Vista } from '../types'

/**
 * Portao de sequenciamento. Um musculo sem geometria so e tolerado se estiver
 * aqui. O teste tambem falha se a lista contiver um id que JA tem geometria,
 * portanto ela nao apodrece. Tem de chegar a [] e ficar assim.
 */
const POR_DESENHAR: MusculoId[] = []

/** Tolerancia para formas que abracam a linha media (reto abdominal). */
const TOLERANCIA_LINHA_MEDIA = 8

const VISTAS: [Vista, MapaGeometria][] = [
  ['frente', geometriaFrente],
  ['costas', geometriaCostas],
]

/** Formas que atravessam deliberadamente a linha media. */
const CRUZAM_LINHA_MEDIA: MusculoId[] = []

/** Faixa de y plausivel por regiao, no espaco 0..1000. Apanha um `d` colado
 *  no slot do musculo errado — o erro que passa despercebido no ecra. */
const FAIXA_Y: Record<RegiaoCorporal, [number, number]> = {
  pescoco: [140, 260],
  peito: [230, 380],
  costas: [190, 510],
  ombros: [215, 330],
  bracos: [230, 480],
  antebracos: [450, 620],
  core: [290, 540],
  gluteos: [450, 590],
  coxas: [510, 735],
  pernas: [730, 960],
}

const idsConhecidos = new Set(musculos.map((m) => m.id))
const porId = new Map(musculos.map((m) => [m.id, m]))

/** Todos os comandos usados (M, L, C) recebem pares x,y, entao emparelhar os
 *  numeros na ordem em que aparecem e correcto para esta gramatica restrita. */
function coordenadas(d: string): [number, number][] {
  const numeros = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
  const pares: [number, number][] = []
  for (let i = 0; i + 1 < numeros.length; i += 2) pares.push([numeros[i], numeros[i + 1]])
  return pares
}

function caixa(d: string) {
  const pares = coordenadas(d)
  const xs = pares.map((p) => p[0])
  const ys = pares.map((p) => p[1])
  return {
    xMin: Math.min(...xs),
    xMax: Math.max(...xs),
    yMin: Math.min(...ys),
    yMax: Math.max(...ys),
    cy: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

describe('geometria: cobertura desenho <-> dados', () => {
  it('todo musculo declarado numa vista tem forma nessa vista', () => {
    const emFalta: string[] = []
    for (const [vista, geometria] of VISTAS) {
      for (const m of musculos) {
        if (!m.vistas.includes(vista)) continue
        if (geometria[m.id]) continue
        if (POR_DESENHAR.includes(m.id)) continue
        emFalta.push(`${m.id} (${vista})`)
      }
    }
    expect(emFalta).toEqual([])
  })

  it('POR_DESENHAR nao contem ids que ja foram desenhados', () => {
    const obsoletos = POR_DESENHAR.filter((id) => geometriaFrente[id] || geometriaCostas[id])
    expect(obsoletos).toEqual([])
  })

  it('nenhuma forma orfa: toda chave de geometria e um musculo conhecido', () => {
    for (const [vista, geometria] of VISTAS) {
      const orfaos = Object.keys(geometria).filter((id) => !idsConhecidos.has(id))
      expect(orfaos, `orfaos em ${vista}`).toEqual([])
    }
  })

  it('toda forma pertence a uma vista que o musculo declara', () => {
    for (const [vista, geometria] of VISTAS) {
      const foraDeVista = Object.keys(geometria).filter((id) => !porId.get(id)?.vistas.includes(vista))
      expect(foraDeVista, `desenhados em ${vista} sem declarar essa vista`).toEqual([])
    }
  })

  it('todo musculo aparece em pelo menos uma vista', () => {
    const invisiveis = musculos.filter((m) => m.vistas.length === 0).map((m) => m.id)
    expect(invisiveis).toEqual([])
  })
})

describe('geometria: forma dos paths', () => {
  const todas = VISTAS.flatMap(([vista, g]) =>
    Object.entries(g).map(([id, forma]) => ({ vista, id, d: forma.d })),
  )

  it('todo `d` e bem formado', () => {
    for (const { vista, id, d } of todas) {
      expect(d, `${id}/${vista} deve comecar em M absoluto`).toMatch(/^M\s/)
      expect(d.trimEnd(), `${id}/${vista} deve fechar com Z`).toMatch(/Z$/)
      expect(d, `${id}/${vista} so admite M, L, C, Z absolutos`).toMatch(/^[MLCZ0-9\s.,-]+$/)
      expect(coordenadas(d).length, `${id}/${vista} precisa de >= 4 pontos`).toBeGreaterThanOrEqual(4)
    }
  })

  it('toda coordenada cai dentro do viewBox', () => {
    // Apanha um ponto decimal perdido (2400 em vez de 240.0), que rebentaria
    // a bounding box e apagaria a figura inteira do ecra.
    for (const { vista, id, d } of todas) {
      const c = caixa(d)
      expect(c.xMin, `${id}/${vista} x minimo`).toBeGreaterThanOrEqual(0)
      expect(c.xMax, `${id}/${vista} x maximo`).toBeLessThanOrEqual(LARGURA_CORPO)
      expect(c.yMin, `${id}/${vista} y minimo`).toBeGreaterThanOrEqual(0)
      expect(c.yMax, `${id}/${vista} y maximo`).toBeLessThanOrEqual(ALTURA_CORPO)
    }
  })

  it('respeita a convencao do espelho: so se desenha a metade x >= 240', () => {
    for (const { vista, id, d } of todas) {
      if (CRUZAM_LINHA_MEDIA.includes(id)) continue
      const { xMin } = caixa(d)
      expect(xMin, `${id}/${vista} atravessa a linha media`).toBeGreaterThanOrEqual(
        LINHA_MEDIA - TOLERANCIA_LINHA_MEDIA,
      )
    }
  })

  it('nao ha `d` duplicado dentro da mesma vista', () => {
    // A asserção de maior valor deste ficheiro: copiar-colar-e-esquecer-de-editar
    // e o erro mais provavel num trabalho de dezenas de paths, e e invisivel no
    // ecra porque o duplicado assenta exatamente por baixo do original.
    for (const [vista, geometria] of VISTAS) {
      const vistos = new Map<string, string>()
      for (const [id, forma] of Object.entries(geometria)) {
        const anterior = vistos.get(forma.d)
        expect(anterior, `${id} e ${anterior} partilham o mesmo \`d\` em ${vista}`).toBeUndefined()
        vistos.set(forma.d, id)
      }
    }
  })

  it('o centroide cai na faixa vertical plausivel da regiao do musculo', () => {
    for (const { vista, id, d } of todas) {
      const m = porId.get(id)
      if (!m) continue
      const [yMin, yMax] = FAIXA_Y[m.regiao]
      const { cy } = caixa(d)
      expect(cy, `${id}/${vista} (regiao ${m.regiao})`).toBeGreaterThanOrEqual(yMin)
      expect(cy, `${id}/${vista} (regiao ${m.regiao})`).toBeLessThanOrEqual(yMax)
    }
  })
})

describe('geometria: silhueta', () => {
  it('as duas silhuetas sao bem formadas e distintas', () => {
    expect(silhueta.frente.d).toMatch(/^M\s/)
    expect(silhueta.costas.d).toMatch(/^M\s/)
    expect(silhueta.frente.d).not.toBe(silhueta.costas.d)
    for (const d of [silhueta.frente.d, silhueta.costas.d]) {
      const c = caixa(d)
      expect(c.xMin).toBeGreaterThanOrEqual(LINHA_MEDIA - TOLERANCIA_LINHA_MEDIA)
      expect(c.xMax).toBeLessThanOrEqual(LARGURA_CORPO)
      expect(c.yMax).toBeLessThanOrEqual(ALTURA_CORPO)
    }
  })
})

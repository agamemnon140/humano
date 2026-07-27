import type {
  Atividade,
  AtividadeId,
  Lesao,
  LesaoId,
  MapaGeometria,
  MarcoAnatomico,
  Musculo,
  MusculoId,
  Vista,
} from '../types'
import { construirIndicePostural, construirIndiceReverso } from '../lib/indice'
import musculosJson from './musculos.json'
import atividadesJson from './atividades.json'
import lesoesJson from './lesoes.json'
import geometriaFrenteJson from './geometria-frente.json'
import geometriaCostasJson from './geometria-costas.json'
import geometriaMarcosJson from './geometria-marcos.json'
import silhuetaJson from './geometria-silhueta.json'

export const musculos = musculosJson as Musculo[]
export const atividades = atividadesJson as Atividade[]
export const lesoes = lesoesJson as Lesao[]

export const geometriaFrente = geometriaFrenteJson as MapaGeometria
export const geometriaCostas = geometriaCostasJson as MapaGeometria
export const marcos = geometriaMarcosJson as MarcoAnatomico[]
export const silhueta = silhuetaJson

export const musculoPorId = new Map<MusculoId, Musculo>(musculos.map((m) => [m.id, m]))
export const atividadePorId = new Map<AtividadeId, Atividade>(atividades.map((a) => [a.id, a]))
export const lesaoPorId = new Map<LesaoId, Lesao>(lesoes.map((l) => [l.id, l]))

export function geometriaDaVista(vista: Vista): MapaGeometria {
  return vista === 'frente' ? geometriaFrente : geometriaCostas
}

export function silhuetaDaVista(vista: Vista): { d: string; contornos: string[] } {
  return vista === 'frente'
    ? { d: silhueta.frente.d, contornos: silhueta.contornosFrente }
    : { d: silhueta.costas.d, contornos: silhueta.contornosCostas }
}

/** ~650 arestas invertem-se em sub-milissegundo, entao isto corre uma vez no
 *  carregamento do modulo. Um artefacto gerado em build so criaria deriva
 *  silenciosa, e useMemo esconderia o indice das funcoes puras e do Vitest. */
export const indiceReverso = construirIndiceReverso(atividades)
export const indicePostural = construirIndicePostural(atividades)

export const catalogo = { atividades, musculos, lesoes }

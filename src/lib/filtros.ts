import type {
  Atividade,
  Equipamento,
  Musculo,
  MusculoId,
  PadraoMovimento,
  RegiaoCorporal,
  TipoAtividade,
} from '../types'
import { contemTodosTermos } from './texto'

export interface FiltroAtividades {
  busca: string
  tipos: TipoAtividade[]
  padroes: PadraoMovimento[]
  equipamentos: Equipamento[]
  regioes: RegiaoCorporal[]
  dificuldades: number[]
  /** Quando presente, so atividades que tocam este musculo em qualquer nivel. */
  musculoId?: MusculoId
}

export const FILTRO_VAZIO: FiltroAtividades = {
  busca: '',
  tipos: [],
  padroes: [],
  equipamentos: [],
  regioes: [],
  dificuldades: [],
}

export function musculosDaAtividade(a: Atividade): MusculoId[] {
  return [...a.primarios, ...a.secundarios, ...a.estabilizadores]
}

/** Busca sobre nome pt-BR, nome ingles, sinonimos e nomes dos musculos
 *  trabalhados — para "chest" e "peitoral" encontrarem o supino. */
function textoBuscavel(a: Atividade, musculosPorId: Map<MusculoId, Musculo>): string {
  const nomesMusculos = musculosDaAtividade(a).flatMap((id) => {
    const m = musculosPorId.get(id)
    return m ? [m.nome, m.nomeCurto, m.nomeEn, ...m.alcunhas] : []
  })
  return [a.nome, a.nomeEn, ...a.outrosNomes, ...nomesMusculos].join(' ')
}

export function filtrarAtividades(
  atividades: Atividade[],
  filtro: FiltroAtividades,
  musculosPorId: Map<MusculoId, Musculo>,
): Atividade[] {
  return atividades.filter((a) => {
    if (filtro.tipos.length > 0 && !filtro.tipos.includes(a.tipo)) return false
    if (filtro.padroes.length > 0 && !filtro.padroes.includes(a.padrao)) return false
    if (filtro.dificuldades.length > 0 && !filtro.dificuldades.includes(a.dificuldade)) return false
    if (filtro.equipamentos.length > 0 && !a.equipamento.some((e) => filtro.equipamentos.includes(e))) {
      return false
    }
    if (filtro.musculoId && !musculosDaAtividade(a).includes(filtro.musculoId)) return false

    if (filtro.regioes.length > 0) {
      const regioes = new Set(
        musculosDaAtividade(a)
          .map((id) => musculosPorId.get(id)?.regiao)
          .filter((r): r is RegiaoCorporal => Boolean(r)),
      )
      if (!filtro.regioes.some((r) => regioes.has(r))) return false
    }

    if (filtro.busca.trim() && !contemTodosTermos(textoBuscavel(a, musculosPorId), filtro.busca)) {
      return false
    }

    return true
  })
}

export function filtrarMusculos(musculos: Musculo[], busca: string): Musculo[] {
  if (!busca.trim()) return musculos
  return musculos.filter((m) =>
    contemTodosTermos([m.nome, m.nomeCurto, m.nomeEn, m.nomeLatim, ...m.alcunhas].join(' '), busca),
  )
}

export function filtroAtivo(filtro: FiltroAtividades): boolean {
  return (
    filtro.busca.trim().length > 0 ||
    filtro.tipos.length > 0 ||
    filtro.padroes.length > 0 ||
    filtro.equipamentos.length > 0 ||
    filtro.regioes.length > 0 ||
    filtro.dificuldades.length > 0 ||
    Boolean(filtro.musculoId)
  )
}

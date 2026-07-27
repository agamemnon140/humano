import type {
  Atividade,
  AtividadeId,
  Equipamento,
  MusculoId,
  NivelAtivacao,
  TipoAtividade,
} from '../types'

export interface EntradaIndice {
  atividadeId: AtividadeId
  nivel: NivelAtivacao
  /** 1 / primarios.length quando o nivel e primario, senao 0.
   *  Deriva da curadoria que ja existe, entao nao apodrece. */
  especificidade: number
}

export type IndiceReverso = Map<MusculoId, EntradaIndice[]>

export interface IndicePostural {
  encurtam: Map<MusculoId, AtividadeId[]>
  inibem: Map<MusculoId, AtividadeId[]>
}

const ORDEM_NIVEL: Record<NivelAtivacao, number> = {
  primario: 0,
  secundario: 1,
  estabilizador: 2,
}

const ORDEM_TIPO: Record<TipoAtividade, number> = {
  forca: 0,
  desporto: 1,
  cardio: 2,
  mobilidade: 3,
  quotidiano: 4,
}

/** Menor barreira de entrada primeiro: e o default certo para um telemovel
 *  aberto na sala ou numa academia sem maquina livre. */
const ORDEM_EQUIPAMENTO: Equipamento[] = [
  'nenhum',
  'peso-corporal',
  'tapete',
  'elastico',
  'halteres',
  'kettlebell',
  'banco',
  'barra',
  'barra-fixa',
  'bola',
  'cabos',
  'maquina',
  'bicicleta',
  'esteira',
  'agua',
  'reformer',
]

function custoEquipamento(equipamento: Equipamento[]): number {
  if (equipamento.length === 0) return ORDEM_EQUIPAMENTO.length
  return Math.min(
    ...equipamento.map((e) => {
      const i = ORDEM_EQUIPAMENTO.indexOf(e)
      return i === -1 ? ORDEM_EQUIPAMENTO.length : i
    }),
  )
}

export function construirIndiceReverso(atividades: Atividade[]): IndiceReverso {
  const indice: IndiceReverso = new Map()

  const registar = (musculoId: MusculoId, entrada: EntradaIndice) => {
    const atual = indice.get(musculoId)
    if (atual) atual.push(entrada)
    else indice.set(musculoId, [entrada])
  }

  for (const a of atividades) {
    const especificidade = a.primarios.length > 0 ? 1 / a.primarios.length : 0
    for (const m of a.primarios) registar(m, { atividadeId: a.id, nivel: 'primario', especificidade })
    for (const m of a.secundarios) registar(m, { atividadeId: a.id, nivel: 'secundario', especificidade: 0 })
    for (const m of a.estabilizadores) registar(m, { atividadeId: a.id, nivel: 'estabilizador', especificidade: 0 })
  }

  return indice
}

export function construirIndicePostural(atividades: Atividade[]): IndicePostural {
  const encurtam = new Map<MusculoId, AtividadeId[]>()
  const inibem = new Map<MusculoId, AtividadeId[]>()

  const acrescentar = (mapa: Map<MusculoId, AtividadeId[]>, m: MusculoId, id: AtividadeId) => {
    const atual = mapa.get(m)
    if (atual) atual.push(id)
    else mapa.set(m, [id])
  }

  for (const a of atividades) {
    for (const m of a.encurta) acrescentar(encurtam, m, a.id)
    for (const m of a.inibe) acrescentar(inibem, m, a.id)
  }

  return { encurtam, inibem }
}

/**
 * Escada de desempate, aplicada por ordem estrita:
 *   1. nivel            primario > secundario > estabilizador
 *   2. especificidade   crucifixo (1 primario) ganha ao supino (2)
 *   3. tipo             forca antes de cardio ou quotidiano
 *   4. equipamento      menor barreira de entrada primeiro
 *   5. dificuldade      crescente
 *   6. nome             determinismo total, para os testes serem estaveis
 *
 * Nao existe score numerico escondido: isso seria a escala 0-100 pela porta
 * das traseiras, e a escala e deliberadamente ordinal.
 */
export function ordenarEntradas(
  entradas: EntradaIndice[],
  porId: Map<AtividadeId, Atividade>,
): EntradaIndice[] {
  return [...entradas].sort((x, y) => {
    const ax = porId.get(x.atividadeId)
    const ay = porId.get(y.atividadeId)
    if (!ax || !ay) return 0

    const porNivel = ORDEM_NIVEL[x.nivel] - ORDEM_NIVEL[y.nivel]
    if (porNivel !== 0) return porNivel

    const porEspecificidade = y.especificidade - x.especificidade
    if (porEspecificidade !== 0) return porEspecificidade

    const porTipo = ORDEM_TIPO[ax.tipo] - ORDEM_TIPO[ay.tipo]
    if (porTipo !== 0) return porTipo

    const porEquipamento = custoEquipamento(ax.equipamento) - custoEquipamento(ay.equipamento)
    if (porEquipamento !== 0) return porEquipamento

    const porDificuldade = ax.dificuldade - ay.dificuldade
    if (porDificuldade !== 0) return porDificuldade

    return ax.nome.localeCompare(ay.nome, 'pt')
  })
}

/** Tres seccoes separadas, nunca uma lista misturada: com escala ordinal,
 *  misturar destroi a unica informacao que existe. */
export function agruparPorNivel(
  entradas: EntradaIndice[],
  porId: Map<AtividadeId, Atividade>,
): Record<NivelAtivacao, EntradaIndice[]> {
  const ordenadas = ordenarEntradas(entradas, porId)
  return {
    primario: ordenadas.filter((e) => e.nivel === 'primario'),
    secundario: ordenadas.filter((e) => e.nivel === 'secundario'),
    estabilizador: ordenadas.filter((e) => e.nivel === 'estabilizador'),
  }
}

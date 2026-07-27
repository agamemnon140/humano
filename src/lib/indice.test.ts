import { describe, expect, it } from 'vitest'
import type { Atividade } from '../types'
import { agruparPorNivel, construirIndicePostural, construirIndiceReverso, ordenarEntradas } from './indice'

function atividade(id: string, extra: Partial<Atividade> = {}): Atividade {
  return {
    id,
    nome: id,
    nomeEn: id,
    outrosNomes: [],
    tipo: 'forca',
    padrao: 'isolamento',
    plano: 'sagital',
    equipamento: ['barra'],
    cadeia: 'aberta',
    dificuldade: 1,
    unilateral: false,
    primarios: [],
    secundarios: [],
    estabilizadores: [],
    encurta: [],
    inibe: [],
    descricao: '',
    dicas: [],
    erros: [],
    cuidados: [],
    substituicoes: [],
    ...extra,
  }
}

describe('indice reverso', () => {
  it('inverte todas as arestas sem perder nenhuma', () => {
    const as = [
      atividade('supino', { primarios: ['peito'], secundarios: ['triceps'], estabilizadores: ['core'] }),
      atividade('flexao', { primarios: ['peito'] }),
    ]
    const indice = construirIndiceReverso(as)
    expect(indice.get('peito')?.map((e) => e.atividadeId)).toEqual(['supino', 'flexao'])
    expect(indice.get('triceps')?.[0].nivel).toBe('secundario')
    expect(indice.get('core')?.[0].nivel).toBe('estabilizador')
    expect(indice.get('inexistente')).toBeUndefined()
  })

  it('especificidade e 1/n para primarios e zero nos outros niveis', () => {
    const as = [atividade('supino', { primarios: ['peito', 'ombro'], secundarios: ['triceps'] })]
    const indice = construirIndiceReverso(as)
    expect(indice.get('peito')?.[0].especificidade).toBeCloseTo(0.5, 12)
    expect(indice.get('triceps')?.[0].especificidade).toBe(0)
  })

  it('atividade sem primarios nunca aparece numa lista de primarios', () => {
    const as = [atividade('sentar', { tipo: 'quotidiano', estabilizadores: ['lombar'] })]
    const indice = construirIndiceReverso(as)
    expect(indice.get('lombar')?.every((e) => e.nivel !== 'primario')).toBe(true)
  })
})

describe('escada de desempate', () => {
  it('1. nivel vence tudo', () => {
    const as = [
      atividade('isolador', { primarios: ['alvo'], equipamento: ['maquina'], dificuldade: 3 }),
      atividade('acessorio', { secundarios: ['alvo'], equipamento: ['nenhum'], dificuldade: 1 }),
    ]
    const porId = new Map(as.map((a) => [a.id, a]))
    const ordem = ordenarEntradas(construirIndiceReverso(as).get('alvo') ?? [], porId)
    expect(ordem.map((e) => e.atividadeId)).toEqual(['isolador', 'acessorio'])
  })

  it('2. especificidade: crucifixo com 1 primario ganha ao supino com 2', () => {
    const as = [
      atividade('supino', { primarios: ['peito', 'ombro'] }),
      atividade('crucifixo', { primarios: ['peito'] }),
    ]
    const porId = new Map(as.map((a) => [a.id, a]))
    const ordem = ordenarEntradas(construirIndiceReverso(as).get('peito') ?? [], porId)
    expect(ordem.map((e) => e.atividadeId)).toEqual(['crucifixo', 'supino'])
  })

  it('3. tipo: forca vem antes de cotidiano com mesma especificidade', () => {
    const as = [
      atividade('sentar', { tipo: 'quotidiano', primarios: ['alvo'] }),
      atividade('agachar', { tipo: 'forca', primarios: ['alvo'] }),
    ]
    const porId = new Map(as.map((a) => [a.id, a]))
    const ordem = ordenarEntradas(construirIndiceReverso(as).get('alvo') ?? [], porId)
    expect(ordem.map((e) => e.atividadeId)).toEqual(['agachar', 'sentar'])
  })

  it('4. equipamento: menor barreira de entrada primeiro', () => {
    const as = [
      atividade('na-maquina', { primarios: ['alvo'], equipamento: ['maquina'] }),
      atividade('em-casa', { primarios: ['alvo'], equipamento: ['peso-corporal'] }),
    ]
    const porId = new Map(as.map((a) => [a.id, a]))
    const ordem = ordenarEntradas(construirIndiceReverso(as).get('alvo') ?? [], porId)
    expect(ordem.map((e) => e.atividadeId)).toEqual(['em-casa', 'na-maquina'])
  })

  it('5. dificuldade crescente', () => {
    const as = [
      atividade('dificil', { primarios: ['alvo'], dificuldade: 3 }),
      atividade('facil', { primarios: ['alvo'], dificuldade: 1 }),
    ]
    const porId = new Map(as.map((a) => [a.id, a]))
    const ordem = ordenarEntradas(construirIndiceReverso(as).get('alvo') ?? [], porId)
    expect(ordem.map((e) => e.atividadeId)).toEqual(['facil', 'dificil'])
  })

  it('6. empate total resolve por nome, de forma deterministica', () => {
    const as = [
      atividade('zebra', { nome: 'Zebra', primarios: ['alvo'] }),
      atividade('abelha', { nome: 'Abelha', primarios: ['alvo'] }),
    ]
    const porId = new Map(as.map((a) => [a.id, a]))
    const entradas = construirIndiceReverso(as).get('alvo') ?? []
    const primeira = ordenarEntradas(entradas, porId).map((e) => e.atividadeId)
    const segunda = ordenarEntradas([...entradas].reverse(), porId).map((e) => e.atividadeId)
    expect(primeira).toEqual(['abelha', 'zebra'])
    expect(segunda).toEqual(primeira)
  })

  it('ordenar nao muta o array recebido', () => {
    const as = [atividade('b', { primarios: ['alvo'] }), atividade('a', { primarios: ['alvo'] })]
    const porId = new Map(as.map((x) => [x.id, x]))
    const entradas = construirIndiceReverso(as).get('alvo') ?? []
    const antes = entradas.map((e) => e.atividadeId)
    ordenarEntradas(entradas, porId)
    expect(entradas.map((e) => e.atividadeId)).toEqual(antes)
  })
})

describe('agrupamento por nivel', () => {
  it('separa em tres seccoes em vez de misturar a escala ordinal', () => {
    const as = [
      atividade('a', { primarios: ['alvo'] }),
      atividade('b', { secundarios: ['alvo'] }),
      atividade('c', { estabilizadores: ['alvo'] }),
    ]
    const porId = new Map(as.map((x) => [x.id, x]))
    const grupos = agruparPorNivel(construirIndiceReverso(as).get('alvo') ?? [], porId)
    expect(grupos.primario.map((e) => e.atividadeId)).toEqual(['a'])
    expect(grupos.secundario.map((e) => e.atividadeId)).toEqual(['b'])
    expect(grupos.estabilizador.map((e) => e.atividadeId)).toEqual(['c'])
  })
})

describe('indice postural', () => {
  it('mapeia quem encurta e quem inibe cada musculo', () => {
    const as = [
      atividade('sentar', { tipo: 'quotidiano', encurta: ['psoas'], inibe: ['gluteo'] }),
      atividade('pedalar', { tipo: 'cardio', encurta: ['psoas'] }),
    ]
    const { encurtam, inibem } = construirIndicePostural(as)
    expect(encurtam.get('psoas')).toEqual(['sentar', 'pedalar'])
    expect(inibem.get('gluteo')).toEqual(['sentar'])
    expect(inibem.get('psoas')).toBeUndefined()
  })
})

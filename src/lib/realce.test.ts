import { describe, expect, it } from 'vitest'
import type { Atividade, Lesao } from '../types'
import { criarEstado, fundirRealces, realceDeAtividade, realceDeLesao, realceDeMusculo } from './realce'

function atividade(id: string, extra: Partial<Atividade> = {}): Atividade {
  return {
    id,
    nome: id,
    nomeEn: id,
    outrosNomes: [],
    tipo: 'forca',
    padrao: 'isolamento',
    plano: 'sagital',
    equipamento: ['peso-corporal'],
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

describe('realce de atividade', () => {
  it('emite todos os musculos das cinco relacoes com o tom certo', () => {
    const mapa = realceDeAtividade(
      atividade('supino', {
        primarios: ['peito'],
        secundarios: ['triceps'],
        estabilizadores: ['core'],
        encurta: ['peitoral-menor'],
        inibe: ['romboides'],
      }),
    )
    expect(mapa.get('peito')?.tom).toBe('primario')
    expect(mapa.get('triceps')?.tom).toBe('secundario')
    expect(mapa.get('core')?.tom).toBe('estabilizador')
    expect(mapa.get('peitoral-menor')?.tom).toBe('encurta')
    expect(mapa.get('romboides')?.tom).toBe('inibe')
    expect(mapa.size).toBe(5)
  })

  it('registra o motivo com o id da atividade, para o painel de detalhe', () => {
    const mapa = realceDeAtividade(atividade('supino', { primarios: ['peito'] }))
    expect(mapa.get('peito')?.motivos).toEqual([
      { tipo: 'ativacao', nivel: 'primario', atividadeId: 'supino' },
    ])
  })

  it('atividade sem musculo nenhum produz mapa vazio', () => {
    expect(realceDeAtividade(atividade('nada')).size).toBe(0)
  })

  it('intensidade cai com o nivel, mas nunca substitui o tom', () => {
    const mapa = realceDeAtividade(
      atividade('a', { primarios: ['p'], secundarios: ['s'], estabilizadores: ['e'] }),
    )
    const p = mapa.get('p')!.intensidade
    const s = mapa.get('s')!.intensidade
    const e = mapa.get('e')!.intensidade
    expect(p).toBeGreaterThan(s)
    expect(s).toBeGreaterThan(e)
  })
})

describe('realce de musculo e de queixa', () => {
  it('selecao direta marca so o musculo escolhido', () => {
    const mapa = realceDeMusculo('gluteo')
    expect(mapa.size).toBe(1)
    expect(mapa.get('gluteo')?.tom).toBe('selecionado')
  })

  it('queixa separa o que fortalecer do que alongar', () => {
    const lesao: Lesao = {
      id: 'lombalgia',
      nome: 'lombalgia',
      outrosNomes: [],
      regiao: 'core',
      resumo: '',
      sinaisDeAlarme: ['a', 'b', 'c'],
      fortalecer: { valor: ['gluteo'], evidencia: 'consenso-fraco' },
      alongarOuMobilizar: { valor: ['psoas'], evidencia: 'consenso-fraco' },
      priorizar: { valor: [], evidencia: 'consenso-forte' },
      regras: [],
      notasGerais: [],
      fontes: [{ titulo: 'f' }],
    }
    const mapa = realceDeLesao(lesao)
    expect(mapa.get('gluteo')?.tom).toBe('fortalecer')
    expect(mapa.get('psoas')?.tom).toBe('encurta')
    expect(mapa.get('psoas')?.rotulo).toBe('Alongar ou mobilizar')
  })
})

describe('fusao de realces', () => {
  it('alerta vence primario', () => {
    const a = new Map([['m', criarEstado('primario', [])]])
    const b = new Map([['m', criarEstado('alerta', [])]])
    expect(fundirRealces(a, b).get('m')?.tom).toBe('alerta')
  })

  it('lacuna perde para tudo', () => {
    const a = new Map([['m', criarEstado('lacuna', [])]])
    const b = new Map([['m', criarEstado('estabilizador', [])]])
    expect(fundirRealces(a, b).get('m')?.tom).toBe('estabilizador')
  })

  it('o tom resultante nao depende da ordem dos argumentos', () => {
    const a = new Map([['m', criarEstado('secundario', [])]])
    const b = new Map([['m', criarEstado('alerta', [])]])
    const c = new Map([['m', criarEstado('estabilizador', [])]])
    expect(fundirRealces(a, b, c).get('m')?.tom).toBe(fundirRealces(c, b, a).get('m')?.tom)
    expect(fundirRealces(a, b, c).get('m')?.tom).toBe('alerta')
  })

  it('acumula os motivos de todas as fontes, mesmo as que perdem o tom', () => {
    const a = new Map([['m', criarEstado('primario', [{ tipo: 'ativacao', nivel: 'primario', atividadeId: 'x' }])]])
    const b = new Map([['m', criarEstado('alerta', [{ tipo: 'lesao-alerta', lesaoId: 'l', texto: 't' }])]])
    const fundido = fundirRealces(a, b).get('m')
    expect(fundido?.tom).toBe('alerta')
    expect(fundido?.motivos).toHaveLength(2)
  })

  it('nao muta os mapas de entrada', () => {
    const a = new Map([['m', criarEstado('primario', [])]])
    const b = new Map([['m', criarEstado('alerta', [])]])
    fundirRealces(a, b)
    expect(a.get('m')?.tom).toBe('primario')
    expect(a.get('m')?.motivos).toHaveLength(0)
  })

  it('fundir zero mapas devolve mapa vazio', () => {
    expect(fundirRealces().size).toBe(0)
  })
})

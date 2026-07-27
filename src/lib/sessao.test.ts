import { describe, expect, it } from 'vitest'
import type { Atividade, Lesao, Musculo } from '../types'
import {
  analisarSessao,
  LIMIAR_SOBRECARGA_PONTOS,
  LIMIAR_SOBRECARGA_PRIMARIOS,
  type OpcoesSessao,
} from './sessao'

// Fixture propria, deliberadamente. Afirmar contra o catalogo real faria cada
// asserção quebrar sempre que um exercicio novo entrasse — a integridade do
// catalogo real e responsabilidade de dados.test.ts, nao deste ficheiro.

function musculo(id: string, extra: Partial<Musculo> = {}): Musculo {
  return {
    id,
    nome: id,
    nomeCurto: id,
    nomeEn: id,
    nomeLatim: id,
    alcunhas: [],
    grupo: null,
    regiao: 'peito',
    camada: 'superficial',
    vistas: ['frente'],
    articulacoes: [],
    acoes: [],
    funcaoResumo: '',
    antagonistas: [],
    ...extra,
  }
}

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

const MUSCULOS: Musculo[] = [
  musculo('peito', { regiao: 'peito' }),
  musculo('triceps', { regiao: 'bracos' }),
  musculo('ombro', { regiao: 'ombros' }),
  musculo('gluteo', { regiao: 'gluteos' }),
  musculo('lombar', { regiao: 'costas' }),
  musculo('core-profundo', { regiao: 'core', camada: 'profunda' }),
]

const ATIVIDADES: Atividade[] = [
  atividade('supino', {
    padrao: 'empurrar-horizontal',
    primarios: ['peito'],
    secundarios: ['triceps', 'ombro'],
    estabilizadores: ['core-profundo'],
  }),
  atividade('flexao', {
    padrao: 'empurrar-horizontal',
    primarios: ['peito'],
    secundarios: ['triceps'],
    estabilizadores: [],
  }),
  atividade('desenvolvimento', {
    padrao: 'empurrar-vertical',
    primarios: ['ombro'],
    secundarios: ['triceps'],
    estabilizadores: [],
  }),
  atividade('terra', {
    padrao: 'dobradica-de-quadril',
    primarios: ['gluteo', 'lombar'],
    secundarios: [],
    estabilizadores: ['core-profundo'],
  }),
  atividade('remada', {
    padrao: 'puxar-horizontal',
    primarios: ['lombar'],
    secundarios: ['ombro'],
    estabilizadores: [],
  }),
  atividade('prancha', {
    padrao: 'anti-extensao',
    primarios: ['core-profundo'],
    secundarios: ['gluteo'],
    estabilizadores: [],
  }),
]

const LESOES: Lesao[] = [
  {
    id: 'lombalgia',
    nome: 'lombalgia',
    outrosNomes: [],
    regiao: 'core',
    resumo: '',
    sinaisDeAlarme: ['a', 'b', 'c'],
    fortalecer: { valor: ['gluteo'], evidencia: 'consenso-fraco' },
    alongarOuMobilizar: { valor: [], evidencia: 'consenso-fraco' },
    priorizar: { valor: ['prancha', 'remada'], evidencia: 'consenso-forte' },
    regras: [
      {
        padrao: 'dobradica-de-quadril',
        gravidade: 'cautela',
        fase: 'aguda',
        porque: 'padrao de risco',
        evidencia: 'consenso-forte',
      },
      {
        atividadeId: 'terra',
        gravidade: 'evitar',
        fase: 'aguda',
        porque: 'excecao curada, mais severa que o padrao',
        evidencia: 'consenso-forte',
      },
    ],
    notasGerais: [],
    fontes: [{ titulo: 'fonte' }],
  },
]

const CATALOGO = { atividades: ATIVIDADES, musculos: MUSCULOS, lesoes: LESOES }
const SEM_LESAO: OpcoesSessao = { lesoesAtivas: [], camada: 'superficial' }

function analisar(ids: string[], opcoes: OpcoesSessao = SEM_LESAO) {
  return analisarSessao(ids.map((atividadeId) => ({ atividadeId })), opcoes, CATALOGO)
}

describe('sessao: combinacao de niveis', () => {
  it('usa o maximo, nunca a soma: dois secundarios continuam secundarios', () => {
    const r = analisar(['flexao', 'desenvolvimento'])
    const triceps = r.cobertura.get('triceps')
    expect(triceps?.melhorNivel).toBe('secundario')
    expect(triceps?.contagem.secundario).toBe(2)
    expect(triceps?.contagem.primario).toBe(0)
  })

  it('um primario ganha a qualquer numero de secundarios', () => {
    const r = analisar(['desenvolvimento', 'supino'])
    expect(r.cobertura.get('ombro')?.melhorNivel).toBe('primario')
  })

  it('acumula as atividades que tocam cada musculo, sem repetir', () => {
    const r = analisar(['supino', 'flexao'])
    expect(r.cobertura.get('peito')?.atividades).toEqual(['supino', 'flexao'])
  })
})

describe('sessao: sobrecarga', () => {
  it('dispara ao atingir exatamente o limiar de primarios', () => {
    expect(LIMIAR_SOBRECARGA_PRIMARIOS).toBe(3)
    const r = analisar(['supino', 'flexao', 'prancha'])
    expect(r.cobertura.get('peito')?.contagem.primario).toBe(2)
    expect(r.sobrecarregados).not.toContain('peito')

    const comTres = analisarSessao(
      [{ atividadeId: 'supino' }, { atividadeId: 'flexao' }, { atividadeId: 'supino' }],
      SEM_LESAO,
      CATALOGO,
    )
    expect(comTres.cobertura.get('peito')?.contagem.primario).toBe(3)
    expect(comTres.sobrecarregados).toContain('peito')
  })

  it('series multiplicam os pontos e podem disparar o limiar sozinhas', () => {
    const r = analisarSessao([{ atividadeId: 'supino', series: 3 }], SEM_LESAO, CATALOGO)
    expect(r.cobertura.get('peito')?.pontos).toBe(9)
    expect(9).toBeGreaterThanOrEqual(LIMIAR_SOBRECARGA_PONTOS)
    expect(r.sobrecarregados).toContain('peito')
  })

  it('pontos nunca alteram o nivel exibido', () => {
    const r = analisarSessao([{ atividadeId: 'supino', series: 10 }], SEM_LESAO, CATALOGO)
    expect(r.cobertura.get('triceps')?.melhorNivel).toBe('secundario')
  })
})

describe('sessao: lacunas', () => {
  it('uma regiao tocada so como estabilizador conta como descoberta', () => {
    const r = analisarSessao([{ atividadeId: 'supino' }], SEM_LESAO, {
      ...CATALOGO,
      musculos: MUSCULOS.map((m) => (m.id === 'core-profundo' ? { ...m, camada: 'superficial' as const } : m)),
    })
    expect(r.cobertura.get('core-profundo')?.melhorNivel).toBe('estabilizador')
    expect(r.regioesDescobertas).toContain('core')
  })

  it('so considera a camada pedida, para os profundos nao poluirem a lista', () => {
    const r = analisar(['supino'])
    expect(r.descobertos).not.toContain('core-profundo')
    expect(r.descobertos).toContain('gluteo')
  })

  it('avisa quando a cadeia posterior fica de fora', () => {
    const so_empurrar = analisar(['supino', 'desenvolvimento'])
    expect(so_empurrar.avisos).toContainEqual({ tipo: 'sem-cadeia-posterior' })

    const com_terra = analisar(['supino', 'terra'])
    expect(com_terra.avisos).not.toContainEqual({ tipo: 'sem-cadeia-posterior' })
  })

  it('avisa desequilibrio quando empurrar e o dobro de puxar', () => {
    const r = analisar(['supino', 'flexao', 'remada'])
    expect(r.avisos).toContainEqual({ tipo: 'desequilibrio-empurrar-puxar', empurrar: 2, puxar: 1 })
  })
})

describe('sessao: conflitos com queixa ativa', () => {
  const COM_LESAO: OpcoesSessao = { lesoesAtivas: ['lombalgia'], camada: 'superficial' }

  it('nao ha conflito nenhum sem queixa ativa', () => {
    expect(analisar(['terra']).conflitos).toEqual([])
  })

  it('a regra por id explicito ganha a regra por padrao para a mesma atividade', () => {
    const r = analisar(['terra'], COM_LESAO)
    expect(r.conflitos).toHaveLength(1)
    expect(r.conflitos[0].gravidade).toBe('evitar')
    expect(r.conflitos[0].origem).toBe('atividade-listada')
  })

  it('a regra por padrao apanha atividades que nunca foram enumeradas', () => {
    const catalogoComNovidade = {
      ...CATALOGO,
      atividades: [...ATIVIDADES, atividade('bom-dia', { padrao: 'dobradica-de-quadril', primarios: ['lombar'] })],
    }
    const r = analisarSessao([{ atividadeId: 'bom-dia' }], COM_LESAO, catalogoComNovidade)
    expect(r.conflitos).toHaveLength(1)
    expect(r.conflitos[0].origem).toBe('padrao-de-risco')
    expect(r.conflitos[0].gravidade).toBe('cautela')
  })

  it('ordena evitar antes de cautela', () => {
    const catalogoComNovidade = {
      ...CATALOGO,
      atividades: [...ATIVIDADES, atividade('bom-dia', { padrao: 'dobradica-de-quadril', primarios: ['lombar'] })],
    }
    const r = analisarSessao(
      [{ atividadeId: 'bom-dia' }, { atividadeId: 'terra' }],
      COM_LESAO,
      catalogoComNovidade,
    )
    expect(r.conflitos.map((c) => c.gravidade)).toEqual(['evitar', 'cautela'])
  })

  it('sugere o que a queixa recomenda e ainda nao esta na sessao', () => {
    const r = analisar(['terra'], COM_LESAO)
    const sugestao = r.avisos.find((a) => a.tipo === 'sugestao-da-lesao')
    expect(sugestao).toEqual({ tipo: 'sugestao-da-lesao', lesaoId: 'lombalgia', atividadeIds: ['prancha', 'remada'] })
  })

  it('nao sugere o que ja esta na sessao', () => {
    const r = analisar(['prancha', 'remada'], COM_LESAO)
    expect(r.avisos.find((a) => a.tipo === 'sugestao-da-lesao')).toBeUndefined()
  })
})

describe('sessao: casos degenerados', () => {
  it('sessao vazia nao produz avisos nem conflitos', () => {
    const r = analisar([])
    expect(r.cobertura.size).toBe(0)
    expect(r.conflitos).toEqual([])
    expect(r.avisos).toEqual([])
  })

  it('ignora ids de atividade desconhecidos em vez de rebentar', () => {
    const r = analisar(['nao-existe', 'supino'])
    expect(r.cobertura.get('peito')?.contagem.primario).toBe(1)
  })
})

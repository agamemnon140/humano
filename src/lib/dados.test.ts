import { describe, expect, it } from 'vitest'
import { atividades, atividadePorId, lesoes, musculos, musculoPorId } from '../data'
import { REGIOES, ROTULO_PADRAO, ROTULO_TIPO, type Equipamento, type MusculoId } from '../types'

const EQUIPAMENTOS: Equipamento[] = [
  'nenhum', 'peso-corporal', 'barra', 'halteres', 'kettlebell', 'maquina', 'cabos',
  'elastico', 'banco', 'barra-fixa', 'bola', 'tapete', 'bicicleta', 'esteira', 'agua', 'reformer',
]

const ARTICULACOES = new Set([
  'coluna-cervical', 'coluna-toracica', 'coluna-lombar', 'escapula', 'ombro',
  'cotovelo', 'punho', 'quadril', 'joelho', 'tornozelo',
])

const ASCII_KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function referenciasDe(ids: MusculoId[], contexto: string): string[] {
  return ids.filter((id) => !musculoPorId.has(id)).map((id) => `${contexto} -> ${id}`)
}

describe('dados: identificadores', () => {
  it('todo id e ASCII kebab-case sem acentos', () => {
    // Ids acabam em hashes de URL e em fragmentos <use href="#g-...">, onde
    // caracteres acentuados sao uma armadilha de portabilidade.
    for (const m of musculos) expect(m.id, `musculo ${m.nome}`).toMatch(ASCII_KEBAB)
    for (const a of atividades) expect(a.id, `atividade ${a.nome}`).toMatch(ASCII_KEBAB)
    for (const l of lesoes) expect(l.id, `queixa ${l.nome}`).toMatch(ASCII_KEBAB)
  })

  it('nao ha ids repetidos', () => {
    expect(musculoPorId.size).toBe(musculos.length)
    expect(atividadePorId.size).toBe(atividades.length)
    expect(new Set(lesoes.map((l) => l.id)).size).toBe(lesoes.length)
  })
})

describe('dados: integridade referencial', () => {
  it('toda referencia a musculo aponta para um musculo existente', () => {
    const quebradas: string[] = []
    for (const a of atividades) {
      quebradas.push(
        ...referenciasDe(a.primarios, `${a.id}.primarios`),
        ...referenciasDe(a.secundarios, `${a.id}.secundarios`),
        ...referenciasDe(a.estabilizadores, `${a.id}.estabilizadores`),
        ...referenciasDe(a.encurta, `${a.id}.encurta`),
        ...referenciasDe(a.inibe, `${a.id}.inibe`),
      )
    }
    for (const m of musculos) quebradas.push(...referenciasDe(m.antagonistas, `${m.id}.antagonistas`))
    for (const l of lesoes) {
      quebradas.push(
        ...referenciasDe(l.fortalecer.valor, `${l.id}.fortalecer`),
        ...referenciasDe(l.alongarOuMobilizar.valor, `${l.id}.alongarOuMobilizar`),
      )
    }
    expect(quebradas).toEqual([])
  })

  it('toda referencia a atividade aponta para uma atividade existente', () => {
    const quebradas: string[] = []
    for (const a of atividades) {
      for (const s of a.substituicoes) {
        if (!atividadePorId.has(s)) quebradas.push(`${a.id}.substituicoes -> ${s}`)
      }
    }
    for (const l of lesoes) {
      for (const p of l.priorizar.valor) {
        if (!atividadePorId.has(p)) quebradas.push(`${l.id}.priorizar -> ${p}`)
      }
      for (const r of l.regras) {
        if (r.atividadeId && !atividadePorId.has(r.atividadeId)) {
          quebradas.push(`${l.id}.regras -> ${r.atividadeId}`)
        }
      }
    }
    expect(quebradas).toEqual([])
  })

  it('nenhum musculo aparece em dois niveis da mesma atividade', () => {
    const colisoes: string[] = []
    for (const a of atividades) {
      const vistos = new Set<MusculoId>()
      for (const id of [...a.primarios, ...a.secundarios, ...a.estabilizadores]) {
        if (vistos.has(id)) colisoes.push(`${a.id} -> ${id}`)
        vistos.add(id)
      }
    }
    expect(colisoes).toEqual([])
  })
})

describe('dados: validade dos enums', () => {
  // O JSON nao da nenhuma validacao em tempo de compilacao: o `as Type[]` em
  // src/data/index.ts e uma promessa, e este bloco e quem a cobra.
  it('musculos usam regiao, camada, vista e articulacao validas', () => {
    for (const m of musculos) {
      expect(REGIOES, m.id).toContain(m.regiao)
      expect(['superficial', 'profunda'], m.id).toContain(m.camada)
      expect(m.vistas.length, `${m.id} sem vista`).toBeGreaterThan(0)
      for (const v of m.vistas) expect(['frente', 'costas'], m.id).toContain(v)
      for (const art of m.articulacoes) expect(ARTICULACOES.has(art), `${m.id} -> ${art}`).toBe(true)
      if (m.tendencia) expect(['encurtar', 'inibir'], m.id).toContain(m.tendencia)
      if (m.grupo) expect(typeof m.grupo, m.id).toBe('string')
    }
  })

  it('atividades usam tipo, padrao, plano, cadeia e equipamento validos', () => {
    for (const a of atividades) {
      expect(Object.keys(ROTULO_TIPO), a.id).toContain(a.tipo)
      expect(Object.keys(ROTULO_PADRAO), a.id).toContain(a.padrao)
      expect(['sagital', 'frontal', 'transverso', 'multiplanar'], a.id).toContain(a.plano)
      expect(['aberta', 'fechada', 'mista'], a.id).toContain(a.cadeia)
      expect([1, 2, 3], a.id).toContain(a.dificuldade)
      expect(a.equipamento.length, `${a.id} sem equipamento`).toBeGreaterThan(0)
      for (const e of a.equipamento) expect(EQUIPAMENTOS, a.id).toContain(e)
      if (a.evidenciaPostural) {
        expect(['consenso-forte', 'consenso-fraco'], a.id).toContain(a.evidenciaPostural)
      }
    }
  })
})

describe('dados: invariantes editoriais', () => {
  it('atividade unilateral explica qual lado trabalha', () => {
    for (const a of atividades) {
      if (!a.unilateral) continue
      expect(a.notaUnilateral, `${a.id} e unilateral e nao explica o lado`).toBeTruthy()
    }
  })

  it('so atividades de mobilidade ou do cotidiano podem nao ter primarios', () => {
    for (const a of atividades) {
      if (a.primarios.length > 0) continue
      expect(['quotidiano', 'mobilidade'], `${a.id} sem primarios`).toContain(a.tipo)
    }
  })

  it('uma relacao postural sem nota nao passa despercebida', () => {
    for (const a of atividades) {
      if (a.encurta.length === 0 && a.inibe.length === 0) continue
      expect(a.notaPostural, `${a.id} afirma encurta/inibe sem justificar`).toBeTruthy()
    }
  })

  it('toda afirmacao postural carrega forca de evidencia explicita', () => {
    for (const a of atividades) {
      if (!a.notaPostural) continue
      expect(a.evidenciaPostural, `${a.id} tem notaPostural sem evidencia`).toBeTruthy()
    }
  })
})

describe('dados: queixas', () => {
  // Esta restricao e o que impede o conteudo de derivar para invencao confiante.
  it('toda queixa tem pelo menos tres sinais de alarme', () => {
    for (const l of lesoes) {
      expect(l.sinaisDeAlarme.length, `${l.id}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('toda queixa cita pelo menos uma fonte', () => {
    for (const l of lesoes) {
      expect(l.fontes.length, `${l.id}`).toBeGreaterThanOrEqual(1)
      for (const f of l.fontes) expect(f.titulo.length, `${l.id}`).toBeGreaterThan(0)
    }
  })

  it('toda alegacao carrega forca de evidencia valida', () => {
    for (const l of lesoes) {
      for (const [campo, alegacao] of [
        ['fortalecer', l.fortalecer],
        ['alongarOuMobilizar', l.alongarOuMobilizar],
        ['priorizar', l.priorizar],
      ] as const) {
        expect(['consenso-forte', 'consenso-fraco'], `${l.id}.${campo}`).toContain(alegacao.evidencia)
      }
      for (const r of l.regras) {
        expect(['consenso-forte', 'consenso-fraco'], `${l.id}.regras`).toContain(r.evidencia)
      }
    }
  })

  it('nenhuma queixa recomenda e desaconselha explicitamente a mesma atividade', () => {
    // Uma regra por padrao pode colidir com a recomendacao — analisarSessao
    // resolve isso a favor da recomendacao. Mas uma regra por id explicito a
    // contradizer a lista de prioridades e contradicao editorial pura.
    const contradicoes: string[] = []
    for (const l of lesoes) {
      for (const r of l.regras) {
        if (r.atividadeId && l.priorizar.valor.includes(r.atividadeId)) {
          contradicoes.push(`${l.id}: ${r.atividadeId}`)
        }
      }
    }
    expect(contradicoes).toEqual([])
  })

  it('toda atividade que a queixa manda priorizar existe no catalogo', () => {
    for (const l of lesoes) {
      expect(l.priorizar.valor.length, `${l.id} nao recomenda nada`).toBeGreaterThan(0)
    }
  })

  it('todo musculo que uma queixa manda fortalecer tem exercicio que o treina', () => {
    // Sem isto, o usuario toca no chip "fortalecer" e recebe lista vazia.
    const becos: string[] = []
    for (const l of lesoes) {
      for (const id of l.fortalecer.valor) {
        const treinado = atividades.some(
          (a) => a.primarios.includes(id) || a.secundarios.includes(id),
        )
        if (!treinado) becos.push(`${l.id} -> ${id}`)
      }
    }
    expect(becos).toEqual([])
  })

  it('toda regra casa por atividade ou por padrao, com motivo e gravidade', () => {
    for (const l of lesoes) {
      for (const r of l.regras) {
        expect(Boolean(r.atividadeId || r.padrao), `${l.id}: regra sem alvo`).toBe(true)
        expect(['evitar', 'cautela'], `${l.id}`).toContain(r.gravidade)
        expect(['aguda', 'geral'], `${l.id}`).toContain(r.fase)
        expect(r.porque.length, `${l.id}: regra sem motivo`).toBeGreaterThan(0)
      }
    }
  })
})

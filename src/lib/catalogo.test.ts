import { describe, expect, it } from 'vitest'
import { atividadePorId, catalogo, indicePostural, indiceReverso, musculoPorId } from '../data'
import { agruparPorNivel } from './indice'
import { analisarSessao } from './sessao'
import type { MusculoId } from '../types'

// Cenarios de ponta a ponta contra o catalogo REAL. Ao contrario de
// sessao.test.ts, que usa fixture propria, aqui o alvo e a qualidade da
// curadoria — mas so por propriedades robustas ("o topo e uma dobradica ou
// agachamento"), nunca por igualdade a um id, que apodreceria a cada
// exercicio novo.

function topoPrimario(musculoId: MusculoId) {
  const grupos = agruparPorNivel(indiceReverso.get(musculoId) ?? [], atividadePorId)
  return grupos.primario.map((e) => atividadePorId.get(e.atividadeId)!)
}

describe('musculo -> melhores exercicios', () => {
  it('o topo para o gluteo maximo e dobradica, agachamento ou avanco — nunca uma prancha', () => {
    const topo = topoPrimario('gluteo-maximo')
    expect(topo.length).toBeGreaterThan(0)
    expect(['dobradica-de-quadril', 'agachamento', 'avanco']).toContain(topo[0].padrao)
  })

  it('o topo para o peitoral esternal e um empurrao horizontal ou isolamento de peito', () => {
    const topo = topoPrimario('peitoral-maior-esternal')
    expect(['empurrar-horizontal', 'isolamento']).toContain(topo[0].padrao)
  })

  it('o topo para o grande dorsal e uma puxada', () => {
    const topo = topoPrimario('grande-dorsal')
    expect(topo[0].padrao.startsWith('puxar')).toBe(true)
  })

  it('quase todo musculo superficial tem um exercicio primario', () => {
    // Excecoes honestas: nenhum exercicio comum faz destes tres o motor
    // principal. Sao sempre coadjuvantes, e fingir o contrario seria inventar.
    const SEM_MOTOR_PROPRIO = ['redondo-maior', 'sartorio', 'tensor-fascia-lata']
    const orfaos = catalogo.musculos
      .filter((m) => m.camada === 'superficial')
      .filter((m) => !SEM_MOTOR_PROPRIO.includes(m.id))
      .filter((m) => topoPrimario(m.id).length === 0)
      .map((m) => m.id)
    expect(orfaos).toEqual([])
  })

  it('todo musculo superficial e alcancado por alguma atividade', () => {
    const nunca = catalogo.musculos
      .filter((m) => m.camada === 'superficial')
      .filter((m) => !indiceReverso.has(m.id))
      .map((m) => m.id)
    expect(nunca).toEqual([])
  })

  it('os profundos so aparecem se alguma atividade os tocar ou os alongar', () => {
    // peitoral-menor e piriforme nao sao treinaveis diretamente por exercicio
    // comum — existem no catalogo porque encurtam, e e isso que a app mostra.
    const invisiveis = catalogo.musculos
      .filter((m) => m.camada === 'profunda')
      .filter(
        (m) =>
          !indiceReverso.has(m.id) &&
          !indicePostural.encurtam.has(m.id) &&
          !indicePostural.inibem.has(m.id) &&
          !catalogo.lesoes.some((l) => l.alongarOuMobilizar.valor.includes(m.id)),
      )
      .map((m) => m.id)
    expect(invisiveis).toEqual([])
  })
})

describe('o modelo postural paga o seu custo', () => {
  it('ficar sentado aparece como inibidor do gluteo maximo', () => {
    expect(indicePostural.inibem.get('gluteo-maximo')).toContain('ficar-sentado')
  })

  it('ficar sentado aparece como encurtador do psoas', () => {
    expect(indicePostural.encurtam.get('psoas-iliaco')).toContain('ficar-sentado')
  })

  it('ficar sentado nao tem primario nenhum: nao e um exercicio', () => {
    const sentar = atividadePorId.get('ficar-sentado')!
    expect(sentar.primarios).toEqual([])
    expect(sentar.inibe.length).toBeGreaterThan(0)
  })
})

describe('sessao: o cenario de aceitacao do construtor', () => {
  const sessaoDeEmpurrar = [
    { atividadeId: 'supino-com-barra' },
    { atividadeId: 'desenvolvimento-com-barra' },
    { atividadeId: 'flexao-de-bracos' },
  ]

  it('tres empurroes sobrecarregam o deltoide anterior e nomeiam os culpados', () => {
    const r = analisarSessao(sessaoDeEmpurrar, { lesoesAtivas: [], camada: 'superficial' }, catalogo)
    expect(r.sobrecarregados).toContain('deltoide-anterior')
    // Sempre com os nomes que contribuem, para a correcao ficar a um toque.
    expect(r.cobertura.get('deltoide-anterior')!.atividades.length).toBe(3)
  })

  it('so empurrar deixa coxas e gluteos descobertos e avisa da cadeia posterior', () => {
    const r = analisarSessao(sessaoDeEmpurrar, { lesoesAtivas: [], camada: 'superficial' }, catalogo)
    expect(r.regioesDescobertas).toContain('coxas')
    expect(r.regioesDescobertas).toContain('gluteos')
    expect(r.avisos).toContainEqual({ tipo: 'sem-cadeia-posterior' })
    // Costas NAO conta como descoberta: o desenvolvimento com barra recruta o
    // trapezio superior a nivel secundario, e isso e verdade anatomica.
    expect(r.regioesDescobertas).not.toContain('costas')
  })

  it('com dor lombar ativa, o levantamento terra gera "evitar" pela regra explicita', () => {
    const r = analisarSessao(
      [{ atividadeId: 'levantamento-terra' }],
      { lesoesAtivas: ['dor-lombar-inespecifica'], camada: 'superficial' },
      catalogo,
    )
    const c = r.conflitos.find((x) => x.atividadeId === 'levantamento-terra')
    expect(c?.gravidade).toBe('evitar')
    expect(c?.origem).toBe('atividade-listada')
  })

  it('o terra romeno gera "cautela" pela regra do PADRAO, sem nunca ter sido enumerado', () => {
    // A ficha de dor lombar nao menciona levantamento-terra-romeno em lado
    // nenhum. O aviso sai da regra de padrao `dobradica-de-quadril`, e e este
    // teste que prova que o motor funciona com o catalogo incompleto.
    const lesao = catalogo.lesoes.find((l) => l.id === 'dor-lombar-inespecifica')!
    expect(lesao.regras.some((r) => r.atividadeId === 'levantamento-terra-romeno')).toBe(false)

    const r = analisarSessao(
      [{ atividadeId: 'levantamento-terra-romeno' }],
      { lesoesAtivas: ['dor-lombar-inespecifica'], camada: 'superficial' },
      catalogo,
    )
    const c = r.conflitos.find((x) => x.atividadeId === 'levantamento-terra-romeno')
    expect(c?.gravidade).toBe('cautela')
    expect(c?.origem).toBe('padrao-de-risco')
  })

  it('a ponte de gluteo e dobradica, mas a recomendacao da queixa ganha do padrao', () => {
    // Sem esta regra a app recomendaria e alertaria o mesmo exercicio ao mesmo
    // tempo, que e a forma mais rapida de perder a confianca do usuario.
    const r = analisarSessao(
      [{ atividadeId: 'ponte-de-gluteo' }],
      { lesoesAtivas: ['dor-lombar-inespecifica'], camada: 'superficial' },
      catalogo,
    )
    expect(atividadePorId.get('ponte-de-gluteo')!.padrao).toBe('dobradica-de-quadril')
    expect(r.conflitos).toEqual([])
  })

  it('o ecra nao diz so nao: sugere o que a queixa recomenda', () => {
    const r = analisarSessao(
      [{ atividadeId: 'levantamento-terra' }],
      { lesoesAtivas: ['dor-lombar-inespecifica'], camada: 'superficial' },
      catalogo,
    )
    const sugestao = r.avisos.find((a) => a.tipo === 'sugestao-da-lesao')
    expect(sugestao && sugestao.tipo === 'sugestao-da-lesao' && sugestao.atividadeIds.length).toBeTruthy()
  })

  it('uma sessao equilibrada nao dispara aviso nenhum de equilibrio', () => {
    const r = analisarSessao(
      [
        { atividadeId: 'supino-com-barra' },
        { atividadeId: 'remada-curvada' },
        { atividadeId: 'agachamento-livre' },
        { atividadeId: 'levantamento-terra-romeno' },
      ],
      { lesoesAtivas: [], camada: 'superficial' },
      catalogo,
    )
    expect(r.avisos.filter((a) => a.tipo !== 'sugestao-da-lesao')).toEqual([])
  })
})

describe('cobertura editorial do catalogo', () => {
  it('todos os exercicios que o usuario pediu por nome estao presentes', () => {
    const pedidos = [
      'corrida', 'natacao-crawl', 'pilates-solo', 'caminhada', 'ficar-sentado',
      'agachamento-bulgaro', 'agachamento-livre', 'levantamento-terra',
      'desenvolvimento-com-barra', 'supino-com-barra',
    ]
    const emFalta = pedidos.filter((id) => !atividadePorId.has(id))
    expect(emFalta).toEqual([])
  })

  it('todo padrao de movimento tem pelo menos uma atividade', () => {
    const usados = new Set(catalogo.atividades.map((a) => a.padrao))
    const semCobertura = [
      'empurrar-horizontal', 'empurrar-vertical', 'puxar-horizontal', 'puxar-vertical',
      'agachamento', 'dobradica-de-quadril', 'avanco', 'transporte',
      'anti-rotacao', 'anti-extensao', 'anti-flexao-lateral', 'marcha',
      'isolamento', 'postura-mantida',
    ].filter((p) => !usados.has(p as never))
    expect(semCobertura).toEqual([])
  })

  it('toda regiao do corpo tem musculos e toda queixa aponta para uma regiao real', () => {
    for (const l of catalogo.lesoes) {
      expect(catalogo.musculos.some((m) => m.regiao === l.regiao), l.id).toBe(true)
    }
  })

  it('nenhum musculo se lista como proprio antagonista', () => {
    for (const m of catalogo.musculos) {
      expect(m.antagonistas, m.id).not.toContain(m.id)
    }
  })

  it('todo grupo referido por uma cabeca existe como grupo de outra cabeca', () => {
    // Nao ha registo para "triceps-braquial" em si; e um rotulo de agrupamento.
    // O que se cobra e coerencia: se existe, mais de uma cabeca deve usa-lo.
    const contagem = new Map<string, number>()
    for (const m of catalogo.musculos) {
      if (!m.grupo) continue
      contagem.set(m.grupo, (contagem.get(m.grupo) ?? 0) + 1)
    }
    const solitarios = [...contagem].filter(([, n]) => n < 2).map(([g]) => g)
    expect(solitarios).toEqual([])
  })

  it('substituicao entre exercicios de forca partilha padrao ou musculo alvo', () => {
    // So se cobra de `forca`. Para cardio, mobilidade e cotidiano, substituir
    // significa "serve ao mesmo propósito" — nadar substitui correr por causa
    // do impacto, nao por trabalhar os mesmos musculos.
    const incoerentes: string[] = []
    for (const a of catalogo.atividades) {
      if (a.tipo !== 'forca') continue
      for (const id of a.substituicoes) {
        const outra = atividadePorId.get(id)!
        const mesmoPadrao = outra.padrao === a.padrao
        const partilhaPrimario = a.primarios.some((m) => outra.primarios.includes(m))
        const partilhaAlvo = a.primarios.some((m) => outra.secundarios.includes(m))
        if (!mesmoPadrao && !partilhaPrimario && !partilhaAlvo) {
          incoerentes.push(`${a.id} -> ${id}`)
        }
      }
    }
    expect(incoerentes).toEqual([])
  })
})

describe('o mapa cobre o que os dados prometem', () => {
  it('toda regiao corporal tem pelo menos um musculo desenhavel', () => {
    const regioes = new Set(catalogo.musculos.map((m) => m.regiao))
    expect(regioes.size).toBeGreaterThanOrEqual(9)
  })

  it('a camada profunda tem os musculos clinicamente relevantes das queixas', () => {
    const essenciais: MusculoId[] = [
      'transverso-do-abdomen', 'multifidos', 'quadrado-lombar',
      'psoas-iliaco', 'piriforme', 'romboides',
    ]
    for (const id of essenciais) {
      expect(musculoPorId.get(id)?.camada, id).toBe('profunda')
    }
  })
})

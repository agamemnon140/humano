import type {
  Atividade,
  AtividadeId,
  Camada,
  ForcaEvidencia,
  Lesao,
  LesaoId,
  MapaDeRealce,
  Musculo,
  MusculoId,
  NivelAtivacao,
  PadraoMovimento,
  RegiaoCorporal,
} from '../types'
import { criarEstado } from './realce'

export interface EntradaSessao {
  atividadeId: AtividadeId
  /** Peso relativo da atividade na sessao. Ausente conta como 1. */
  series?: number
}

export interface CoberturaMusculo {
  musculoId: MusculoId
  /** O nivel MAIS FORTE que qualquer atividade selecionada atribui.
   *  Nunca a soma: dois secundarios nao fazem um primario. */
  melhorNivel: NivelAtivacao
  contagem: Record<NivelAtivacao, number>
  /** So ordena a lista de sobrecarga. Nunca muda o nivel exibido. */
  pontos: number
  /** Carga direta: so primario e secundario. E este que dispara o limiar,
   *  porque estabilizar em muitos exercicios nao e o mesmo que sobrecarregar
   *  — e o core estabiliza em quase tudo. */
  pontosDiretos: number
  atividades: AtividadeId[]
}

export interface Conflito {
  atividadeId: AtividadeId
  lesaoId: LesaoId
  gravidade: 'evitar' | 'cautela'
  origem: 'atividade-listada' | 'padrao-de-risco'
  texto: string
  condicao?: string
  evidencia: ForcaEvidencia
}

export type AvisoSessao =
  | { tipo: 'desequilibrio-empurrar-puxar'; empurrar: number; puxar: number }
  | { tipo: 'sem-cadeia-posterior' }
  | { tipo: 'sugestao-da-lesao'; lesaoId: LesaoId; atividadeIds: AtividadeId[] }

export interface ResultadoSessao {
  cobertura: Map<MusculoId, CoberturaMusculo>
  regioesDescobertas: RegiaoCorporal[]
  descobertos: MusculoId[]
  sobrecarregados: MusculoId[]
  encurtados: MusculoId[]
  inibidos: MusculoId[]
  conflitos: Conflito[]
  avisos: AvisoSessao[]
}

export const PESO_NIVEL: Record<NivelAtivacao, number> = {
  primario: 3,
  secundario: 2,
  estabilizador: 1,
}

export const LIMIAR_SOBRECARGA_PRIMARIOS = 3
/** 7 = um primario mais dois secundarios, ou dois primarios mais um
 *  secundario. E o ponto onde tres exercicios seguidos batem no mesmo
 *  musculo com intencao, que e o padrao classico de excesso de empurrao. */
export const LIMIAR_SOBRECARGA_PONTOS = 7

const ORDEM_NIVEL: Record<NivelAtivacao, number> = {
  primario: 0,
  secundario: 1,
  estabilizador: 2,
}

const PADROES_EMPURRAR: PadraoMovimento[] = ['empurrar-horizontal', 'empurrar-vertical']
const PADROES_PUXAR: PadraoMovimento[] = ['puxar-horizontal', 'puxar-vertical']

/** Regiao coberta significa: pelo menos um musculo dela chega a secundario.
 *  So estabilizador nao conta como ter trabalhado a regiao. */
const NIVEL_MINIMO_PARA_COBRIR: NivelAtivacao = 'secundario'

export interface OpcoesSessao {
  lesoesAtivas: LesaoId[]
  camada: Camada
}

export function analisarSessao(
  entradas: EntradaSessao[],
  opcoes: OpcoesSessao,
  catalogo: { atividades: Atividade[]; musculos: Musculo[]; lesoes: Lesao[] },
): ResultadoSessao {
  const porId = new Map(catalogo.atividades.map((a) => [a.id, a]))
  const selecionadas = entradas
    .map((e) => ({ entrada: e, atividade: porId.get(e.atividadeId) }))
    .filter((x): x is { entrada: EntradaSessao; atividade: Atividade } => Boolean(x.atividade))

  const cobertura = new Map<MusculoId, CoberturaMusculo>()

  const registar = (musculoId: MusculoId, nivel: NivelAtivacao, a: Atividade, series: number) => {
    const atual = cobertura.get(musculoId)
    const direto = nivel === 'estabilizador' ? 0 : PESO_NIVEL[nivel] * series
    if (!atual) {
      cobertura.set(musculoId, {
        musculoId,
        melhorNivel: nivel,
        contagem: { primario: 0, secundario: 0, estabilizador: 0, [nivel]: 1 } as Record<NivelAtivacao, number>,
        pontos: PESO_NIVEL[nivel] * series,
        pontosDiretos: direto,
        atividades: [a.id],
      })
      return
    }
    atual.contagem[nivel] += 1
    atual.pontos += PESO_NIVEL[nivel] * series
    atual.pontosDiretos += direto
    if (ORDEM_NIVEL[nivel] < ORDEM_NIVEL[atual.melhorNivel]) atual.melhorNivel = nivel
    if (!atual.atividades.includes(a.id)) atual.atividades.push(a.id)
  }

  const encurtados = new Set<MusculoId>()
  const inibidos = new Set<MusculoId>()

  for (const { entrada, atividade } of selecionadas) {
    const series = entrada.series ?? 1
    for (const m of atividade.primarios) registar(m, 'primario', atividade, series)
    for (const m of atividade.secundarios) registar(m, 'secundario', atividade, series)
    for (const m of atividade.estabilizadores) registar(m, 'estabilizador', atividade, series)
    for (const m of atividade.encurta) encurtados.add(m)
    for (const m of atividade.inibe) inibidos.add(m)
  }

  // ── Lacunas ───────────────────────────────────────────────────────────
  // Restrito a camada superficial: estabilizadores profundos quase nunca sao
  // motores primarios e poluiriam a lista permanentemente.
  const universo = catalogo.musculos.filter((m) => m.camada === opcoes.camada)
  const descobertos = universo.filter((m) => !cobertura.has(m.id)).map((m) => m.id)

  const regioes = new Set(universo.map((m) => m.regiao))
  const regioesDescobertas = [...regioes].filter((regiao) =>
    universo
      .filter((m) => m.regiao === regiao)
      .every((m) => {
        const c = cobertura.get(m.id)
        return !c || ORDEM_NIVEL[c.melhorNivel] > ORDEM_NIVEL[NIVEL_MINIMO_PARA_COBRIR]
      }),
  )

  const sobrecarregados = [...cobertura.values()]
    .filter(
      (c) =>
        c.contagem.primario >= LIMIAR_SOBRECARGA_PRIMARIOS ||
        c.pontosDiretos >= LIMIAR_SOBRECARGA_PONTOS,
    )
    .sort((a, b) => b.pontosDiretos - a.pontosDiretos)
    .map((c) => c.musculoId)

  // ── Conflitos ─────────────────────────────────────────────────────────
  const conflitos: Conflito[] = []
  const lesoesAtivas = catalogo.lesoes.filter((l) => opcoes.lesoesAtivas.includes(l.id))

  for (const lesao of lesoesAtivas) {
    for (const { atividade } of selecionadas) {
      // Regra por id explicito ganha a regra por padrao: uma excecao curada
      // pode rebaixar um aviso generico.
      const porIdExplicito = lesao.regras.find((r) => r.atividadeId === atividade.id)
      // Uma queixa nao pode recomendar e alertar a mesma coisa. A ponte de
      // gluteo e dobradica de quadril, mas a ficha de dor lombar prioriza-a
      // explicitamente — ai a recomendacao ganha a regra generica do padrao.
      const recomendada = lesao.priorizar.valor.includes(atividade.id)
      const porPadrao = recomendada
        ? undefined
        : lesao.regras.find((r) => !r.atividadeId && r.padrao === atividade.padrao)
      const regra = porIdExplicito ?? porPadrao
      if (!regra) continue

      conflitos.push({
        atividadeId: atividade.id,
        lesaoId: lesao.id,
        gravidade: regra.gravidade,
        origem: porIdExplicito ? 'atividade-listada' : 'padrao-de-risco',
        texto: regra.porque,
        condicao: regra.condicao,
        evidencia: regra.evidencia,
      })
    }
  }

  conflitos.sort((a, b) => (a.gravidade === b.gravidade ? 0 : a.gravidade === 'evitar' ? -1 : 1))

  // ── Avisos ────────────────────────────────────────────────────────────
  const avisos: AvisoSessao[] = []
  const idsSelecionados = new Set(selecionadas.map((s) => s.atividade.id))

  const empurrar = selecionadas.filter((s) => PADROES_EMPURRAR.includes(s.atividade.padrao)).length
  const puxar = selecionadas.filter((s) => PADROES_PUXAR.includes(s.atividade.padrao)).length
  if (empurrar + puxar > 0 && (empurrar >= puxar * 2 || puxar >= empurrar * 2)) {
    avisos.push({ tipo: 'desequilibrio-empurrar-puxar', empurrar, puxar })
  }

  // Derivada dos dados, nao de uma lista de ids cravada aqui: qualquer musculo
  // dos gluteos ou do grupo dos isquiotibiais conta como cadeia posterior.
  const cadeiaPosterior = catalogo.musculos.filter(
    (m) => m.regiao === 'gluteos' || m.grupo === 'isquiotibiais',
  )
  if (
    selecionadas.length > 0 &&
    !cadeiaPosterior.some((m) => {
      const c = cobertura.get(m.id)
      return c && ORDEM_NIVEL[c.melhorNivel] <= ORDEM_NIVEL['secundario']
    })
  ) {
    avisos.push({ tipo: 'sem-cadeia-posterior' })
  }

  // O ecra nao pode so dizer nao: o que a queixa recomenda e que ainda nao
  // esta na sessao vira sugestao.
  for (const lesao of lesoesAtivas) {
    const emFalta = lesao.priorizar.valor.filter((id) => !idsSelecionados.has(id) && porId.has(id))
    if (emFalta.length > 0) {
      avisos.push({ tipo: 'sugestao-da-lesao', lesaoId: lesao.id, atividadeIds: emFalta })
    }
  }

  return {
    cobertura,
    regioesDescobertas: regioesDescobertas.sort(),
    descobertos,
    sobrecarregados,
    encurtados: [...encurtados],
    inibidos: [...inibidos],
    conflitos,
    avisos,
  }
}

export function realceDeSessao(resultado: ResultadoSessao): MapaDeRealce {
  const mapa: MapaDeRealce = new Map()

  for (const c of resultado.cobertura.values()) {
    mapa.set(
      c.musculoId,
      criarEstado(
        c.melhorNivel,
        c.atividades.map((atividadeId) => ({
          tipo: 'ativacao' as const,
          nivel: c.melhorNivel,
          atividadeId,
        })),
        `${rotuloNivel(c.melhorNivel)} · ${c.atividades.length} ${c.atividades.length === 1 ? 'exercício' : 'exercícios'}`,
      ),
    )
  }

  return mapa
}

function rotuloNivel(nivel: NivelAtivacao): string {
  return nivel === 'primario' ? 'Primário' : nivel === 'secundario' ? 'Secundário' : 'Estabilizador'
}

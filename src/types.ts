import type { ReactNode } from 'react'

// ═══════════════════════════════════════════════════════════════════════
//  Identificadores e enumerações
//  Regra: todo `id` e ASCII kebab-case sem acentos. Eles vao parar a hashes
//  de URL e a fragmentos `<use href="#g-...">`, onde acentos sao armadilha.
//  `dados.test.ts` verifica.
// ═══════════════════════════════════════════════════════════════════════

export type MusculoId = string
export type AtividadeId = string
export type LesaoId = string

/** Dica de camara, nao geometria: o SVG troca de ficheiro, um render 3D
 *  animaria o azimute para 0 graus ou 180 graus. */
export type Vista = 'frente' | 'costas'
export type Camada = 'superficial' | 'profunda'

export type RegiaoCorporal =
  | 'pescoco'
  | 'peito'
  | 'costas'
  | 'ombros'
  | 'bracos'
  | 'antebracos'
  | 'core'
  | 'gluteos'
  | 'coxas'
  | 'pernas'

export const REGIOES: RegiaoCorporal[] = [
  'pescoco',
  'peito',
  'costas',
  'ombros',
  'bracos',
  'antebracos',
  'core',
  'gluteos',
  'coxas',
  'pernas',
]

export const ROTULO_REGIAO: Record<RegiaoCorporal, string> = {
  pescoco: 'Pescoço',
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  bracos: 'Braços',
  antebracos: 'Antebraços',
  core: 'Core',
  gluteos: 'Glúteos',
  coxas: 'Coxas',
  pernas: 'Pernas',
}

export type Articulacao =
  | 'coluna-cervical'
  | 'coluna-toracica'
  | 'coluna-lombar'
  | 'escapula'
  | 'ombro'
  | 'cotovelo'
  | 'punho'
  | 'quadril'
  | 'joelho'
  | 'tornozelo'

export type ForcaEvidencia = 'consenso-forte' | 'consenso-fraco'

// ═══════════════════════════════════════════════════════════════════════
//  Musculo
// ═══════════════════════════════════════════════════════════════════════

export interface Musculo {
  id: MusculoId
  /** pt-BR, nome completo. */
  nome: string
  /** pt-BR, curto — cabe num chip. */
  nomeCurto: string
  /** Revelado sob demanda (duplo clique / toque no titulo da ficha). */
  nomeEn: string
  nomeLatim: string
  /** Sinonimos pt-PT, pt-BR coloquial e ingles — so para busca. */
  alcunhas: string[]
  /** Preenchido quando este registo e uma cabeca/porcao de um musculo maior. */
  grupo: MusculoId | null
  regiao: RegiaoCorporal
  camada: Camada
  vistas: Vista[]
  articulacoes: Articulacao[]
  acoes: string[]
  funcaoResumo: string
  antagonistas: MusculoId[]
  /** Tendencia postural tipica. Alimenta as fichas de habito e de queixa. */
  tendencia?: 'encurtar' | 'inibir'
}

// ═══════════════════════════════════════════════════════════════════════
//  Atividade — exercicios de treino E habitos do quotidiano
// ═══════════════════════════════════════════════════════════════════════

export type TipoAtividade = 'forca' | 'cardio' | 'mobilidade' | 'desporto' | 'quotidiano'

export const ROTULO_TIPO: Record<TipoAtividade, string> = {
  forca: 'Força',
  cardio: 'Cardio',
  mobilidade: 'Mobilidade',
  desporto: 'Esporte',
  quotidiano: 'Cotidiano',
}

export type Equipamento =
  | 'nenhum'
  | 'peso-corporal'
  | 'barra'
  | 'halteres'
  | 'kettlebell'
  | 'maquina'
  | 'cabos'
  | 'elastico'
  | 'banco'
  | 'barra-fixa'
  | 'bola'
  | 'tapete'
  | 'bicicleta'
  | 'esteira'
  | 'agua'
  | 'reformer'

export type PadraoMovimento =
  | 'empurrar-horizontal'
  | 'empurrar-vertical'
  | 'puxar-horizontal'
  | 'puxar-vertical'
  | 'agachamento'
  | 'dobradica-de-quadril'
  | 'avanco'
  | 'transporte'
  | 'rotacao'
  | 'anti-rotacao'
  | 'anti-extensao'
  | 'anti-flexao-lateral'
  | 'marcha'
  | 'isolamento'
  | 'postura-mantida'
  | 'nenhum'

export const ROTULO_PADRAO: Record<PadraoMovimento, string> = {
  'empurrar-horizontal': 'Empurrar horizontal',
  'empurrar-vertical': 'Empurrar vertical',
  'puxar-horizontal': 'Puxar horizontal',
  'puxar-vertical': 'Puxar vertical',
  agachamento: 'Agachamento',
  'dobradica-de-quadril': 'Dobradiça de quadril',
  avanco: 'Avanço',
  transporte: 'Transporte',
  rotacao: 'Rotação',
  'anti-rotacao': 'Anti-rotação',
  'anti-extensao': 'Anti-extensão',
  'anti-flexao-lateral': 'Anti-flexão lateral',
  marcha: 'Marcha',
  isolamento: 'Isolamento',
  'postura-mantida': 'Postura mantida',
  nenhum: '—',
}

export type Plano = 'sagital' | 'frontal' | 'transverso' | 'multiplanar'

export interface Atividade {
  id: AtividadeId
  nome: string
  /** Revelado sob demanda, como em Musculo. */
  nomeEn: string
  /** Sinonimos pt-PT/pt-BR/EN — so para busca. */
  outrosNomes: string[]
  tipo: TipoAtividade
  padrao: PadraoMovimento
  plano: Plano
  equipamento: Equipamento[]
  cadeia: 'aberta' | 'fechada' | 'mista'
  dificuldade: 1 | 2 | 3
  unilateral: boolean
  /** Obrigatorio quando `unilateral` — validado em dados.test.ts. */
  notaUnilateral?: string

  // ── Os tres niveis qualitativos. Nunca um score numerico. ──
  primarios: MusculoId[]
  secundarios: MusculoId[]
  estabilizadores: MusculoId[]

  // ── Relacoes posturais, coloridas de forma distinta da ativacao ──
  encurta: MusculoId[]
  inibe: MusculoId[]
  notaPostural?: string
  /** Omitido equivale a 'consenso-fraco'. O modelo das sindromes cruzadas
   *  e um mapa mental util com suporte experimental fino — marcar isso e
   *  a mesma honestidade que exigimos as fichas de queixa. */
  evidenciaPostural?: ForcaEvidencia

  descricao: string
  dicas: string[]
  erros: string[]
  cuidados: string[]
  substituicoes: AtividadeId[]
  fonte?: string
}

// ═══════════════════════════════════════════════════════════════════════
//  Queixa (a UI nunca diz "lesao": isso implicaria um diagnostico)
// ═══════════════════════════════════════════════════════════════════════

export interface Fonte {
  titulo: string
  url?: string
  ano?: number
}

export interface Alegacao<T> {
  valor: T
  evidencia: ForcaEvidencia
  nota?: string
}

export type FaseLesao = 'aguda' | 'geral'

/** Uma regra casa por `atividadeId` (excecao curada) ou por `padrao`
 *  (cobre exercicios ainda nao catalogados). Id explicito ganha ao padrao. */
export interface RegraDeEvitar {
  padrao?: PadraoMovimento
  atividadeId?: AtividadeId
  gravidade: 'evitar' | 'cautela'
  fase: FaseLesao
  condicao?: string
  porque: string
  evidencia: ForcaEvidencia
}

export interface Lesao {
  id: LesaoId
  nome: string
  outrosNomes: string[]
  regiao: RegiaoCorporal
  resumo: string
  /** Renderizado PRIMEIRO em cada ficha, nunca no fim. */
  sinaisDeAlarme: string[]
  fortalecer: Alegacao<MusculoId[]>
  alongarOuMobilizar: Alegacao<MusculoId[]>
  priorizar: Alegacao<AtividadeId[]>
  regras: RegraDeEvitar[]
  notasGerais: string[]
  fontes: Fonte[]
}

// ═══════════════════════════════════════════════════════════════════════
//  O SELO: realce semantico
//  Nada aqui conhece cores, coordenadas ou geometria. E o unico contrato
//  entre a logica pura (src/lib) e o renderizador (src/components/corpo).
// ═══════════════════════════════════════════════════════════════════════

export type NivelAtivacao = 'primario' | 'secundario' | 'estabilizador'

export const NIVEIS: NivelAtivacao[] = ['primario', 'secundario', 'estabilizador']

export const ROTULO_NIVEL: Record<NivelAtivacao, string> = {
  primario: 'Primário',
  secundario: 'Secundário',
  estabilizador: 'Estabilizador',
}

export type TomRealce =
  | NivelAtivacao
  | 'encurta'
  | 'inibe'
  | 'alerta'
  | 'fortalecer'
  | 'lacuna'
  | 'selecionado'
  | 'neutro'

/** Precedencia na fusao de mapas. Maior ganha. */
export const PRECEDENCIA_TOM: Record<TomRealce, number> = {
  alerta: 100,
  selecionado: 90,
  primario: 80,
  fortalecer: 70,
  secundario: 60,
  encurta: 50,
  inibe: 45,
  estabilizador: 40,
  lacuna: 10,
  neutro: 0,
}

export type MotivoRealce =
  | { tipo: 'ativacao'; nivel: NivelAtivacao; atividadeId: AtividadeId }
  | { tipo: 'encurta'; atividadeId: AtividadeId }
  | { tipo: 'inibe'; atividadeId: AtividadeId }
  | { tipo: 'lesao-fortalecer'; lesaoId: LesaoId }
  | { tipo: 'lesao-alongar'; lesaoId: LesaoId }
  | { tipo: 'lesao-alerta'; lesaoId: LesaoId; texto: string }
  | { tipo: 'lacuna'; regiao: RegiaoCorporal }
  | { tipo: 'selecao-direta' }

export interface EstadoRealce {
  tom: TomRealce
  /** 0..1 — so opacidade (2D) ou emissive (3D). Nunca fonte de verdade. */
  intensidade: number
  /** Pronto para tooltip e legenda. */
  rotulo: string
  motivos: MotivoRealce[]
}

export type MapaDeRealce = Map<MusculoId, EstadoRealce>

/** Contrato do renderizador. `CorpoSVG` hoje, `Corpo3D` amanha —
 *  trocar toca so em src/components/corpo/index.ts. */
export interface PropsCorpo {
  vista: Vista
  camada: Camada
  realces: MapaDeRealce
  selecionado: MusculoId | null
  onSelecionar: (id: MusculoId | null) => void
  /** Melhoria progressiva em desktop. Nada pode depender disto. */
  onDestacar?: (id: MusculoId | null) => void
}

export type RenderizadorCorpo = (props: PropsCorpo) => ReactNode

// ═══════════════════════════════════════════════════════════════════════
//  Geometria (2D). Vive so aqui e em src/components/corpo.
// ═══════════════════════════════════════════════════════════════════════

export interface FormaMusculo {
  d: string
}

export type MapaGeometria = Record<MusculoId, FormaMusculo>

export interface MarcoAnatomico {
  nome: string
  x: number
  y: number
}

/** Metade direita apenas: o render espelha com translate(480,0) scale(-1,1). */
export const LARGURA_CORPO = 480
export const ALTURA_CORPO = 1000
export const LINHA_MEDIA = LARGURA_CORPO / 2

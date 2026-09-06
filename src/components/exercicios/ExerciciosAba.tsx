import { useMemo, useState } from 'react'
import { atividades, musculoPorId } from '../../data'
import { FILTRO_VAZIO, filtrarAtividades, filtroAtivo, type FiltroAtividades } from '../../lib/filtros'
import {
  ROTULO_PADRAO,
  ROTULO_TIPO,
  ROTULO_REGIAO,
  REGIOES,
  type Atividade,
  type AtividadeId,
  type Equipamento,
  type PadraoMovimento,
  type TipoAtividade,
} from '../../types'
import { Vazio } from '../shell/Comuns'

const TIPOS = Object.keys(ROTULO_TIPO) as TipoAtividade[]
const PADROES = Object.keys(ROTULO_PADRAO) as PadraoMovimento[]
const EQUIPAMENTOS = [...new Set(atividades.flatMap(a => a.equipamento))]
const NOME_EQUIPAMENTO: Record<Equipamento, string> = {
  nenhum: 'Sem equipamento', 'peso-corporal': 'Peso do corpo', barra: 'Barra', halteres: 'Halteres',
  kettlebell: 'Kettlebell', maquina: 'Máquina', cabos: 'Cabos', elastico: 'Elástico', banco: 'Banco',
  'barra-fixa': 'Barra fixa', bola: 'Bola', tapete: 'Tapete', bicicleta: 'Bicicleta', esteira: 'Esteira', agua: 'Água', reformer: 'Reformer',
}

export function ExerciciosAba({
  realcada,
  sessao,
  onSelecionar,
  onAlternarSessao,
}: {
  /** A que esta pintando o corpo agora — nao a que tem ficha aberta. */
  realcada: AtividadeId | null
  sessao: AtividadeId[]
  onSelecionar: (id: AtividadeId | null) => void
  onAlternarSessao: (id: AtividadeId) => void
}) {
  const [filtro, setFiltro] = useState<FiltroAtividades>(FILTRO_VAZIO)
  const [painelAberto, setPainelAberto] = useState(false)

  const resultado = useMemo(
    () => filtrarAtividades(atividades, filtro, musculoPorId),
    [filtro],
  )

  const alternar = <K extends 'tipos' | 'padroes' | 'equipamentos' | 'regioes'>(
    campo: K,
    valor: FiltroAtividades[K][number],
  ) => {
    setFiltro((f) => {
      const atual = f[campo] as unknown[]
      const proximo = atual.includes(valor)
        ? atual.filter((v) => v !== valor)
        : [...atual, valor]
      return { ...f, [campo]: proximo } as FiltroAtividades
    })
  }

  return (
    <div className="catalogo-treino flex flex-col gap-3">
      <div><h2 className="titulo-treino">Escolha seus exercícios</h2><p className="texto-apoio">Adicione ao treino. Abra os detalhes quando quiser conhecer a execução.</p></div>
      <div className="flex gap-2">
        <input
          className="campo"
          placeholder="Buscar por nome, músculo ou termo em inglês…"
          aria-label="Buscar exercícios"
          value={filtro.busca}
          onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))}
        />
        <button
          type="button"
          onClick={() => setPainelAberto((v) => !v)}
          aria-expanded={painelAberto}
          className={`botao-2 shrink-0 ${filtroAtivo(filtro) ? 'border-accent text-accent' : ''}`}
        >
          Filtros
        </button>
      </div>

      <div className="modalidades-treino" role="group" aria-label="Modalidade">
        <button className="chip" aria-pressed={filtro.tipos.length === 0} onClick={() => setFiltro(f => ({ ...f, tipos: [] }))}>Todas</button>
        {TIPOS.map(tipo => <button className="chip" key={tipo} aria-pressed={filtro.tipos.includes(tipo)} onClick={() => setFiltro(f => ({ ...f, tipos: f.tipos.includes(tipo) ? [] : [tipo] }))}>{ROTULO_TIPO[tipo]}</button>)}
      </div>

      <div className="filtros-principais">
        <label>Região<select value={filtro.regioes[0] ?? ''} onChange={e => setFiltro(f => ({ ...f, regioes: e.target.value ? [e.target.value as typeof REGIOES[number]] : [] }))}><option value="">Todas as regiões</option>{REGIOES.map(r => <option key={r} value={r}>{ROTULO_REGIAO[r]}</option>)}</select></label>
        <label>Equipamento<select value={filtro.equipamentos[0] ?? ''} onChange={e => setFiltro(f => ({ ...f, equipamentos: e.target.value ? [e.target.value as Equipamento] : [] }))}><option value="">Todos os equipamentos</option>{EQUIPAMENTOS.map(e => <option key={e} value={e}>{NOME_EQUIPAMENTO[e]}</option>)}</select></label>
      </div>

      {painelAberto && (
        <div className="cartao space-y-3 p-3">
          <GrupoFiltro
            titulo="Padrão de movimento"
            opcoes={PADROES.filter((p) => p !== 'nenhum').map((p) => ({ valor: p, rotulo: ROTULO_PADRAO[p] }))}
            ativos={filtro.padroes}
            onAlternar={(v) => alternar('padroes', v)}
          />
          {filtroAtivo(filtro) && (
            <button type="button" onClick={() => setFiltro(FILTRO_VAZIO)} className="botao-2 w-full">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      <div className="catalogo-contagem"><p>{resultado.length} de {atividades.length} atividades</p>{filtroAtivo(filtro) && <button className="sublinhado" onClick={() => setFiltro(FILTRO_VAZIO)}>Limpar filtros</button>}</div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {resultado.length === 0 ? (
          <Vazio>Nenhuma atividade corresponde a esses filtros.</Vazio>
        ) : (
          <ul className="space-y-2">
            {resultado.map((a) => (
              <li key={a.id}>
                <CartaoAtividade
                  atividade={a}
                  ativo={a.id === realcada}
                  naSessao={sessao.includes(a.id)}
                  onAbrir={() => onSelecionar(a.id)}
                  onAlternarSessao={() => onAlternarSessao(a.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function CartaoAtividade({
  atividade,
  ativo,
  naSessao,
  onAbrir,
  onAlternarSessao,
}: {
  atividade: Atividade
  ativo: boolean
  naSessao: boolean
  onAbrir: () => void
  onAlternarSessao: () => void
}) {
  const primarios = atividade.primarios
    .map((id) => musculoPorId.get(id)?.nomeCurto)
    .filter(Boolean)
    .join(', ')

  return (
    <div className={`cartao cartao-exercicio ${naSessao ? 'exercicio-adicionado' : ''} ${ativo ? 'border-accent' : ''}`} data-atividade={atividade.id}>
      <div className="min-w-0">
        <h3 className="font-medium text-ink">{atividade.nome}</h3>
        <p className="mt-0.5 truncate text-xs text-muted">
          {ROTULO_PADRAO[atividade.padrao]} · {atividade.equipamento.map(e => NOME_EQUIPAMENTO[e]).join(', ')}
        </p>
        {primarios && (
          <p className="mt-1 truncate text-xs text-ink2">
            <span style={{ color: 'var(--tom-primario)' }}>●</span> {primarios}
          </p>
        )}
      </div>
      <div className="acoes-exercicio">
      <button type="button" onClick={onAbrir} className="detalhes-exercicio" aria-label={`Ver execução e detalhes de ${atividade.nome}`}>Ver execução e detalhes</button>
      <button
        type="button"
        onClick={onAlternarSessao}
        aria-label={`${naSessao ? 'Remover' : 'Adicionar'} ${atividade.nome} ${naSessao ? 'do' : 'ao'} treino`}
        aria-pressed={naSessao}
        className="adicionar-exercicio"
      >
        {naSessao ? '✓ Adicionado' : 'Adicionar ao treino'}
      </button>
      </div>
    </div>
  )
}

function GrupoFiltro<T extends string>({
  titulo,
  opcoes,
  ativos,
  onAlternar,
}: {
  titulo: string
  opcoes: { valor: T; rotulo: string }[]
  ativos: T[]
  onAlternar: (valor: T) => void
}) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">{titulo}</h4>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => onAlternar(o.valor)}
            aria-pressed={ativos.includes(o.valor)}
            className={`chip ${ativos.includes(o.valor) ? 'border-accent text-accent' : 'hover:border-accent'}`}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}

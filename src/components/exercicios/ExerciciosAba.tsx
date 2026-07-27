import { useMemo, useState } from 'react'
import { atividades, musculoPorId } from '../../data'
import { FILTRO_VAZIO, filtrarAtividades, filtroAtivo, type FiltroAtividades } from '../../lib/filtros'
import {
  ROTULO_PADRAO,
  ROTULO_TIPO,
  type Atividade,
  type AtividadeId,
  type Equipamento,
  type PadraoMovimento,
  type TipoAtividade,
} from '../../types'
import { Vazio } from '../shell/Comuns'

const TIPOS = Object.keys(ROTULO_TIPO) as TipoAtividade[]
const PADROES = Object.keys(ROTULO_PADRAO) as PadraoMovimento[]
const EQUIPAMENTOS: Equipamento[] = [
  'peso-corporal', 'nenhum', 'halteres', 'barra', 'maquina', 'cabos',
  'elastico', 'barra-fixa', 'kettlebell', 'tapete', 'banco',
]

export function ExerciciosAba({
  selecionada,
  sessao,
  onSelecionar,
  onAlternarSessao,
}: {
  selecionada: AtividadeId | null
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

  const alternar = <K extends 'tipos' | 'padroes' | 'equipamentos'>(
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
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        <input
          className="campo"
          placeholder="Buscar por nome, músculo ou termo em inglês…"
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

      {painelAberto && (
        <div className="cartao space-y-3 p-3">
          <GrupoFiltro
            titulo="Tipo"
            opcoes={TIPOS.map((t) => ({ valor: t, rotulo: ROTULO_TIPO[t] }))}
            ativos={filtro.tipos}
            onAlternar={(v) => alternar('tipos', v)}
          />
          <GrupoFiltro
            titulo="Padrão de movimento"
            opcoes={PADROES.filter((p) => p !== 'nenhum').map((p) => ({ valor: p, rotulo: ROTULO_PADRAO[p] }))}
            ativos={filtro.padroes}
            onAlternar={(v) => alternar('padroes', v)}
          />
          <GrupoFiltro
            titulo="Equipamento"
            opcoes={EQUIPAMENTOS.map((e) => ({ valor: e, rotulo: e.replace(/-/g, ' ') }))}
            ativos={filtro.equipamentos}
            onAlternar={(v) => alternar('equipamentos', v)}
          />
          {filtroAtivo(filtro) && (
            <button type="button" onClick={() => setFiltro(FILTRO_VAZIO)} className="botao-2 w-full">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-muted">
        {resultado.length} de {atividades.length} atividades
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {resultado.length === 0 ? (
          <Vazio>Nenhuma atividade corresponde a esses filtros.</Vazio>
        ) : (
          <ul className="space-y-2">
            {resultado.map((a) => (
              <li key={a.id}>
                <CartaoAtividade
                  atividade={a}
                  ativo={a.id === selecionada}
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
    <div className={`cartao flex items-stretch ${ativo ? 'border-accent' : ''}`}>
      <button type="button" onClick={onAbrir} className="min-w-0 flex-1 p-3 text-left">
        <p className="truncate font-medium text-ink">{atividade.nome}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {ROTULO_PADRAO[atividade.padrao]} · {atividade.equipamento[0].replace(/-/g, ' ')}
        </p>
        {primarios && (
          <p className="mt-1 truncate text-xs text-ink2">
            <span style={{ color: 'var(--tom-primario)' }}>●</span> {primarios}
          </p>
        )}
      </button>
      <button
        type="button"
        onClick={onAlternarSessao}
        aria-label={naSessao ? 'Remover da sessão' : 'Adicionar à sessão'}
        className={`shrink-0 border-l border-hairline px-4 text-lg ${
          naSessao ? 'text-accent' : 'text-muted hover:text-ink'
        }`}
      >
        {naSessao ? '−' : '+'}
      </button>
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

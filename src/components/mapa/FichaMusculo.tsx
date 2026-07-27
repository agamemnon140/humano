import { agruparPorNivel } from '../../lib/indice'
import { atividadePorId, indicePostural, indiceReverso, musculoPorId } from '../../data'
import { NIVEIS, ROTULO_NIVEL, ROTULO_REGIAO, type AtividadeId, type Musculo, type NivelAtivacao } from '../../types'
import { Folha } from '../shell/Folha'
import { ListaSimples, NomeBilingue, Secao, Vazio } from '../shell/Comuns'

const EXPLICACAO_NIVEL: Record<NivelAtivacao, string> = {
  primario: 'exercícios em que este é o motor do movimento',
  secundario: 'exercícios em que ele assiste',
  estabilizador: 'exercícios em que ele segura a posição',
}

export function FichaMusculo({
  musculo,
  onFechar,
  onAbrirAtividade,
}: {
  musculo: Musculo | null
  onFechar: () => void
  onAbrirAtividade: (id: AtividadeId) => void
}) {
  if (!musculo) return null

  const grupos = agruparPorNivel(indiceReverso.get(musculo.id) ?? [], atividadePorId)
  const encurtam = indicePostural.encurtam.get(musculo.id) ?? []
  const inibem = indicePostural.inibem.get(musculo.id) ?? []
  const antagonistas = musculo.antagonistas.map((id) => musculoPorId.get(id)).filter(Boolean)

  return (
    <Folha
      aberta
      onFechar={onFechar}
      titulo={
        <>
          <NomeBilingue
            nome={musculo.nome}
            nomeEn={musculo.nomeEn}
            nomeLatim={musculo.nomeLatim}
            className="text-lg font-bold"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip">{ROTULO_REGIAO[musculo.regiao]}</span>
            <span className="chip">{musculo.camada === 'profunda' ? 'camada profunda' : 'superficial'}</span>
            {musculo.tendencia && (
              <span className="chip">
                tende a {musculo.tendencia === 'encurtar' ? 'encurtar' : 'ser inibido'}
              </span>
            )}
          </div>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink2">{musculo.funcaoResumo}</p>

      {musculo.acoes.length > 0 && (
        <Secao titulo="O que ele faz">
          <ListaSimples itens={musculo.acoes} />
        </Secao>
      )}

      {/* Tres secções separadas, nunca uma lista misturada: com escala ordinal,
          misturar destroi a unica informacao que existe. */}
      {NIVEIS.map((nivel) => {
        const entradas = grupos[nivel]
        if (entradas.length === 0) return null
        return (
          <Secao key={nivel} titulo={`${ROTULO_NIVEL[nivel]} — ${EXPLICACAO_NIVEL[nivel]}`}>
            <ol className="space-y-1">
              {entradas.map((e, i) => {
                const a = atividadePorId.get(e.atividadeId)
                if (!a) return null
                return (
                  <li key={e.atividadeId}>
                    <button
                      type="button"
                      onClick={() => onAbrirAtividade(e.atividadeId)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface2"
                    >
                      <span className="w-5 shrink-0 text-xs text-muted tabular-nums">{i + 1}.</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{a.nome}</span>
                      <span className="shrink-0 text-[11px] text-muted">{a.equipamento[0]}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </Secao>
        )
      })}

      {grupos.primario.length === 0 &&
        grupos.secundario.length === 0 &&
        grupos.estabilizador.length === 0 && (
          <Vazio>Nenhum exercício do catálogo trabalha este músculo ainda.</Vazio>
        )}

      {/* Onde "ficar sentado" paga o investimento no modelo de dados. */}
      {encurtam.length > 0 && (
        <Secao titulo="Atividades que encurtam este músculo">
          <ListaAtividades ids={encurtam} onAbrir={onAbrirAtividade} />
        </Secao>
      )}
      {inibem.length > 0 && (
        <Secao titulo="Atividades que inibem este músculo">
          <ListaAtividades ids={inibem} onAbrir={onAbrirAtividade} />
        </Secao>
      )}

      {antagonistas.length > 0 && (
        <Secao titulo="Antagonistas">
          <div className="flex flex-wrap gap-1.5">
            {antagonistas.map((m) => (
              <span key={m!.id} className="chip">
                {m!.nomeCurto}
              </span>
            ))}
          </div>
        </Secao>
      )}
    </Folha>
  )
}

function ListaAtividades({
  ids,
  onAbrir,
}: {
  ids: AtividadeId[]
  onAbrir: (id: AtividadeId) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const a = atividadePorId.get(id)
        if (!a) return null
        return (
          <button key={id} type="button" onClick={() => onAbrir(id)} className="chip hover:border-accent">
            {a.nome}
          </button>
        )
      })}
    </div>
  )
}

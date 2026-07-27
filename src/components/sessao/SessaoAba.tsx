import { atividadePorId, lesaoPorId, musculoPorId } from '../../data'
import type { ResultadoSessao } from '../../lib/sessao'
import { ROTULO_REGIAO, type AtividadeId, type LesaoId, type MusculoId } from '../../types'
import { Secao, SeloEvidencia, Vazio } from '../shell/Comuns'

export function SessaoAba({
  sessao,
  resultado,
  lesoesAtivas,
  onAbrirAtividade,
  onAbrirMusculo,
  onRemover,
  onLimpar,
}: {
  sessao: AtividadeId[]
  resultado: ResultadoSessao
  lesoesAtivas: LesaoId[]
  onAbrirAtividade: (id: AtividadeId) => void
  onAbrirMusculo: (id: MusculoId) => void
  onRemover: (id: AtividadeId) => void
  onLimpar: () => void
}) {
  if (sessao.length === 0) {
    return (
      <Vazio>
        Sessão vazia. Adicione exercícios pela aba <strong>Exercícios</strong> e o corpo acende com a
        cobertura somada — mostrando o que ficou de fora, o que está sobrecarregado e o que conflita
        com uma queixa ativa.
      </Vazio>
    )
  }

  const conflitosPorAtividade = new Map<AtividadeId, typeof resultado.conflitos>()
  for (const c of resultado.conflitos) {
    const atual = conflitosPorAtividade.get(c.atividadeId) ?? []
    conflitosPorAtividade.set(c.atividadeId, [...atual, c])
  }

  const sugestoes = resultado.avisos.filter((a) => a.tipo === 'sugestao-da-lesao')
  const desequilibrio = resultado.avisos.find((a) => a.tipo === 'desequilibrio-empurrar-puxar')
  const semPosterior = resultado.avisos.some((a) => a.tipo === 'sem-cadeia-posterior')

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {sessao.length} {sessao.length === 1 ? 'exercício' : 'exercícios'} ·{' '}
          {resultado.cobertura.size} músculos tocados
        </p>
        <button type="button" onClick={onLimpar} className="text-xs text-muted hover:text-ink">
          limpar
        </button>
      </div>

      <ul className="mt-2 space-y-2">
        {sessao.map((id) => {
          const a = atividadePorId.get(id)
          if (!a) return null
          const conflitos = conflitosPorAtividade.get(id) ?? []
          const pior = conflitos.find((c) => c.gravidade === 'evitar') ?? conflitos[0]
          return (
            <li key={id}>
              <div
                className={`cartao flex items-stretch ${
                  pior ? (pior.gravidade === 'evitar' ? 'border-bad' : 'border-warn') : ''
                }`}
              >
                <button type="button" onClick={() => onAbrirAtividade(id)} className="min-w-0 flex-1 p-3 text-left">
                  <p className="truncate font-medium text-ink">{a.nome}</p>
                  {pior && (
                    <p
                      className={`mt-1 text-xs ${pior.gravidade === 'evitar' ? 'text-bad' : 'text-warn'}`}
                    >
                      <strong>{pior.gravidade === 'evitar' ? 'Evitar' : 'Cautela'}</strong>
                      {' · '}
                      {lesaoPorId.get(pior.lesaoId)?.nome}
                      {pior.origem === 'padrao-de-risco' ? ' (padrão de risco)' : ''}
                    </p>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onRemover(id)}
                  aria-label={`Remover ${a.nome}`}
                  className="shrink-0 border-l border-hairline px-4 text-lg text-muted hover:text-ink"
                >
                  −
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {resultado.conflitos.length > 0 && (
        <Secao titulo={`Conflitos com queixa ativa (${resultado.conflitos.length})`}>
          <ul className="space-y-2">
            {resultado.conflitos.map((c, i) => (
              <li
                key={`${c.atividadeId}-${c.lesaoId}-${i}`}
                className={`cartao p-3 ${c.gravidade === 'evitar' ? 'border-bad/50' : 'border-warn/50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${c.gravidade === 'evitar' ? 'text-bad' : 'text-warn'}`}>
                    {atividadePorId.get(c.atividadeId)?.nome}
                    {c.condicao ? <span className="font-normal text-muted"> — {c.condicao}</span> : null}
                  </p>
                  <SeloEvidencia evidencia={c.evidencia} />
                </div>
                <p className="mt-1 text-sm text-ink2">{c.texto}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {lesaoPorId.get(c.lesaoId)?.nome} ·{' '}
                  {c.origem === 'atividade-listada' ? 'regra específica deste exercício' : 'regra do padrão de movimento'}
                </p>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* O ecrã não pode só dizer não. */}
      {sugestoes.length > 0 && (
        <Secao titulo="A queixa recomenda, e não está na sessão">
          {sugestoes.map((s) =>
            s.tipo === 'sugestao-da-lesao' ? (
              <div key={s.lesaoId} className="flex flex-wrap gap-1.5">
                {s.atividadeIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onAbrirAtividade(id)}
                    className="chip hover:border-accent"
                  >
                    + {atividadePorId.get(id)?.nome}
                  </button>
                ))}
              </div>
            ) : null,
          )}
        </Secao>
      )}

      {resultado.sobrecarregados.length > 0 && (
        <Secao titulo="Sobrecarregados">
          <ul className="space-y-1.5">
            {resultado.sobrecarregados.map((id) => {
              const c = resultado.cobertura.get(id)
              const nomes = (c?.atividades ?? [])
                .map((a) => atividadePorId.get(a)?.nome)
                .filter(Boolean)
                .join(', ')
              return (
                <li key={id} className="text-sm">
                  <button type="button" onClick={() => onAbrirMusculo(id)} className="font-medium text-ink hover:text-accent">
                    {musculoPorId.get(id)?.nomeCurto}
                  </button>
                  {/* Sempre com os nomes que contribuem, para a correção ficar a um toque. */}
                  <span className="text-muted"> — {nomes}</span>
                </li>
              )
            })}
          </ul>
        </Secao>
      )}

      {resultado.regioesDescobertas.length > 0 && (
        <Secao titulo="Regiões sem trabalho">
          {/* Ao nível da região, não como quarenta músculos numa lista de celular. */}
          <div className="flex flex-wrap gap-1.5">
            {resultado.regioesDescobertas.map((r) => (
              <span key={r} className="chip">
                {ROTULO_REGIAO[r]}
              </span>
            ))}
          </div>
        </Secao>
      )}

      {(desequilibrio || semPosterior) && (
        <Secao titulo="Equilíbrio">
          <ul className="space-y-1.5 text-sm text-ink2">
            {desequilibrio && desequilibrio.tipo === 'desequilibrio-empurrar-puxar' && (
              <li>
                Empurrar {desequilibrio.empurrar} × puxar {desequilibrio.puxar}. Vale equilibrar.
              </li>
            )}
            {semPosterior && <li>Nenhum exercício carrega a cadeia posterior (glúteos e posteriores de coxa).</li>}
          </ul>
        </Secao>
      )}

      {resultado.encurtados.length > 0 && (
        <Secao titulo="Tendem a encurtar com esta sessão">
          <div className="flex flex-wrap gap-1.5">
            {resultado.encurtados.map((id) => (
              <button key={id} type="button" onClick={() => onAbrirMusculo(id)} className="chip hover:border-accent">
                {musculoPorId.get(id)?.nomeCurto}
              </button>
            ))}
          </div>
        </Secao>
      )}

      {lesoesAtivas.length === 0 && (
        <p className="mt-5 text-xs text-muted">
          Nenhuma queixa marcada como ativa. Marque uma na aba Queixas para ver conflitos aqui.
        </p>
      )}
    </div>
  )
}

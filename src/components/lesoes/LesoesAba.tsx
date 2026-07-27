import { atividadePorId, lesoes, musculoPorId } from '../../data'
import { ROTULO_REGIAO, type AtividadeId, type Lesao, type LesaoId, type MusculoId } from '../../types'
import { Folha } from '../shell/Folha'
import { AvisoLegal, ListaSimples, Secao, SeloEvidencia } from '../shell/Comuns'

export function LesoesAba({
  ativas,
  onSelecionar,
  onAlternarAtiva,
}: {
  ativas: LesaoId[]
  onSelecionar: (id: LesaoId | null) => void
  onAlternarAtiva: (id: LesaoId) => void
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      <AvisoLegal />

      <p className="text-xs text-muted">
        Marque uma queixa como ativa para que o construtor de sessão avise sobre conflitos.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {lesoes.map((l) => {
            const ativa = ativas.includes(l.id)
            return (
              <li key={l.id}>
                <div className={`cartao flex items-stretch ${ativa ? 'border-accent' : ''}`}>
                  <button
                    type="button"
                    onClick={() => onSelecionar(l.id)}
                    className="min-w-0 flex-1 p-3 text-left"
                  >
                    <p className="truncate font-medium text-ink">{l.nome}</p>
                    <p className="mt-0.5 text-xs text-muted">{ROTULO_REGIAO[l.regiao]}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAlternarAtiva(l.id)}
                    aria-pressed={ativa}
                    className={`shrink-0 border-l border-hairline px-3 text-[11px] font-medium ${
                      ativa ? 'text-accent' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {ativa ? 'ativa' : 'marcar'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export function FichaLesao({
  lesao,
  onFechar,
  onAbrirAtividade,
  onAbrirMusculo,
}: {
  lesao: Lesao | null
  onFechar: () => void
  onAbrirAtividade: (id: AtividadeId) => void
  onAbrirMusculo: (id: MusculoId) => void
}) {
  if (!lesao) return null

  const evitar = lesao.regras.filter((r) => r.gravidade === 'evitar')
  const cautela = lesao.regras.filter((r) => r.gravidade === 'cautela')

  return (
    <Folha
      aberta
      onFechar={onFechar}
      titulo={
        <>
          <h2 className="text-lg font-bold">{lesao.nome}</h2>
          <p className="mt-0.5 text-xs text-muted">{ROTULO_REGIAO[lesao.regiao]}</p>
        </>
      }
    >
      {/* Sinais de alarme vêm PRIMEIRO em toda ficha, nunca no rodapé. */}
      <div className="rounded-lg border-2 border-bad/40 bg-bad/10 p-3">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-bad">
          <span aria-hidden>⚠</span> Procure um médico se tiver
        </h3>
        <ul className="space-y-1.5 text-sm text-ink2">
          {lesao.sinaisDeAlarme.map((s) => (
            <li key={s} className="flex gap-2">
              <span aria-hidden className="shrink-0 text-bad">
                ·
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <AvisoLegal compacto />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink2">{lesao.resumo}</p>

      <Secao
        titulo="Músculos a fortalecer"
        acessorio={<SeloEvidencia evidencia={lesao.fortalecer.evidencia} nota={lesao.fortalecer.nota} />}
      >
        <Chips ids={lesao.fortalecer.valor} onAbrir={onAbrirMusculo} cor="var(--tom-fortalecer)" />
        {lesao.fortalecer.nota && <p className="mt-2 text-xs text-muted">{lesao.fortalecer.nota}</p>}
      </Secao>

      {lesao.alongarOuMobilizar.valor.length > 0 && (
        <Secao
          titulo="Músculos a alongar ou mobilizar"
          acessorio={<SeloEvidencia evidencia={lesao.alongarOuMobilizar.evidencia} />}
        >
          <Chips ids={lesao.alongarOuMobilizar.valor} onAbrir={onAbrirMusculo} cor="var(--tom-encurta)" />
          {lesao.alongarOuMobilizar.nota && (
            <p className="mt-2 text-xs text-muted">{lesao.alongarOuMobilizar.nota}</p>
          )}
        </Secao>
      )}

      <Secao
        titulo="O que costuma ajudar"
        acessorio={<SeloEvidencia evidencia={lesao.priorizar.evidencia} nota={lesao.priorizar.nota} />}
      >
        <div className="flex flex-wrap gap-1.5">
          {lesao.priorizar.valor.map((id) => {
            const a = atividadePorId.get(id)
            if (!a) return null
            return (
              <button key={id} type="button" onClick={() => onAbrirAtividade(id)} className="chip hover:border-accent">
                {a.nome}
              </button>
            )
          })}
        </div>
        {lesao.priorizar.nota && <p className="mt-2 text-xs text-muted">{lesao.priorizar.nota}</p>}
      </Secao>

      {evitar.length > 0 && (
        <Secao titulo="Evitar na fase aguda">
          <ListaRegras regras={evitar} tom="bad" />
        </Secao>
      )}
      {cautela.length > 0 && (
        <Secao titulo="Com cautela">
          <ListaRegras regras={cautela} tom="warn" />
        </Secao>
      )}

      {lesao.notasGerais.length > 0 && (
        <Secao titulo="Vale saber">
          <ListaSimples itens={lesao.notasGerais} />
        </Secao>
      )}

      <Secao titulo="Fontes">
        <ul className="space-y-1 text-xs text-muted">
          {lesao.fontes.map((f) => (
            <li key={f.titulo}>
              {f.titulo}
              {f.ano ? ` (${f.ano})` : ''}
            </li>
          ))}
        </ul>
      </Secao>
    </Folha>
  )
}

function ListaRegras({ regras, tom }: { regras: Lesao['regras']; tom: 'bad' | 'warn' }) {
  return (
    <ul className="space-y-2">
      {regras.map((r, i) => (
        <li key={`${r.atividadeId ?? r.padrao}-${i}`} className="cartao p-3">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${tom === 'bad' ? 'text-bad' : 'text-warn'}`}>
              {r.atividadeId ? (atividadePorId.get(r.atividadeId)?.nome ?? r.atividadeId) : rotularPadrao(r.padrao)}
              {r.condicao ? <span className="font-normal text-muted"> — {r.condicao}</span> : null}
            </p>
            <SeloEvidencia evidencia={r.evidencia} />
          </div>
          <p className="mt-1 text-sm text-ink2">{r.porque}</p>
        </li>
      ))}
    </ul>
  )
}

function rotularPadrao(padrao?: string): string {
  return padrao ? `Todo exercício de ${padrao.replace(/-/g, ' ')}` : 'Regra geral'
}

function Chips({
  ids,
  onAbrir,
  cor,
}: {
  ids: MusculoId[]
  onAbrir: (id: MusculoId) => void
  cor: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const m = musculoPorId.get(id)
        if (!m) return null
        return (
          <button key={id} type="button" onClick={() => onAbrir(id)} className="chip hover:border-accent">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: cor }} />
            {m.nomeCurto}
          </button>
        )
      })}
    </div>
  )
}

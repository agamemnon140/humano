import { atividadePorId, musculoPorId } from '../../data'
import {
  NIVEIS,
  ROTULO_NIVEL,
  ROTULO_PADRAO,
  ROTULO_TIPO,
  type Atividade,
  type AtividadeId,
  type MusculoId,
} from '../../types'
import { Folha } from '../shell/Folha'
import { ListaSimples, NomeBilingue, Secao, SeloEvidencia } from '../shell/Comuns'

export function FichaAtividade({
  atividade,
  naSessao,
  onFechar,
  onAlternarSessao,
  onAbrirAtividade,
  onAbrirMusculo,
}: {
  atividade: Atividade | null
  naSessao: boolean
  onFechar: () => void
  onAlternarSessao: (id: AtividadeId) => void
  onAbrirAtividade: (id: AtividadeId) => void
  onAbrirMusculo: (id: MusculoId) => void
}) {
  if (!atividade) return null

  const porNivel: Record<string, MusculoId[]> = {
    primario: atividade.primarios,
    secundario: atividade.secundarios,
    estabilizador: atividade.estabilizadores,
  }

  return (
    <Folha
      aberta
      onFechar={onFechar}
      titulo={
        <>
          <NomeBilingue nome={atividade.nome} nomeEn={atividade.nomeEn} className="text-lg font-bold" />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip">{ROTULO_TIPO[atividade.tipo]}</span>
            <span className="chip">{ROTULO_PADRAO[atividade.padrao]}</span>
            <span className="chip">{'●'.repeat(atividade.dificuldade)}</span>
            {atividade.unilateral && <span className="chip">unilateral</span>}
          </div>
        </>
      }
    >
      <button
        type="button"
        onClick={() => onAlternarSessao(atividade.id)}
        className={naSessao ? 'botao-2 w-full' : 'botao w-full'}
      >
        {naSessao ? '− Remover da sessão' : '+ Adicionar à sessão'}
      </button>

      <p className="mt-4 text-sm leading-relaxed text-ink2">{atividade.descricao}</p>

      {atividade.unilateral && atividade.notaUnilateral && (
        <p className="mt-3 rounded-lg border border-hairline bg-surface2 p-3 text-sm text-ink2">
          <strong className="font-semibold text-ink">Unilateral. </strong>
          {atividade.notaUnilateral}
        </p>
      )}

      {NIVEIS.map((nivel) => {
        const ids = porNivel[nivel]
        if (ids.length === 0) return null
        return (
          <Secao key={nivel} titulo={ROTULO_NIVEL[nivel]}>
            <ChipsMusculo ids={ids} onAbrir={onAbrirMusculo} tom={nivel} />
          </Secao>
        )
      })}

      {(atividade.encurta.length > 0 || atividade.inibe.length > 0) && (
        <Secao
          titulo="Efeito postural"
          acessorio={<SeloEvidencia evidencia={atividade.evidenciaPostural ?? 'consenso-fraco'} />}
        >
          {atividade.encurta.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs text-muted">Tende a encurtar</p>
              <ChipsMusculo ids={atividade.encurta} onAbrir={onAbrirMusculo} tom="encurta" />
            </div>
          )}
          {atividade.inibe.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs text-muted">Tende a inibir</p>
              <ChipsMusculo ids={atividade.inibe} onAbrir={onAbrirMusculo} tom="inibe" />
            </div>
          )}
          {atividade.notaPostural && (
            <p className="mt-2 text-sm leading-relaxed text-ink2">{atividade.notaPostural}</p>
          )}
        </Secao>
      )}

      {atividade.dicas.length > 0 && (
        <Secao titulo="Como fazer bem">
          <ListaSimples itens={atividade.dicas} marcador="→" />
        </Secao>
      )}
      {atividade.erros.length > 0 && (
        <Secao titulo="Erros comuns">
          <ListaSimples itens={atividade.erros} marcador="×" />
        </Secao>
      )}
      {atividade.cuidados.length > 0 && (
        <Secao titulo="Cuidados">
          <ListaSimples itens={atividade.cuidados} marcador="!" />
        </Secao>
      )}

      {atividade.substituicoes.length > 0 && (
        <Secao titulo="Alternativas">
          <div className="flex flex-wrap gap-1.5">
            {atividade.substituicoes.map((id) => {
              const outra = atividadePorId.get(id)
              if (!outra) return null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onAbrirAtividade(id)}
                  className="chip hover:border-accent"
                >
                  {outra.nome}
                </button>
              )
            })}
          </div>
        </Secao>
      )}
    </Folha>
  )
}

const COR_TOM: Record<string, string> = {
  primario: 'var(--tom-primario)',
  secundario: 'var(--tom-secundario)',
  estabilizador: 'var(--tom-estabilizador)',
  encurta: 'var(--tom-encurta)',
  inibe: 'var(--tom-inibe)',
}

function ChipsMusculo({
  ids,
  onAbrir,
  tom,
}: {
  ids: MusculoId[]
  onAbrir: (id: MusculoId) => void
  tom: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const m = musculoPorId.get(id)
        if (!m) return null
        return (
          <button key={id} type="button" onClick={() => onAbrir(id)} className="chip hover:border-accent">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: COR_TOM[tom] ?? 'var(--muted)' }}
            />
            {m.nomeCurto}
          </button>
        )
      })}
    </div>
  )
}

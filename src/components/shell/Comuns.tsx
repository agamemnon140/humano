import { useState, type ReactNode } from 'react'
import type { ForcaEvidencia } from '../../types'

export function AvisoLegal({ compacto = false }: { compacto?: boolean }) {
  return (
    <p
      className={`text-muted ${compacto ? 'text-[11px]' : 'rounded-lg border border-hairline bg-surface2 p-3 text-xs'}`}
    >
      Conteúdo educativo, não é diagnóstico nem prescrição. Nenhuma parte desta aplicação substitui a
      avaliação de um profissional de saúde que possa examinar você.
    </p>
  )
}

export function SeloEvidencia({ evidencia, nota }: { evidencia: ForcaEvidencia; nota?: string }) {
  const forte = evidencia === 'consenso-forte'
  return (
    <span
      title={nota ?? (forte ? 'Consenso forte na literatura' : 'Suporte limitado ou debatido')}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        forte ? 'bg-good/15 text-good' : 'bg-warn/15 text-warn'
      }`}
    >
      {forte ? 'consenso forte' : 'evidência fraca'}
    </span>
  )
}

/** Nome em pt-BR por omissao; ingles e latim so aparecem sob demanda —
 *  duplo clique no desktop, toque simples no telemovel. */
export function NomeBilingue({
  nome,
  nomeEn,
  nomeLatim,
  className = '',
}: {
  nome: string
  nomeEn: string
  nomeLatim?: string
  className?: string
}) {
  const [revelado, setRevelado] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setRevelado((v) => !v)}
      onDoubleClick={() => setRevelado(true)}
      title="Toque para ver o nome em inglês"
      className={`block text-left ${className}`}
    >
      <span className="block">{nome}</span>
      {revelado && (
        <span className="mt-0.5 block text-xs font-normal text-muted">
          {nomeEn}
          {nomeLatim ? ` · ${nomeLatim}` : ''}
        </span>
      )}
    </button>
  )
}

export function Secao({
  titulo,
  acessorio,
  children,
}: {
  titulo: string
  acessorio?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{titulo}</h3>
        {acessorio}
      </div>
      {children}
    </section>
  )
}

export function ListaSimples({ itens, marcador = '·' }: { itens: string[]; marcador?: string }) {
  if (itens.length === 0) return null
  return (
    <ul className="space-y-1.5 text-sm text-ink2">
      {itens.map((t) => (
        <li key={t} className="flex gap-2">
          <span aria-hidden className="shrink-0 text-muted">
            {marcador}
          </span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>
}

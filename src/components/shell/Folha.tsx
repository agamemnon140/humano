import { useEffect, useId, type ReactNode } from 'react'

/** Bottom sheet no telemovel, painel lateral no desktop. E o recipiente de
 *  todas as fichas de detalhe. */
export function Folha({
  aberta,
  titulo,
  onFechar,
  children,
}: {
  aberta: boolean
  titulo: ReactNode
  onFechar: () => void
  children: ReactNode
}) {
  const idTitulo = useId()

  useEffect(() => {
    if (!aberta) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberta, onFechar])

  if (!aberta) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/50"
        onClick={onFechar}
      />
      {/* Um leitor de ecra tem de saber que isto e uma camada por cima da
          pagina, e nao mais conteudo no fim dela. O nome vem do proprio
          titulo da ficha, que ja diz de que musculo ou exercicio se trata. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="relative flex max-h-[85dvh] w-full flex-col rounded-t-2xl border border-hairline bg-surface shadow-2xl md:max-h-[85dvh] md:max-w-2xl md:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-hairline p-4">
          <div id={idTitulo} className="min-w-0 flex-1">
            {titulo}
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="-mt-1 shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-muted hover:text-ink"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}

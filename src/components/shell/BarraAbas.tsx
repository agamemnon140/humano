import { ABAS, ICONE_ABA, ROTULO_ABA, type AbaId } from '../../hooks/useAbaHash'

export function BarraAbas({
  aba,
  onAba,
  contagemSessao,
}: {
  aba: AbaId
  onAba: (a: AbaId) => void
  contagemSessao: number
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] md:static md:w-52 md:shrink-0 md:flex-col md:gap-1 md:border-t-0 md:border-r md:p-4 md:pb-4"
    >
      <div className="hidden md:mb-4 md:flex md:items-center md:gap-2 md:px-2">
        <span aria-hidden className="text-lg">
          ◍
        </span>
        <span className="text-base font-bold">humano</span>
      </div>
      {ABAS.map((id) => {
        const ativo = id === aba
        return (
          <button
            key={id}
            type="button"
            onClick={() => onAba(id)}
            aria-current={ativo ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-medium md:flex-none md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2 md:text-sm ${
              ativo ? 'text-accent md:bg-accent/10' : 'text-muted md:text-ink2 md:hover:text-ink'
            }`}
          >
            <span aria-hidden className="relative text-base leading-none md:w-5 md:text-center">
              {ICONE_ABA[id]}
              {id === 'sessao' && contagemSessao > 0 && (
                <span className="absolute -top-1.5 -right-2 rounded-full bg-accent px-1 text-[9px] leading-tight font-bold text-white">
                  {contagemSessao}
                </span>
              )}
            </span>
            {ROTULO_ABA[id]}
          </button>
        )
      })}
    </nav>
  )
}

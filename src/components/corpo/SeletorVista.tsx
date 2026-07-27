import type { Camada, Vista } from '../../types'

interface Props {
  vista: Vista
  camada: Camada
  onVista: (v: Vista) => void
  onCamada: (c: Camada) => void
}

export function SeletorVista({ vista, camada, onVista, onCamada }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Grupo>
        <Opcao ativo={vista === 'frente'} onClick={() => onVista('frente')}>
          Frente
        </Opcao>
        <Opcao ativo={vista === 'costas'} onClick={() => onVista('costas')}>
          Costas
        </Opcao>
      </Grupo>
      <Grupo>
        <Opcao ativo={camada === 'superficial'} onClick={() => onCamada('superficial')}>
          Superficial
        </Opcao>
        <Opcao ativo={camada === 'profunda'} onClick={() => onCamada('profunda')}>
          Profunda
        </Opcao>
      </Grupo>
    </div>
  )
}

function Grupo({ children }: { children: React.ReactNode }) {
  return <div className="flex rounded-lg border border-hairline bg-surface p-0.5">{children}</div>
}

function Opcao({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        ativo ? 'bg-accent text-white' : 'text-ink2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

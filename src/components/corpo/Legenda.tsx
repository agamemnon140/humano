import type { TomRealce } from '../../types'
import { ROTULO_TOM } from '../../lib/realce'

const COR: Partial<Record<TomRealce, string>> = {
  primario: 'var(--tom-primario)',
  secundario: 'var(--tom-secundario)',
  estabilizador: 'var(--tom-estabilizador)',
  encurta: 'var(--tom-encurta)',
  inibe: 'var(--tom-inibe)',
  fortalecer: 'var(--tom-fortalecer)',
  alerta: 'var(--tom-alerta)',
}

const EXPLICACAO: Partial<Record<TomRealce, string>> = {
  primario: 'faz o movimento',
  secundario: 'assiste',
  estabilizador: 'segura a posição',
  encurta: 'fica em posição encurtada',
  inibe: 'deixa de ser recrutado',
  fortalecer: 'recomendado pela queixa',
  alerta: 'conflito com a queixa ativa',
}

export function Legenda({ tons }: { tons: TomRealce[] }) {
  const presentes = tons.filter((t) => COR[t])
  if (presentes.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs">
      {presentes.map((tom) => (
        <li key={tom} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: COR[tom] }}
          />
          <span className="font-medium text-ink">{ROTULO_TOM[tom]}</span>
          <span className="text-muted">{EXPLICACAO[tom]}</span>
        </li>
      ))}
    </ul>
  )
}

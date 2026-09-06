import { useRef, useState, type ReactNode } from 'react'
import type { AtividadeId, LesaoId, MusculoId } from '../../types'
import type { ResultadoSessao } from '../../lib/sessao'
import { ExerciciosAba } from '../exercicios/ExerciciosAba'
import { SessaoAba } from './SessaoAba'

interface Props {
  sessao: AtividadeId[]
  resultado: ResultadoSessao
  lesoesAtivas: LesaoId[]
  realcada: AtividadeId | null
  onAbrirAtividade: (id: AtividadeId | null) => void
  onAbrirMusculo: (id: MusculoId | null) => void
  onAlternar: (id: AtividadeId) => void
  onLimpar: () => void
  onCenario: () => void
  corpo: ReactNode
}

export function TreinoAba(p: Props) {
  const revisao = useRef<HTMLDetailsElement>(null)
  const [mostrarCorpo, setMostrarCorpo] = useState(() => window.matchMedia('(min-width: 1100px)').matches)
  const quantidade = `${p.sessao.length} ${p.sessao.length === 1 ? 'exercício selecionado' : 'exercícios selecionados'}`
  const revisar = () => {
    if (!revisao.current) return
    revisao.current.open = true
    revisao.current.scrollIntoView({ behavior: 'instant', block: 'start' })
    revisao.current.querySelector('summary')?.focus()
  }
  return <div className="meu-treino">
    <div className="treino-catalogo"><ExerciciosAba realcada={p.realcada} sessao={p.sessao} onSelecionar={p.onAbrirAtividade} onAlternarSessao={p.onAlternar} /></div>
    <aside className="treino-resumo" aria-label="Resumo do meu treino">
      <details className="treino-revisao" ref={revisao}>
        <summary><span>Selecionados <strong>{p.sessao.length}</strong></span><span>Revisar treino</span></summary>
        <div className="treino-revisao-conteudo"><SessaoAba sessao={p.sessao} resultado={p.resultado} lesoesAtivas={p.lesoesAtivas} onAbrirAtividade={p.onAbrirAtividade} onAbrirMusculo={p.onAbrirMusculo} onRemover={p.onAlternar} onLimpar={p.onLimpar} /></div>
      </details>
      <details className="treino-previa" open={mostrarCorpo} onToggle={e => setMostrarCorpo(e.currentTarget.open)}>
        <summary>Ver músculos trabalhados</summary>
        <p className="texto-apoio">Seu treino trabalha estas regiões. As cores mostram a participação de cada músculo.</p>
        {mostrarCorpo && p.corpo}
      </details>
      <p className="treino-proximo">Depois de escolher os exercícios, explore sua meta de composição no cenário.</p>
    </aside>
    <div className="treino-continuar">
      <button className="revisar-selecionados" onClick={revisar}><span aria-live="polite">{quantidade}</span><small>Revisar seleção</small></button>
      <button className="botao" onClick={p.onCenario}>Ver meu cenário <span aria-hidden="true">→</span></button>
    </div>
  </div>
}

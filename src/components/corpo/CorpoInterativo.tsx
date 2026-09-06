import { lazy, Suspense, useState } from 'react'
import type { PropsCorpo } from '../../types'
import { CorpoSVG } from './CorpoSVG'
import { musculosSemModelo } from '../../lib/atlas'
import { musculoPorId } from '../../data'
import { useArmazenado } from '../../hooks/useArmazenado'
import { Limite3D } from './Limite3D'

const CenaCorpo = lazy(() => import('./CenaCorpo'))

export function CorpoInterativo(props: PropsCorpo) {
  const [modo, setModo] = useArmazenado<'2d' | '3d'>('humano.visual', '3d')
  const [falhou, setFalhou] = useState(false)
  const ausente = !!props.selecionado && musculosSemModelo.has(props.selecionado)
  const mostrar3D = modo === '3d' && !falhou && !ausente
  const realcesAusentes = [...props.realces.keys()].filter(id => musculosSemModelo.has(id))
  return <div className="corpo-interativo">
    <div className="corpo-toolbar">
      <span className="eyebrow">{mostrar3D ? 'Atlas anatômico' : 'Mapa muscular'}</span>
      <div className="segmentado" aria-label="Visualização do corpo">
        <button aria-pressed={modo === '3d'} onClick={() => { setModo('3d'); setFalhou(false) }}>3D</button>
        <button aria-pressed={modo === '2d'} onClick={() => setModo('2d')}>2D</button>
      </div>
    </div>
    <div className="corpo-palco">
      {mostrar3D ? <Limite3D fallback={<CorpoSVG {...props} />}><Suspense fallback={<div className="cena-status" role="status">Preparando visual 3D…</div>}><CenaCorpo {...props} onFalha={() => setFalhou(true)} /></Suspense></Limite3D> : <CorpoSVG {...props} />}
      {mostrar3D && <span className="corpo-gesto">Arraste para girar · aproxime para explorar</span>}
    </div>
    {modo === '3d' && (falhou || ausente) && <p className="nota-modelo" role="status">{falhou ? 'O 3D não carregou. Mapa 2D disponível.' : 'Este músculo não está no modelo 3D. Exibindo sua representação em 2D.'}</p>}
    {mostrar3D && realcesAusentes.length > 0 && <p className="nota-modelo">Sem geometria 3D: {realcesAusentes.map(id => musculoPorId.get(id)?.nomeCurto).join(', ')}. <button onClick={() => setModo('2d')} className="sublinhado">Ver cobertura completa em 2D</button>.</p>}
    {mostrar3D && <a className="creditos-atlas" href={`${import.meta.env.BASE_URL}atlas-creditos.txt`} target="_blank" rel="noreferrer">BodyParts3D / Human Atlas · referência masculina · créditos</a>}
  </div>
}

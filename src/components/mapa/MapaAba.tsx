import { useMemo, useState, type ReactNode } from 'react'
import { musculos, musculoPorId } from '../../data'
import { filtrarMusculos } from '../../lib/filtros'
import { ROTULO_REGIAO, REGIOES, type Camada, type MapaDeRealce, type MusculoId, type Vista } from '../../types'
import { Corpo } from '../corpo'
import { Legenda } from '../corpo/Legenda'
import { SeletorVista } from '../corpo/SeletorVista'
import { Vazio } from '../shell/Comuns'

export function MapaAba({
  vista,
  camada,
  onVista,
  onCamada,
  selecionado,
  onSelecionar,
  realces,
  faixa,
}: {
  vista: Vista
  camada: Camada
  onVista: (v: Vista) => void
  onCamada: (c: Camada) => void
  selecionado: MusculoId | null
  onSelecionar: (id: MusculoId | null) => void
  realces: MapaDeRealce
  faixa?: ReactNode
}) {
  const [busca, setBusca] = useState('')
  const [mostrarLista, setMostrarLista] = useState(false)

  const visiveis = useMemo(
    () => musculos.filter((m) => m.vistas.includes(vista) && m.camada === camada),
    [vista, camada],
  )
  const encontrados = useMemo(() => filtrarMusculos(visiveis, busca), [visiveis, busca])

  return (
    <div className="flex h-full flex-col gap-3">
      {faixa}
      <SeletorVista vista={vista} camada={camada} onVista={onVista} onCamada={onCamada} />

      <div className="min-h-0 flex-1">
        <Corpo
          vista={vista}
          camada={camada}
          realces={realces}
          selecionado={selecionado}
          onSelecionar={onSelecionar}
        />
      </div>

      <Legenda tons={[...new Set([...realces.values()].map((e) => e.tom))]} />

      {/* A lista alternativa faz tudo o que o mapa faz. Serve quem nao consegue
          acertar num musculo pequeno por toque, leitor de ecra, e tambem como
          indice navegavel. */}
      <div>
        <button
          type="button"
          onClick={() => setMostrarLista((v) => !v)}
          aria-expanded={mostrarLista}
          className="botao-2 w-full"
        >
          {mostrarLista ? 'Esconder lista' : `Lista de músculos (${visiveis.length})`}
        </button>

        {mostrarLista && (
          <div className="mt-2">
            <input
              className="campo"
              placeholder="Buscar músculo…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="mt-2 max-h-64 overflow-y-auto">
              {encontrados.length === 0 ? (
                <Vazio>Nenhum músculo encontrado.</Vazio>
              ) : (
                REGIOES.filter((r) => encontrados.some((m) => m.regiao === r)).map((regiao) => (
                  <div key={regiao} className="mb-3">
                    <h4 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
                      {ROTULO_REGIAO[regiao]}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {encontrados
                        .filter((m) => m.regiao === regiao)
                        .map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onSelecionar(m.id)}
                            className={`chip hover:border-accent ${
                              m.id === selecionado ? 'border-accent text-accent' : ''
                            }`}
                          >
                            {m.nomeCurto}
                          </button>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {selecionado && !musculoPorId.get(selecionado)?.vistas.includes(vista) && (
        <p className="text-center text-xs text-muted">
          {musculoPorId.get(selecionado)?.nomeCurto} não é visível nesta vista.
        </p>
      )}
    </div>
  )
}

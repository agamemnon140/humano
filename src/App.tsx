import { useCallback, useMemo, useState } from 'react'
import { atividadePorId, catalogo, lesaoPorId, musculoPorId } from './data'
import { useAbaHash, ROTULO_ABA } from './hooks/useAbaHash'
import { useArmazenado } from './hooks/useArmazenado'
import { fundirRealces, realceDeAtividade, realceDeLesao, realceDeMusculo } from './lib/realce'
import { analisarSessao, realceDeSessao } from './lib/sessao'
import type { AtividadeId, Camada, LesaoId, MapaDeRealce, MusculoId, Vista } from './types'
import { Corpo } from './components/corpo'
import { Legenda } from './components/corpo/Legenda'
import { SeletorVista } from './components/corpo/SeletorVista'
import { MapaAba } from './components/mapa/MapaAba'
import { FichaMusculo } from './components/mapa/FichaMusculo'
import { ExerciciosAba } from './components/exercicios/ExerciciosAba'
import { FichaAtividade } from './components/exercicios/FichaAtividade'
import { FichaLesao, LesoesAba } from './components/lesoes/LesoesAba'
import { SessaoAba } from './components/sessao/SessaoAba'
import { BarraAbas } from './components/shell/BarraAbas'

export default function App() {
  const [aba, navegar] = useAbaHash()
  const [vista, setVista] = useState<Vista>('frente')
  const [camada, setCamada] = useState<Camada>('superficial')

  const [musculoAberto, setMusculoAberto] = useState<MusculoId | null>(null)
  const [atividadeAberta, setAtividadeAberta] = useState<AtividadeId | null>(null)
  const [lesaoAberta, setLesaoAberta] = useState<LesaoId | null>(null)

  const [sessao, setSessao] = useArmazenado<AtividadeId[]>('humano.sessao', [])
  const [lesoesAtivas, setLesoesAtivas] = useArmazenado<LesaoId[]>('humano.lesoes', [])

  const alternarSessao = useCallback(
    (id: AtividadeId) => setSessao((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    [setSessao],
  )
  const alternarLesao = useCallback(
    (id: LesaoId) => setLesoesAtivas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    [setLesoesAtivas],
  )

  const resultado = useMemo(
    () =>
      analisarSessao(
        sessao.map((atividadeId) => ({ atividadeId })),
        { lesoesAtivas, camada },
        catalogo,
      ),
    [sessao, lesoesAtivas, camada],
  )

  // Toda a coloração do corpo sai daqui: funções puras que devolvem tons
  // semânticos. O renderizador nunca sabe de onde veio.
  const realces: MapaDeRealce = useMemo(() => {
    const fontes: MapaDeRealce[] = []
    if (atividadeAberta) {
      const a = atividadePorId.get(atividadeAberta)
      if (a) fontes.push(realceDeAtividade(a))
    } else if (lesaoAberta) {
      const l = lesaoPorId.get(lesaoAberta)
      if (l) fontes.push(realceDeLesao(l))
    } else if (aba === 'sessao' && sessao.length > 0) {
      fontes.push(realceDeSessao(resultado))
    }
    if (musculoAberto) fontes.push(realceDeMusculo(musculoAberto))
    return fundirRealces(...fontes)
  }, [atividadeAberta, lesaoAberta, musculoAberto, aba, sessao.length, resultado])

  const abrirMusculo = useCallback((id: MusculoId | null) => {
    setMusculoAberto(id)
    if (id) {
      setAtividadeAberta(null)
      setLesaoAberta(null)
    }
  }, [])

  const abrirAtividade = useCallback((id: AtividadeId | null) => {
    setAtividadeAberta(id)
    if (id) {
      setMusculoAberto(null)
      setLesaoAberta(null)
    }
  }, [])

  // Fora da aba do mapa, o corpo continua visível como painel de contexto —
  // é o que faz a coloração por exercício e por sessão ser útil.
  const mostraCorpoAuxiliar = aba !== 'mapa'

  return (
    <div className="flex h-full flex-col md:flex-row">
      <BarraAbas aba={aba} onAba={navegar} contagemSessao={sessao.length} />

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="mx-auto max-w-5xl p-3 md:p-6">
          <header className="mb-3 flex items-baseline justify-between md:hidden">
            <h1 className="text-lg font-bold">{ROTULO_ABA[aba]}</h1>
          </header>

          {aba === 'mapa' && (
            <div className="h-[calc(100dvh-9rem)] md:h-[calc(100dvh-6rem)]">
              <MapaAba
                vista={vista}
                camada={camada}
                onVista={setVista}
                onCamada={setCamada}
                selecionado={musculoAberto}
                onSelecionar={abrirMusculo}
                realces={realces}
              />
            </div>
          )}

          {mostraCorpoAuxiliar && (
            <div className="mb-4 flex flex-col gap-2">
              <div className="h-56 md:h-72">
                <Corpo
                  vista={vista}
                  camada={camada}
                  realces={realces}
                  selecionado={musculoAberto}
                  onSelecionar={abrirMusculo}
                />
              </div>
              <SeletorVista vista={vista} camada={camada} onVista={setVista} onCamada={setCamada} />
              <Legenda tons={[...new Set([...realces.values()].map((e) => e.tom))]} />
            </div>
          )}

          {aba === 'exercicios' && (
            <ExerciciosAba
              selecionada={atividadeAberta}
              sessao={sessao}
              onSelecionar={abrirAtividade}
              onAlternarSessao={alternarSessao}
            />
          )}

          {aba === 'queixas' && (
            <LesoesAba
              ativas={lesoesAtivas}
              onSelecionar={setLesaoAberta}
              onAlternarAtiva={alternarLesao}
            />
          )}

          {aba === 'sessao' && (
            <SessaoAba
              sessao={sessao}
              resultado={resultado}
              lesoesAtivas={lesoesAtivas}
              onAbrirAtividade={abrirAtividade}
              onAbrirMusculo={abrirMusculo}
              onRemover={alternarSessao}
              onLimpar={() => setSessao([])}
            />
          )}
        </div>
      </main>

      <FichaMusculo
        musculo={musculoAberto ? (musculoPorId.get(musculoAberto) ?? null) : null}
        onFechar={() => setMusculoAberto(null)}
        onAbrirAtividade={abrirAtividade}
      />
      <FichaAtividade
        atividade={atividadeAberta ? (atividadePorId.get(atividadeAberta) ?? null) : null}
        naSessao={atividadeAberta ? sessao.includes(atividadeAberta) : false}
        onFechar={() => setAtividadeAberta(null)}
        onAlternarSessao={alternarSessao}
        onAbrirAtividade={abrirAtividade}
        onAbrirMusculo={abrirMusculo}
      />
      <FichaLesao
        lesao={lesaoAberta ? (lesaoPorId.get(lesaoAberta) ?? null) : null}
        onFechar={() => setLesaoAberta(null)}
        onAbrirAtividade={abrirAtividade}
        onAbrirMusculo={abrirMusculo}
      />
    </div>
  )
}

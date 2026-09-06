import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { atividadePorId, catalogo, lesaoPorId, musculoPorId } from './data'
import { useAbaHash, ROTULO_ABA } from './hooks/useAbaHash'
import { useArmazenado } from './hooks/useArmazenado'
import { fundirRealces, realceDeAtividade, realceDeLesao, realceDeMusculo } from './lib/realce'
import { analisarSessao, realceDeSessao } from './lib/sessao'
import type { AtividadeId, Camada, LesaoId, MapaDeRealce, MusculoId, Vista } from './types'
import { CorpoComLeitura } from './components/corpo/CorpoComLeitura'
import { Legenda } from './components/corpo/Legenda'
import { SeletorVista } from './components/corpo/SeletorVista'
import { MapaAba } from './components/mapa/MapaAba'
import { FichaMusculo } from './components/mapa/FichaMusculo'
import { FichaAtividade } from './components/exercicios/FichaAtividade'
import { FichaLesao, LesoesAba } from './components/lesoes/LesoesAba'
import { TreinoAba } from './components/sessao/TreinoAba'
import { BarraAbas } from './components/shell/BarraAbas'
import { FaixaRealce } from './components/shell/Comuns'
import { ComposicaoAba } from './components/composicao/ComposicaoAba'

export default function App() {
  const [aba, navegar] = useAbaHash()
  const conteudo = useRef<HTMLElement>(null)
  useEffect(() => { conteudo.current?.scrollTo({ top: 0 }) }, [aba])
  const [vista, setVista] = useState<Vista>('frente')
  const [camada, setCamada] = useState<Camada>('superficial')

  // O que PINTA o corpo e o que ABRE a ficha sao coisas diferentes. Antes eram
  // o mesmo estado, e fechar a ficha apagava a coloracao — que e justamente o
  // que se quer ver depois de fechar a ficha.
  const [atividadeRealcada, setAtividadeRealcada] = useState<AtividadeId | null>(null)
  const [lesaoRealcada, setLesaoRealcada] = useState<LesaoId | null>(null)
  const [musculoRealcado, setMusculoRealcado] = useState<MusculoId | null>(null)

  const [musculoAberto, setMusculoAberto] = useState<MusculoId | null>(null)
  const [atividadeAberta, setAtividadeAberta] = useState<AtividadeId | null>(null)
  const [lesaoAberta, setLesaoAberta] = useState<LesaoId | null>(null)

  const [sessao, setSessao] = useArmazenado<AtividadeId[]>('humano.sessao', [])
  const [lesoesAtivas, setLesoesAtivas] = useArmazenado<LesaoId[]>('humano.lesoes', [])

  const alternarSessao = useCallback(
    (id: AtividadeId) => {
      setSessao((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
      setAtividadeRealcada(null); setLesaoRealcada(null); setMusculoRealcado(null)
    },
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

  // Uma fonte de cada vez, com precedencia explicita, para a FaixaRealce
  // conseguir sempre dizer em uma linha o que esta na tela.
  const fonte = useMemo(() => {
    if (atividadeRealcada) {
      const a = atividadePorId.get(atividadeRealcada)
      if (a) return { rotulo: a.nome, detalhe: 'músculos trabalhados', mapa: realceDeAtividade(a) }
    }
    if (lesaoRealcada) {
      const l = lesaoPorId.get(lesaoRealcada)
      if (l) return { rotulo: l.nome, detalhe: 'o que fortalecer e alongar', mapa: realceDeLesao(l) }
    }
    if (sessao.length > 0) {
      return {
        rotulo: 'Músculos do meu treino',
        detalhe: `${sessao.length} ${sessao.length === 1 ? 'exercício' : 'exercícios'}`,
        mapa: realceDeSessao(resultado),
      }
    }
    return null
  }, [atividadeRealcada, lesaoRealcada, sessao.length, resultado])

  // O musculo tocado vai por cima em dourado (precedencia 'selecionado'), sem
  // apagar as cores de nivel do que estava pintado.
  const realces: MapaDeRealce = useMemo(() => {
    const fontes: MapaDeRealce[] = []
    if (fonte) fontes.push(fonte.mapa)
    if (musculoRealcado) fontes.push(realceDeMusculo(musculoRealcado))
    return fundirRealces(...fontes)
  }, [fonte, musculoRealcado])

  // Pelo mesmo motivo que a atividade: o musculo realcado sobrevive ao fechar
  // da ficha. Sem isto, trocar de vista para procurar o musculo do outro lado
  // era impossivel — a ficha tapa o seletor de vista, e fecha-la apagava a
  // selecao. Fechar por engano tambem deixava de custar o lugar onde se estava.
  const abrirMusculo = useCallback((id: MusculoId | null) => {
    setMusculoAberto(id)
    setMusculoRealcado(id)
    if (id) {
      setAtividadeAberta(null)
      setLesaoAberta(null)
    }
  }, [])

  // Abrir um exercicio ou uma queixa larga o dourado do musculo: e a cor de
  // nivel desse musculo que se veio ver, e o dourado ficaria por cima dela.
  const abrirAtividade = useCallback((id: AtividadeId | null) => {
    setAtividadeAberta(id)
    if (id) {
      setAtividadeRealcada(id)
      setLesaoRealcada(null)
      setMusculoAberto(null)
      setMusculoRealcado(null)
      setLesaoAberta(null)
    }
  }, [])

  const abrirLesao = useCallback((id: LesaoId | null) => {
    setLesaoAberta(id)
    if (id) {
      setLesaoRealcada(id)
      setAtividadeRealcada(null)
      setMusculoAberto(null)
      setMusculoRealcado(null)
      setAtividadeAberta(null)
    }
  }, [])

  const limparRealce = useCallback(() => {
    setAtividadeRealcada(null)
    setLesaoRealcada(null)
    setMusculoRealcado(null)
  }, [])

  // O que a faixa narra. Se nada mais pinta o corpo, narra o musculo — que de
  // outro modo ficaria dourado sem nada dizendo como sair dali.
  const narrativa = useMemo(() => {
    if (fonte) return { rotulo: fonte.rotulo, detalhe: fonte.detalhe }
    const m = musculoRealcado ? musculoPorId.get(musculoRealcado) : undefined
    return m ? { rotulo: m.nome, detalhe: 'músculo selecionado' } : null
  }, [fonte, musculoRealcado])

  const tons = useMemo(() => [...new Set([...realces.values()].map((e) => e.tom))], [realces])

  // Fora da aba do mapa, o corpo continua visivel como painel de contexto —
  // e o que faz a coloracao por exercicio e por sessao ser util.
  const painelCorpo = aba !== 'mapa' && aba !== 'composicao' && (
    <div className="painel-corpo mb-4 flex flex-col gap-2">
      {narrativa && (
        <FaixaRealce rotulo={narrativa.rotulo} detalhe={narrativa.detalhe} onLimpar={limparRealce} />
      )}
      <div className="painel-corpo-modelo">
        <CorpoComLeitura
          vista={vista}
          camada={camada}
          realces={realces}
          selecionado={musculoRealcado}
          onSelecionar={abrirMusculo}
        />
      </div>
      <SeletorVista vista={vista} camada={camada} onVista={setVista} onCamada={setCamada} />
      <Legenda tons={tons} />
    </div>
  )

  return (
    <div className="flex h-full flex-col md:flex-row">
      <BarraAbas aba={aba} onAba={navegar} contagemSessao={sessao.length} />

      <main ref={conteudo} className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="app-conteudo" data-aba={aba}>
          <header className="app-cabecalho">
            <div><p className="eyebrow">Humano / explore seu movimento</p><h1>{ROTULO_ABA[aba]}</h1></div>
            <span className="cabecalho-nota">{aba === 'composicao' ? 'Explore possibilidades' : 'Conheça o corpo. Entenda seu treino.'}</span>
          </header>

          <div className={aba === 'queixas' ? 'workspace-treino' : ''}>

          {aba === 'mapa' && (
            <div className="mapa-principal">
              <MapaAba
                vista={vista}
                camada={camada}
                onVista={setVista}
                onCamada={setCamada}
                selecionado={musculoRealcado}
                onSelecionar={abrirMusculo}
                realces={realces}
                faixa={
                  narrativa && (
                    <FaixaRealce
                      rotulo={narrativa.rotulo}
                      detalhe={narrativa.detalhe}
                      onLimpar={limparRealce}
                    />
                  )
                }
              />
            </div>
          )}

          {aba === 'queixas' && painelCorpo}

          <div className={aba === 'queixas' || aba === 'treino' ? 'painel-conteudo' : ''}>

          {aba === 'queixas' && (
            <LesoesAba ativas={lesoesAtivas} onSelecionar={abrirLesao} onAlternarAtiva={alternarLesao} />
          )}

          {aba === 'treino' && (
            <TreinoAba
              sessao={sessao}
              resultado={resultado}
              lesoesAtivas={lesoesAtivas}
              onAbrirAtividade={abrirAtividade}
              onAbrirMusculo={abrirMusculo}
              realcada={atividadeRealcada}
              onAlternar={alternarSessao}
              onCenario={() => navegar('composicao')}
              corpo={painelCorpo}
              onLimpar={() => setSessao([])}
            />
          )}
          {aba === 'composicao' && <ComposicaoAba sessao={sessao} onExercicios={() => navegar('treino')} />}
          </div>
          </div>
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

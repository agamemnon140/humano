import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { calcularComposicao } from '../../lib/composicao'
import { useArmazenado } from '../../hooks/useArmazenado'
import { atividadePorId } from '../../data'
import type { AtividadeId, Vista } from '../../types'
import { Limite3D } from '../corpo/Limite3D'
import type { SincronizacaoCamera } from '../corpo/CenaCorpo'

const CenaCorpo = lazy(() => import('../corpo/CenaCorpo'))
const vazio = new Map()
const ignorar = () => {}
const numero = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const sinal = (n: number) => `${n > 0 ? '+' : ''}${numero(n)}`
interface Campos { peso: string; gorduraAtual: string; gorduraAlvo: string; variacaoMassaLivre: string }
const inicial: Campos = { peso: '', gorduraAtual: '', gorduraAlvo: '', variacaoMassaLivre: '0' }
const exemplo: Campos = { peso: '80', gorduraAtual: '25', gorduraAlvo: '15', variacaoMassaLivre: '0' }
function lerNumero(s: string) { return s.trim() === '' ? NaN : Number(s.replace(',', '.')) }

export function ComposicaoAba({ sessao, onExercicios }: { sessao: AtividadeId[]; onExercicios: () => void }) {
  const [armazenado, setCampos] = useArmazenado<Campos>('humano.composicao.v1', inicial)
  // localStorage may contain older or malformed values; do not trust JSON alone.
  const campos = armazenado && Object.keys(inicial).every(k => typeof armazenado[k as keyof Campos] === 'string') ? armazenado : inicial
  const [comparacao, setComparacao] = useState<'atual' | 'cenario'>('cenario')
  const [vista, setVista] = useState<Vista>('frente')
  const [painelMobile, setPainelMobile] = useState<'ajustar' | 'visualizar'>('ajustar')
  const [tocado, setTocado] = useState(false)
  const [ampla, setAmpla] = useState(() => window.matchMedia('(min-width: 1200px)').matches)
  const cameras = useRef<SincronizacaoCamera>({ ouvintes: new Set() })
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1200px)')
    const atualizar = () => setAmpla(media.matches)
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])
  const resultado = useMemo(() => {
    try {
      return { valor: calcularComposicao({ peso: lerNumero(campos.peso), gorduraAtual: lerNumero(campos.gorduraAtual), gorduraAlvo: lerNumero(campos.gorduraAlvo), variacaoMassaLivre: lerNumero(campos.variacaoMassaLivre) }), erro: null }
    } catch (e) { return { valor: null, erro: (e as Error).message } }
  }, [campos.peso, campos.gorduraAtual, campos.gorduraAlvo, campos.variacaoMassaLivre])
  const atividades = sessao.map(id => atividadePorId.get(id)).filter(a => a !== undefined)
  const focos = new Set(atividades.flatMap(a => a.primarios))
  const r = resultado.valor
  const mudou = (campo: keyof Campos, valor: string) => { setTocado(true); setCampos({ ...campos, [campo]: valor }) }
  const input = (campo: keyof Campos, rotulo: string, unidade: string, dica?: string) => <label className="composicao-campo" htmlFor={`composicao-${campo}`}>
    <span>{rotulo}</span><div className="input-unidade"><input id={`composicao-${campo}`} inputMode="decimal" autoComplete="off" value={campos[campo]} onChange={e => mudou(campo, e.target.value)} placeholder={campo === 'variacaoMassaLivre' ? '0' : '—'} aria-describedby={dica ? `${campo}-dica` : undefined} /><span>{unidade}</span></div>
    {dica && <small id={`${campo}-dica`}>{dica}</small>}
  </label>

  return <div className="composicao-layout" data-painel={painelMobile}>
    <div className="composicao-mobile-abas segmentado"><button aria-pressed={painelMobile === 'ajustar'} onClick={() => setPainelMobile('ajustar')}>Ajustar cenário</button><button aria-pressed={painelMobile === 'visualizar'} onClick={() => setPainelMobile('visualizar')}>Visualizar</button></div>
    <section className="composicao-controles" aria-label="Definir composição corporal">
      <div className="secao-titulo"><span className="passo">01</span><h2>Seu ponto de partida</h2></div>
      <p className="texto-apoio">Use suas medidas ou explore um exemplo.</p>
      <div className="campos-duplos">{input('peso', 'Peso atual', 'kg')}{input('gorduraAtual', 'Gordura estimada', '%')}</div>
      <button className="sublinhado exemplo-botao" onClick={() => { setCampos(exemplo); setTocado(true) }}>Preencher exemplo: 80 kg · 25%</button>

      <div className="secao-titulo"><span className="passo">02</span><h2>Explore um cenário</h2></div>
      {input('gorduraAlvo', 'Gordura alvo', '%')}
      <input className="gordura-slider" type="range" aria-label="Ajustar gordura alvo" min="3" max="65" step="0.5" value={Number.isFinite(lerNumero(campos.gorduraAlvo)) ? Math.min(65, Math.max(3, lerNumero(campos.gorduraAlvo))) : 25} onChange={e => mudou('gorduraAlvo', e.target.value)} />
      <div className="slider-limites"><span>3%</span><span>Faixa de exploração, não recomendação</span><span>65%</span></div>
      <details className="ajuste-massa">
        <summary>{lerNumero(campos.variacaoMassaLivre) === 0 ? 'Manter massa livre de gordura' : `Variação de massa livre: ${campos.variacaoMassaLivre} kg`}<span>Ajustar hipótese</span></summary>
        {input('variacaoMassaLivre', 'Variação de massa livre de gordura', 'kg', 'Inclui água, ossos e órgãos, além de músculos. Use 0 para manter.')}
        <button className="sublinhado" onClick={() => mudou('variacaoMassaLivre', '0')}>Manter massa atual</button>
      </details>
      {tocado && resultado.erro && <p className="erro-campos" role="alert">{resultado.erro}</p>}
      {r && <button className="botao ver-cenario-mobile" onClick={() => setPainelMobile('visualizar')}>Visualizar cenário · {numero(r.pesoAlvo)} kg</button>}

      <div className="secao-titulo"><span className="passo">03</span><h2>Seu foco de treino</h2></div>
      <p className="texto-apoio">{atividades.length ? `${atividades.length} ${atividades.length === 1 ? 'atividade no treino' : 'atividades no treino'} · ${focos.size} músculos primários.` : 'Escolha exercícios em Meu treino para acompanhar seu foco muscular.'}</p>
      <div className="focos-treino">{atividades.map(a => <span className="chip" key={a.id}>{a.nome}</span>)}</div>
      <button className="botao-2 w-full" onClick={onExercicios}>{atividades.length ? 'Voltar ao meu treino' : 'Escolher exercícios'}</button>
      <p className="texto-apoio pequeno">O foco de treino aparece no mapa anatômico. Ele não é convertido automaticamente em ganho muscular.</p>
      <button className="limpar-composicao" onClick={() => { setCampos(inicial); setTocado(false) }}>Limpar medidas e cenário</button>
      <span className="local-nota">Salvo neste navegador</span>
    </section>

    <section className="composicao-resultado" aria-label="Resultado do cenário">
      <div className="comparacao-card">
        <div className="comparacao-topo"><div><span className="eyebrow">Composição corporal</span><h2>Visualize a mudança</h2></div><span className="selo-ilustrativo">Ilustrativo</span></div>
        <div className="comparacao-toolbar">
          {ampla ? <span className="texto-apoio">Gire um corpo para comparar os dois</span> : <div className="segmentado"><button aria-pressed={comparacao === 'atual'} onClick={() => setComparacao('atual')}>Atual</button><button aria-pressed={comparacao === 'cenario'} onClick={() => setComparacao('cenario')}>Cenário</button></div>}
          <div className="segmentado"><button aria-pressed={vista === 'frente'} onClick={() => setVista('frente')}>Frente</button><button aria-pressed={vista === 'costas'} onClick={() => setVista('costas')}>Costas</button></div>
        </div>
        <p className="comparacao-explicacao">Sua meta altera este cenário de composição. Os exercícios mostram o foco muscular em Meu treino.</p>
        <div className={ampla && r ? 'comparacao-dupla' : ''}>
          {r ? (ampla ? ['atual', 'cenario'] : [comparacao]).map(tipo => <div className="comparacao-palco" key={ampla ? tipo : 'unica'} data-comparacao={tipo}>
            <Limite3D fallback={<p className="cena-status">Silhueta indisponível. Os cálculos continuam disponíveis.</p>}><Suspense fallback={<p className="cena-status">Preparando silhueta…</p>}><CenaCorpo vista={vista} camada="superficial" realces={vazio} selecionado={null} onSelecionar={ignorar} sincronizacao={ampla ? cameras.current : undefined} superficie={{ gorduraDelta: tipo === 'cenario' ? r.variacaoGordura : 0, massaLivreDelta: tipo === 'cenario' ? lerNumero(campos.variacaoMassaLivre) : 0 }} /></Suspense></Limite3D>
            <div className="comparacao-medida"><span>{tipo === 'cenario' ? 'Cenário' : 'Atual'}</span><strong>{numero(tipo === 'cenario' ? r.pesoAlvo : lerNumero(campos.peso))}<small> kg</small></strong><span>{numero(lerNumero(tipo === 'cenario' ? campos.gorduraAlvo : campos.gorduraAtual))}% de gordura</span></div>
          </div>) : <div className="comparacao-palco"><div className="composicao-vazio"><span aria-hidden="true">◎</span><h3>Um cenário começa com você</h3><p>Preencha peso, gordura atual e alvo para comparar a composição e explorar uma silhueta ilustrativa.</p><button className="botao-2" onClick={() => { setCampos(exemplo); setTocado(true) }}>Explorar exemplo</button></div></div>}
        </div>
        <p className="nota-silhueta">Referência masculina genérica. A forma inicial não reproduz seu corpo; a deformação ilustra mudanças, sem prever medidas ou distribuição individual de gordura.</p>
        <a className="creditos-atlas" href={`${import.meta.env.BASE_URL}atlas-creditos.txt`} target="_blank" rel="noreferrer">Modelo BodyParts3D / Human Atlas · créditos</a>
      </div>
      {r && <div className="resultado-numeros" aria-live="polite">
        <div className="resultado-peso"><span>Peso no cenário</span><strong>{numero(r.pesoAlvo)} <small>kg</small></strong><span>{sinal(r.variacaoPeso)} kg em relação ao atual</span></div>
        <table className="tabela-composicao"><caption>Composição calculada</caption><thead><tr><th scope="col">Massa</th><th scope="col">Atual</th><th scope="col">Cenário</th></tr></thead><tbody><tr><th scope="row">Gordura</th><td>{numero(r.gorduraAtualKg)} kg</td><td>{numero(r.gorduraAlvoKg)} kg</td></tr><tr><th scope="row">Livre de gordura</th><td>{numero(r.massaLivreAtual)} kg</td><td>{numero(r.massaLivreAlvo)} kg</td></tr></tbody></table>
      </div>}
      <details className="premissas"><summary>Como este cenário é calculado</summary><p>Calculamos a massa livre de gordura a partir do peso e percentual atual. Somamos a variação informada e dividimos por (1 − gordura alvo / 100) para obter o peso do cenário.</p><p>A malha de referência não tem um percentual de gordura medido. Sua deformação é apenas geométrica e limitada; mudanças grandes podem deixar de produzir diferenças visuais proporcionais. Os valores da tabela continuam sendo os resultados do cálculo.</p><p>Não estimamos prazo, probabilidade de atingir a meta ou crescimento muscular por exercício. A incerteza da medição inicial também afeta o resultado.</p></details>
    </section>
  </div>
}

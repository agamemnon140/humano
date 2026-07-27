// Verifica a interação do corpo num Chrome real. `npm run toque`.
//
// Existe porque os testes correm em `environment: 'node'` e nunca veem o SVG,
// e porque o hit-test do corpo (CorpoSVG.tsx) e geometrico: resolve o toque
// contra Path2D, nao contra a arvore do DOM. Isso nao se verifica lendo codigo.
//
// A afirmacao central que este script defende:
//
//    o toque responde o musculo que esta PINTADO sob o ponto.
//
// Foi ao medir isto que se descobriu que tocar no sartorio respondia "reto
// femoral": o desempate era por espessura da caixa envolvente, e a caixa de uma
// tira diagonal e larga. Agora o desempate e a ordem de desenho.
//
// Usa o Chrome instalado (nao descarrega nada). CHROME_PATH sobrepoe-se.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const PORTA = 4183
const BASE = `http://localhost:${PORTA}/humano/`
const HINT = 'Toque ou passe o cursor sobre um músculo'

const CAMINHOS_CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const chrome = CAMINHOS_CHROME.find((c) => existsSync(c))
if (!chrome) {
  console.error('Chrome nao encontrado. Defina CHROME_PATH para o executavel.')
  process.exit(2)
}
if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
  console.error('dist/ nao existe. Corra `npm run build` primeiro.')
  process.exit(2)
}

// Sem shell: os argumentos nao passam por concatenacao.
const servidor = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORTA), '--strictPort'],
  { cwd: new URL('..', import.meta.url), stdio: 'ignore' },
)
const encerrar = () => { try { servidor.kill() } catch {} }
process.on('exit', encerrar)

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
for (let tentativa = 0; tentativa < 40; tentativa++) {
  try {
    if ((await fetch(BASE)).ok) break
  } catch {}
  await esperar(250)
}

const navegador = await puppeteer.launch({ executablePath: chrome, headless: 'shell', args: ['--no-sandbox'] })
const pagina = await navegador.newPage()
// Tamanho de telemovel: e onde os musculos pequenos sao dificeis de acertar.
await pagina.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, hasTouch: true })
const errosDaPagina = []
pagina.on('pageerror', (e) => errosDaPagina.push(e.message))
await pagina.goto(BASE, { waitUntil: 'networkidle2' })
await pagina.waitForSelector('.corpo .musculos')

const falhas = []
const afirmar = (condicao, descricao, detalhe = '') => {
  console.log(`${condicao ? '  ok  ' : ' FALHA'} ${descricao}${detalhe ? ` — ${detalhe}` : ''}`)
  if (!condicao) falhas.push(descricao)
}
const leitura = async () => (await pagina.$eval('p[aria-live]', (p) => p.textContent.trim())).split(' · ')[0]
const clicar = (rotulo) =>
  pagina.evaluate((r) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === r)
    if (b) b.click()
    return Boolean(b)
  }, rotulo)

// ── O toque responde o que esta pintado ─────────────────────────────────
// Duas passagens: com a captura desligada pergunta-se ao DOM que forma esta
// desenhada em cada ponto; depois passa-se o rato pelos mesmos pontos.
// So a camada superficial — na profunda os superficiais continuam desenhados
// mas inertes de proposito, e "pintado" deixaria de ser o padrao de comparacao.
for (const vista of ['Frente', 'Costas']) {
  await clicar(vista)
  await clicar('Superficial')
  await esperar(200)

  const folha = await pagina.addStyleTag({
    content: `.corpo .captura { pointer-events: none !important }
              .corpo .musculos, .corpo .musculo { pointer-events: auto !important }`,
  })
  const pontos = await pagina.evaluate(() => {
    const nome = (el) => el?.querySelector?.('title')?.textContent.split(' · ')[0] ?? null
    const saida = []
    for (const el of document.querySelectorAll('.musculos [data-musculo]')) {
      if (el.getAttribute('data-camada-musculo') !== 'superficial') continue
      const r = el.getBoundingClientRect()
      if (r.width === 0) continue
      const x = r.x + r.width / 2
      const y = r.y + r.height / 2
      const pilha = document.elementsFromPoint(x, y).filter((e) => e.classList.contains('musculo'))
      saida.push({ eu: nome(el), pintado: nome(pilha[0]), x, y })
    }
    return saida
  })
  await folha.evaluate((el) => el.remove())

  const divergem = []
  for (const p of pontos) {
    await pagina.mouse.move(p.x, p.y)
    await esperar(25)
    const dito = await leitura()
    if (dito !== (p.pintado ?? HINT)) divergem.push(`${p.eu}: pintado=${p.pintado} respondeu=${dito}`)
  }
  afirmar(divergem.length === 0, `${vista}: toque == pintado em ${pontos.length} pontos`, divergem.join('; '))
}

// ── O espelho e o mesmo musculo ────────────────────────────────────────
await clicar('Frente')
await esperar(200)
const forma = await pagina.$eval('.musculos [data-musculo="vasto-lateral"]', (el) => {
  const r = el.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
await pagina.mouse.move(forma.x, forma.y)
await esperar(60)
const direita = await leitura()
await pagina.mouse.move(390 - forma.x, forma.y)
await esperar(60)
const esquerda = await leitura()
afirmar(direita === esquerda && direita !== HINT, 'a instancia espelhada nomeia o mesmo musculo', `${direita} / ${esquerda}`)

// ── Um toque abre a ficha, e fechar mantem o realce ────────────────────
await pagina.touchscreen.tap(390 - forma.x, forma.y)
await pagina.waitForSelector('[role=dialog]', { timeout: 3000 }).catch(() => {})
const titulo = await pagina.$eval('[role=dialog] header', (h) => h.innerText.split('\n')[0]).catch(() => '(nao abriu)')
afirmar(titulo === direita, 'o toque no ecra abre a ficha do musculo tocado', titulo)

await pagina.keyboard.press('Escape')
await esperar(250)
const douradas = await pagina.$$eval('.musculos [data-tom="selecionado"]', (e) => e.length)
const faixa = await pagina.evaluate(() => document.body.innerText.match(/no corpo:.*/)?.[0] ?? '')
afirmar(douradas === 2 && faixa.includes(direita), 'fechar a ficha mantem o musculo realcado e narrado', `${douradas} instancias, "${faixa}"`)

// ── Trocar de vista mantem a selecao, e avisa se nao se ve ─────────────
await clicar('Costas')
await esperar(250)
const aviso = await pagina.evaluate(() => document.body.innerText.includes('não é visível nesta vista'))
afirmar(aviso, 'trocar para uma vista onde o musculo nao existe avisa em vez de perder a selecao')

// ── Clicar no vazio limpa ──────────────────────────────────────────────
await clicar('Frente')
await esperar(250)
const vazio = await pagina.$eval('.corpo', (svg) => {
  const r = svg.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + 3 }
})
await pagina.mouse.click(vazio.x, vazio.y)
await esperar(200)
const sobrou = await pagina.$$eval('.musculos [data-tom="selecionado"]', (e) => e.length)
afirmar(sobrou === 0, 'clicar acima da cabeca limpa a selecao')

afirmar(errosDaPagina.length === 0, 'nenhum erro de JavaScript na pagina', errosDaPagina.join('; '))

await navegador.close()
encerrar()

console.log(falhas.length === 0 ? '\ntoque: tudo ok' : `\ntoque: ${falhas.length} falha(s)`)
process.exit(falhas.length === 0 ? 0 : 1)

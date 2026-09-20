// Checks the served release independently of the browser's PWA cache.
import assert from 'node:assert/strict'

const site = process.argv[2] ?? 'https://agamemnon140.github.io/humano/'
const pagina = await fetch(`${site}?verificar=${Date.now()}`, { signal: AbortSignal.timeout(20000), cache: 'no-store' })
assert.ok(pagina.ok, `Página respondeu HTTP ${pagina.status}`)
const html = await pagina.text()
const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m => new URL(m[1], site))
assert.ok(scripts.length, 'Página deve carregar o aplicativo')
const codigo = (await Promise.all(scripts.map(async url => {
  const resposta = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' })
  assert.ok(resposta.ok, `Script indisponível: ${url}`)
  return resposta.text()
}))).join('\n')
for (const esperado of ['Meu treino', 'Meu cenário', 'natacao-peito']) {
  assert.ok(codigo.includes(esperado), `Versão publicada não contém: ${esperado}`)
}
console.log(`OK: ${site} publica Meu treino, Meu cenário e nado peito.`)

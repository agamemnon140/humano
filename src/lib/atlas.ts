import manifest from '../data/atlas-manifest.json'

export const atlas = manifest
export const musculosSemModelo = new Set(manifest.correspondencias.filter(m => !m.parts.length).map(m => m.id))
export type ParteAtlas = typeof manifest.anatomia.parts[number]
export type ArquivoAtlas = typeof manifest.anatomia

export async function decodificarModelo(resposta: Response, tamanho: number) {
  if (!resposta.ok) throw new Error('Não foi possível baixar o modelo')
  const bytes = await resposta.arrayBuffer()
  // Adapted from Human Atlas model-download.ts: hosts may already decode gzip.
  const assinatura = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength))
  const comprimido = assinatura[0] === 0x1f && assinatura[1] === 0x8b
  const dados = comprimido ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : bytes
  if (dados.byteLength !== tamanho) throw new Error('Modelo incompleto')
  return dados
}

// Reuse downloaded bytes across viewers, but keep GPU resources local to each scene.
const arquivos = new Map<string, Promise<ArrayBuffer>>()
export function carregarAtlas(arquivo: ArquivoAtlas): Promise<ArrayBuffer> {
  const existente = arquivos.get(arquivo.url)
  if (existente) return existente
  const promessa = (async () => {
    const url = `${import.meta.env.BASE_URL}${arquivo.url}`
    // Cache the first successful load even before the service worker controls the page.
    const cache = typeof caches === 'undefined' ? null : await caches.open('humano-modelos-v1').catch(() => null)
    const salvo = await cache?.match(url).catch(() => undefined)
    if (salvo) {
      try { return await decodificarModelo(salvo, arquivo.bytes) }
      catch { await cache?.delete(url).catch(() => {}) }
    }
    const resposta = await fetch(url, { signal: AbortSignal.timeout(45000) })
    const copia = resposta.clone()
    const dados = await decodificarModelo(resposta, arquivo.bytes)
    await cache?.put(url, copia).catch(() => {})
    return dados
  })().catch(erro => { arquivos.delete(arquivo.url); throw erro })
  arquivos.set(arquivo.url, promessa)
  return promessa
}

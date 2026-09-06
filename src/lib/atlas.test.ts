/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'
import { expect, it } from 'vitest'
import manifest from '../data/atlas-manifest.json'
import musculos from '../data/musculos.json'
import { decodificarModelo } from './atlas'

it('aceita gzip bruto e resposta já descomprimida pelo servidor', async () => {
  const bytes = new Uint8Array([0, 1, 2, 3, 4, 5])
  const comprimido = new Uint8Array(gzipSync(bytes))
  expect(new Uint8Array(await decodificarModelo(new Response(comprimido), 6))).toEqual(bytes)
  expect(new Uint8Array(await decodificarModelo(new Response(bytes, { headers: { 'Content-Encoding': 'gzip' } }), 6))).toEqual(bytes)
  await expect(decodificarModelo(new Response(bytes), 10)).rejects.toThrow('incompleto')
  await expect(decodificarModelo(new Response(null, { status: 404 }), 6)).rejects.toThrow('baixar')
})

it('cada músculo tem uma correspondência ou ausência documentada, sem peças ambíguas', () => {
  expect(manifest.correspondencias.map(m => m.id).sort()).toEqual(musculos.map(m => m.id).sort())
  const ids = manifest.correspondencias.flatMap(m => m.parts)
  expect(new Set(ids).size).toBe(ids.length)
  expect(manifest.correspondencias.filter(m => !m.parts.length).map(m => m.id)).toEqual([
    'reto-abdominal', 'grande-dorsal', 'transverso-do-abdomen', 'multifidos', 'quadrado-lombar',
  ])
  for (const m of manifest.correspondencias) for (const id of m.parts) {
    expect(manifest.anatomia.parts.find(p => p.id === id)?.muscle).toBe(m.id)
  }
})

it('preserva geometria válida nos arquivos realmente distribuídos', () => {
  for (const arquivo of [manifest.anatomia, manifest.superficie]) {
    const gz = readFileSync(`public/${arquivo.url}`)
    expect(gz.length).toBe(arquivo.gzipBytes)
    const dados = gunzipSync(gz)
    expect(dados.length).toBe(arquivo.bytes)
    const buffer = dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength)
    for (const p of arquivo.parts) {
      const vertices = new Float32Array(buffer, p.positions, p.vertexCount * 3)
      const indices = new Uint32Array(buffer, p.indices, p.indexCount)
      expect(vertices.every(Number.isFinite)).toBe(true)
      expect(indices.every(i => i < p.vertexCount)).toBe(true)
      expect(p.indexCount % 3).toBe(0)
    }
  }
})

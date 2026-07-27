// Gera os PNGs do manifesto a partir de public/icon.svg.
// Correr apos mexer no icone:  npm run icones
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const origem = resolve(raiz, 'public/icon.svg')
const destino = resolve(raiz, 'public/icons')

mkdirSync(destino, { recursive: true })

const saidas = [
  { ficheiro: 'icon-192.png', tamanho: 192 },
  { ficheiro: 'icon-512.png', tamanho: 512 },
  // Maskable: o icone precisa de margem para o recorte circular do Android
  // nao comer a figura. 80% de area segura.
  { ficheiro: 'icon-512-maskable.png', tamanho: 512, margem: 0.1 },
]

for (const { ficheiro, tamanho, margem = 0 } of saidas) {
  const interno = Math.round(tamanho * (1 - margem * 2))
  const borda = Math.round((tamanho - interno) / 2)

  await sharp(origem)
    .resize(interno, interno)
    .extend({
      top: borda,
      bottom: borda,
      left: borda,
      right: borda,
      background: '#0d0d0d',
    })
    .png()
    .toFile(resolve(destino, ficheiro))

  console.log(`${ficheiro} (${tamanho}px)`)
}

// apple-touch-icon vive na raiz de public, referenciado pelo index.html
await sharp(origem).resize(180, 180).png().toFile(resolve(raiz, 'public/apple-touch-icon.png'))
console.log('apple-touch-icon.png (180px)')

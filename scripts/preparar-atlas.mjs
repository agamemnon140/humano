// Reproduz o subconjunto a partir de um checkout do Human Atlas.
// node scripts/preparar-atlas.mjs <diretorio-do-human-atlas>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'

const origem = process.argv[2]
if (!origem) throw new Error('Informe o checkout do Human Atlas')
const atlas = JSON.parse(readFileSync(join(origem, 'public/models/atlas.json'), 'utf8'))
const revision = execFileSync('git', ['-C', origem, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const musculos = JSON.parse(readFileSync('src/data/musculos.json', 'utf8'))
const regras = {
  'esternocleidomastoideo': 'sternocleidomastoid',
  'trapezio-superior': 'descending part of .*trapezius',
  'trapezio-medio': 'transverse part of .*trapezius',
  'trapezio-inferior': 'ascending part of .*trapezius',
  'deltoide-anterior': 'clavicular part of .*deltoid',
  'deltoide-medial': 'acromial part of .*deltoid',
  'deltoide-posterior': 'spinal part of .*deltoid',
  'peitoral-maior-clavicular': 'clavicular part of .*pectoralis major',
  'peitoral-maior-esternal': '(sternocostal|abdominal) part of .*pectoralis major',
  'serratil-anterior': 'serratus anterior',
  'reto-abdominal': 'rectus abdominis',
  'obliquo-externo': 'external oblique',
  'eretores-da-espinha': 'iliocostalis|longissimus|(^| )spinalis',
  'grande-dorsal': 'latissimus dorsi',
  'infraespinhoso': 'infraspinatus',
  'redondo-maior': 'teres major',
  'biceps-braquial': 'biceps brachii',
  'triceps-cabeca-longa': 'long head of .*triceps',
  'triceps-cabeca-lateral': 'lateral head of .*triceps',
  'triceps-cabeca-medial': 'medial head of .*triceps',
  'braquiorradial': 'brachioradialis',
  'flexores-antebraco': 'flexor carpi|flexor digitorum (superficialis|profundus)|flexor pollicis longus|palmaris longus',
  'extensores-antebraco': 'extensor carpi|extensor digitorum$|extensor digiti minimi|extensor indicis|extensor pollicis',
  'gluteo-maximo': 'gluteus maximus',
  'gluteo-medio': 'gluteus medius',
  'biceps-femoral': 'biceps femoris',
  'semitendinoso': 'semitendinosus',
  'semimembranoso': 'semimembranosus',
  'reto-femoral': 'rectus femoris',
  'vasto-lateral': 'vastus lateralis',
  'vasto-medial': 'vastus medialis',
  'sartorio': 'sartorius',
  'adutores': 'adductor (brevis|longus|magnus|minimus)|gracilis|pectineus',
  'tensor-fascia-lata': 'tensor fasciae latae',
  'tibial-anterior': 'tibialis anterior',
  'gastrocnemio-medial': 'medial head of .*gastrocnemius',
  'gastrocnemio-lateral': 'lateral head of .*gastrocnemius',
  'soleo': 'soleus',
  'peitoral-menor': 'pectoralis minor',
  'subescapular': 'subscapularis',
  'supraespinhoso': 'supraspinatus',
  'redondo-menor': 'teres minor',
  'romboides': 'rhomboid (major|minor)',
  'elevador-da-escapula': 'levator scapulae',
  'transverso-do-abdomen': 'transversus abdominis',
  'multifidos': 'multifidus',
  'quadrado-lombar': 'quadratus lumborum',
  'psoas-iliaco': 'psoas major|iliacus',
  'piriforme': 'piriformis',
  'gluteo-minimo': 'gluteus minimus',
}
const correspondencias = musculos.map(m => ({
  id: m.id,
  parts: atlas.parts.filter(p => new RegExp(regras[m.id], 'i').test(p.name)).map(p => p.id),
}))
const porPeca = new Map()
for (const m of correspondencias) for (const id of m.parts) {
  if (porPeca.has(id)) throw new Error(`Mapeamento ambiguo: ${id}`)
  porPeca.set(id, m.id)
}
const buffers = new Map()
mkdirSync('public/models', { recursive: true })
function empacotar(nome, selecionadas) {
  const blocos = [], parts = []
  let offset = 0
  for (const p of selecionadas) {
    if (!buffers.has(p.chunk)) buffers.set(p.chunk, readFileSync(join(origem, 'public', atlas.chunks[p.chunk].url.replace(/^\//, ''))))
    const buffer = buffers.get(p.chunk)
    const parte = { id: p.id, name: p.name, muscle: porPeca.get(p.id) ?? null, vertexCount: p.vertexCount, indexCount: p.indexCount }
    for (const [campo, bytes] of [['positions', p.vertexCount * 12], ['normals', p.vertexCount * 6], ['indices', p.indexCount * 4]]) {
      const padding = (4 - offset % 4) % 4
      if (padding) { blocos.push(Buffer.alloc(padding)); offset += padding }
      parte[campo] = offset
      blocos.push(buffer.subarray(p[campo], p[campo] + bytes))
      offset += bytes
    }
    parts.push(parte)
  }
  const bin = Buffer.concat(blocos), gz = gzipSync(bin, { level: 9 })
  writeFileSync(`public/models/${nome}.bin.gz`, gz)
  return { url: `models/${nome}.bin.gz`, bytes: bin.length, gzipBytes: gz.length, parts }
}
const anatomia = empacotar('anatomia-v1', atlas.parts.filter(p => porPeca.has(p.id) || (p.system === 'skeletal' && !/muscle|levator scapulae/i.test(p.name))))
const superficie = empacotar('superficie-v1', atlas.parts.filter(p => p.id === 'FJ2810'))
writeFileSync('src/data/atlas-manifest.json', JSON.stringify({ source: { repository: 'https://github.com/ashemag/human-atlas', revision }, anatomia, superficie, correspondencias }, null, 2) + '\n')
writeFileSync('public/atlas-creditos.txt', readFileSync(join(origem, 'public/ATTRIBUTION.md'), 'utf8') + `\n\nHumano: source Human Atlas revision ${revision}. Extracted mapped muscles, skeleton and skin; repacked binary buffers. Skin deformations are illustrative, not calibrated to body fat measurements.\n\n` + readFileSync(join(origem, 'LICENSE'), 'utf8'))
console.log(JSON.stringify({ muscles: correspondencias.filter(m => m.parts.length).length, unavailable: correspondencias.filter(m => !m.parts.length).map(m => m.id), anatomyMB: anatomia.gzipBytes / 1e6, skinMB: superficie.gzipBytes / 1e6 }, null, 2))

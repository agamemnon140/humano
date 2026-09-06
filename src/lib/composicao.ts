export interface EntradaComposicao {
  peso: number
  gorduraAtual: number
  gorduraAlvo: number
  variacaoMassaLivre: number
}

export function calcularComposicao(e: EntradaComposicao) {
  if (!Object.values(e).every(Number.isFinite)) throw new Error('Preencha todos os campos com números válidos.')
  if (e.peso < 20 || e.peso > 350) throw new Error('Informe um peso entre 20 e 350 kg.')
  if (e.gorduraAtual < 3 || e.gorduraAtual > 65 || e.gorduraAlvo < 3 || e.gorduraAlvo > 65)
    throw new Error('Informe percentuais entre 3 e 65%. Os limites são de cálculo, não recomendações.')
  if (Math.abs(e.variacaoMassaLivre) > 30) throw new Error('A variação de massa livre deve ficar entre −30 e 30 kg.')
  const gorduraAtualKg = e.peso * e.gorduraAtual / 100
  const massaLivreAtual = e.peso - gorduraAtualKg
  const massaLivreAlvo = massaLivreAtual + e.variacaoMassaLivre
  if (massaLivreAlvo <= 0) throw new Error('A massa livre de gordura do cenário precisa ser positiva.')
  const pesoAlvo = massaLivreAlvo / (1 - e.gorduraAlvo / 100)
  const gorduraAlvoKg = pesoAlvo - massaLivreAlvo
  return { gorduraAtualKg, massaLivreAtual, massaLivreAlvo, pesoAlvo, gorduraAlvoKg, variacaoPeso: pesoAlvo - e.peso, variacaoGordura: gorduraAlvoKg - gorduraAtualKg }
}

// Geometric illustration only. The reference skin has no measured body-fat %.
// Changes are bounded, bilateral and continuous; no exercise-to-hypertrophy rule.
export function deformarSuperficie(base: Float32Array, gorduraDelta: number, massaLivreDelta: number) {
  const saida = base.slice()
  const gordura = Math.max(-.22, Math.min(.32, gorduraDelta * .014))
  const massa = Math.max(-.12, Math.min(.18, massaLivreDelta * .012))
  const suave = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
  for (let i = 0; i < base.length; i += 3) {
    const x = base[i], y = base[i + 1], z = base[i + 2]
    const cintura = Math.exp(-Math.pow((y - 1.02) / .22, 2))
    const torso = Math.exp(-Math.pow((y - 1.28) / .19, 2))
    const coxa = Math.exp(-Math.pow((y - .65) / .22, 2))
    const foraDoBraco = Math.exp(-Math.pow(x / .20, 6))
    const fator = 1 + gordura * (cintura * foraDoBraco + .35 * coxa) + massa * (.7 * torso + .5 * coxa)
    // Scale around each leg/arm axis, rather than moving limb centers apart.
    const centro = Math.sign(x) * (.083 * (1 - suave(.78, .95, y)) + .255 * suave(.18, .28, Math.abs(x)) * suave(.85, 1, y))
    saida[i] = centro + (x - centro) * fator
    saida[i + 2] = z * fator + gordura * cintura * foraDoBraco * .035
  }
  return saida
}

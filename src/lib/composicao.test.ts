import { describe, expect, it } from 'vitest'
import { calcularComposicao, deformarSuperficie } from './composicao'

const exemplo = { peso: 80, gorduraAtual: 25, gorduraAlvo: 15, variacaoMassaLivre: 0 }
describe('cenários de composição', () => {
  it('preserva massa livre no exemplo de 80 kg e 25% → 15%', () => {
    const r = calcularComposicao(exemplo)
    expect(r.massaLivreAlvo).toBe(60)
    expect(r.pesoAlvo).toBeCloseTo(70.588235)
    expect(r.gorduraAlvoKg / r.pesoAlvo).toBeCloseTo(.15)
    expect(r.variacaoPeso).toBeCloseTo(r.variacaoGordura)
  })
  it('conserva as massas com ganho ou perda de massa livre', () => {
    for (const variacaoMassaLivre of [-5, 0, 5]) {
      const r = calcularComposicao({ ...exemplo, variacaoMassaLivre })
      expect(r.gorduraAlvoKg + r.massaLivreAlvo).toBeCloseTo(r.pesoAlvo)
      expect(r.variacaoPeso).toBeCloseTo(r.variacaoGordura + variacaoMassaLivre)
    }
  })
  it('sem mudança de entradas não há mudança de composição', () => {
    const r = calcularComposicao({ ...exemplo, gorduraAlvo: 25 })
    expect(r.pesoAlvo).toBe(80)
    expect(r.variacaoGordura).toBe(0)
  })
  it.each([
    { peso: NaN }, { peso: Infinity }, { peso: 0 }, { gorduraAtual: 100 },
    { gorduraAlvo: 0 }, { gorduraAlvo: 100 }, { variacaoMassaLivre: 31 },
    { peso: 20, gorduraAtual: 65, variacaoMassaLivre: -10 },
  ])('rejeita entradas inválidas %j', dados => {
    expect(() => calcularComposicao({ ...exemplo, ...dados })).toThrow()
  })
})
describe('silhueta ilustrativa', () => {
  const base = new Float32Array([.12, 1.02, .10, -.12, 1.02, .10, 0, 1.7, 0])
  it('mantém a referência e sua simetria, sem mutar os dados de origem', () => {
    expect(deformarSuperficie(base, 0, 0)).toEqual(base)
    const nova = deformarSuperficie(base, -8, 2)
    expect(nova[0]).toBeCloseTo(-nova[3])
    expect(nova[2]).toBeCloseTo(nova[5])
    expect(nova[1]).toBe(base[1])
    expect(base[0]).toBeCloseTo(.12)
    expect(nova[0]).toBeLessThan(base[0])
  })
  it('limita extremos geométricos a valores finitos', () => {
    expect([...deformarSuperficie(base, 1000, -1000)].every(Number.isFinite)).toBe(true)
  })
})

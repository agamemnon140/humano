import { describe, expect, it } from 'vitest'
import { atividades, musculoPorId } from '../data'
import { FILTRO_VAZIO, filtrarAtividades, filtroAtivo } from './filtros'
import { contemTodosTermos, normalizar } from './texto'

const filtrar = (parcial: Partial<typeof FILTRO_VAZIO>) =>
  filtrarAtividades(atividades, { ...FILTRO_VAZIO, ...parcial }, musculoPorId).map((a) => a.id)

describe('normalizacao de texto', () => {
  it('remove acentos e caixa', () => {
    expect(normalizar('Glúteo Máximo')).toBe('gluteo maximo')
    expect(normalizar('ABDÔMEN')).toBe('abdomen')
  })

  it('e idempotente', () => {
    const uma = normalizar('Tríceps Braquial')
    expect(normalizar(uma)).toBe(uma)
  })

  it('todos os termos precisam bater, em qualquer ordem', () => {
    expect(contemTodosTermos('Supino reto com barra', 'barra supino')).toBe(true)
    expect(contemTodosTermos('Supino reto com barra', 'supino halteres')).toBe(false)
    expect(contemTodosTermos('qualquer coisa', '   ')).toBe(true)
  })
})

describe('filtro de atividades', () => {
  it('sem filtro nenhum devolve tudo', () => {
    expect(filtrar({})).toHaveLength(atividades.length)
    expect(filtroAtivo(FILTRO_VAZIO)).toBe(false)
  })

  it('busca em portugues, em ingles e por sinonimo', () => {
    expect(filtrar({ busca: 'supino reto' })).toContain('supino-com-barra')
    expect(filtrar({ busca: 'bench press' })).toContain('supino-com-barra')
    expect(filtrar({ busca: 'deadlift' })).toContain('levantamento-terra')
    expect(filtrar({ busca: 'bulgaro' })).toContain('agachamento-bulgaro')
  })

  it('busca sem acento encontra nome acentuado', () => {
    expect(filtrar({ busca: 'triceps' })).toContain('triceps-testa')
    expect(filtrar({ busca: 'natacao' })).toContain('natacao-crawl')
  })

  it('busca tambem alcanca o nome dos musculos trabalhados', () => {
    expect(filtrar({ busca: 'gluteo maximo' })).toContain('ponte-de-gluteo')
  })

  it('facetas combinam com E, nao com OU', () => {
    const soCorpo = filtrar({ tipos: ['forca'], equipamentos: ['peso-corporal'] })
    expect(soCorpo).toContain('flexao-de-bracos')
    expect(soCorpo).not.toContain('supino-com-barra')
  })

  it('filtra por padrao de movimento', () => {
    const agachamentos = filtrar({ padroes: ['agachamento'] })
    expect(agachamentos).toContain('agachamento-livre')
    expect(agachamentos).not.toContain('levantamento-terra')
  })

  it('filtra por musculo alvo em qualquer nivel', () => {
    const doGluteo = filtrar({ musculoId: 'gluteo-maximo' })
    expect(doGluteo).toContain('ponte-de-gluteo')
    expect(doGluteo).toContain('agachamento-livre')
    expect(doGluteo).not.toContain('rosca-direta')
  })

  it('filtra por regiao a partir dos musculos envolvidos', () => {
    const dePeito = filtrar({ regioes: ['peito'] })
    expect(dePeito).toContain('supino-com-barra')
    expect(dePeito).not.toContain('panturrilha-em-pe')
  })

  it('busca sem resultado devolve lista vazia, nao tudo', () => {
    expect(filtrar({ busca: 'zzzzz' })).toEqual([])
  })
})

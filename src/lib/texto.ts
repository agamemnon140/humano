/** Marcas diacriticas combinantes U+0300..U+036F. Construida a partir de uma
 *  string ASCII para o ficheiro nao depender da sua propria codificacao. */
const DIACRITICOS = new RegExp('[\u0300-\u036f]', 'g')

/** Remove acentos e caixa para busca. Gluteo com e sem acento batem. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim()
}

/** Todos os termos de `agulha` aparecem em `palheiro`, em qualquer ordem. */
export function contemTodosTermos(palheiro: string, agulha: string): boolean {
  const alvo = normalizar(palheiro)
  const termos = normalizar(agulha).split(/\s+/).filter(Boolean)
  if (termos.length === 0) return true
  return termos.every((t) => alvo.includes(t))
}

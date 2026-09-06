import type { RenderizadorCorpo } from '../../types'
import { CorpoInterativo } from './CorpoInterativo'

/**
 * PONTO UNICO DE TROCA DO RENDERIZADOR.
 *
 * Todas as abas importam `Corpo`. O adaptador escolhe Three.js ou SVG,
 * preservando PropsCorpo e a cobertura das ausencias no modelo anatomico.
 */
export const Corpo: RenderizadorCorpo = CorpoInterativo

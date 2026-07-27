import type { RenderizadorCorpo } from '../../types'
import { CorpoSVG } from './CorpoSVG'

/**
 * PONTO UNICO DE TROCA DO RENDERIZADOR.
 *
 * Todas as abas importam `Corpo`, nunca `CorpoSVG`. Trocar o mapa 2D por um
 * modelo 3D (Three.js) e substituir esta linha por `Corpo3D` — desde que ele
 * satisfaca `PropsCorpo`, que so fala de realces semanticos, e nao de
 * geometria, viewBox ou cores.
 */
export const Corpo: RenderizadorCorpo = CorpoSVG

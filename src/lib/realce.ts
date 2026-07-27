import {
  PRECEDENCIA_TOM,
  ROTULO_NIVEL,
  type Atividade,
  type EstadoRealce,
  type Lesao,
  type MapaDeRealce,
  type MotivoRealce,
  type MusculoId,
  type NivelAtivacao,
  type TomRealce,
} from '../types'

const INTENSIDADE: Record<TomRealce, number> = {
  primario: 1,
  fortalecer: 0.95,
  alerta: 1,
  selecionado: 1,
  secundario: 0.72,
  encurta: 0.72,
  inibe: 0.66,
  estabilizador: 0.48,
  lacuna: 0.3,
  neutro: 0,
}

export const ROTULO_TOM: Record<TomRealce, string> = {
  primario: ROTULO_NIVEL.primario,
  secundario: ROTULO_NIVEL.secundario,
  estabilizador: ROTULO_NIVEL.estabilizador,
  encurta: 'Encurta',
  inibe: 'Inibe',
  alerta: 'Atenção',
  fortalecer: 'Fortalecer',
  lacuna: 'Sem trabalho',
  selecionado: 'Selecionado',
  neutro: '—',
}

export function criarEstado(tom: TomRealce, motivos: MotivoRealce[], rotulo?: string): EstadoRealce {
  return {
    tom,
    intensidade: INTENSIDADE[tom],
    rotulo: rotulo ?? ROTULO_TOM[tom],
    motivos,
  }
}

function pousar(mapa: MapaDeRealce, id: MusculoId, estado: EstadoRealce): void {
  const atual = mapa.get(id)
  if (!atual) {
    mapa.set(id, estado)
    return
  }
  // Mesmo musculo tocado duas vezes pela mesma fonte: guarda o tom mais forte
  // e acumula os motivos, para o painel de detalhe explicar as duas razoes.
  const motivos = [...atual.motivos, ...estado.motivos]
  const vencedor = PRECEDENCIA_TOM[estado.tom] > PRECEDENCIA_TOM[atual.tom] ? estado : atual
  mapa.set(id, { ...vencedor, motivos })
}

export function realceDeAtividade(atividade: Atividade): MapaDeRealce {
  const mapa: MapaDeRealce = new Map()

  const niveis: [NivelAtivacao, MusculoId[]][] = [
    ['primario', atividade.primarios],
    ['secundario', atividade.secundarios],
    ['estabilizador', atividade.estabilizadores],
  ]

  for (const [nivel, ids] of niveis) {
    for (const id of ids) {
      pousar(mapa, id, criarEstado(nivel, [{ tipo: 'ativacao', nivel, atividadeId: atividade.id }]))
    }
  }

  for (const id of atividade.encurta) {
    pousar(mapa, id, criarEstado('encurta', [{ tipo: 'encurta', atividadeId: atividade.id }]))
  }
  for (const id of atividade.inibe) {
    pousar(mapa, id, criarEstado('inibe', [{ tipo: 'inibe', atividadeId: atividade.id }]))
  }

  return mapa
}

export function realceDeMusculo(id: MusculoId): MapaDeRealce {
  return new Map([[id, criarEstado('selecionado', [{ tipo: 'selecao-direta' }])]])
}

export function realceDeLesao(lesao: Lesao): MapaDeRealce {
  const mapa: MapaDeRealce = new Map()
  for (const id of lesao.fortalecer.valor) {
    pousar(mapa, id, criarEstado('fortalecer', [{ tipo: 'lesao-fortalecer', lesaoId: lesao.id }]))
  }
  for (const id of lesao.alongarOuMobilizar.valor) {
    pousar(mapa, id, criarEstado('encurta', [{ tipo: 'lesao-alongar', lesaoId: lesao.id }], 'Alongar ou mobilizar'))
  }
  return mapa
}

/** Precedencia por PRECEDENCIA_TOM, e nao pela ordem dos argumentos: fundir
 *  e comutativo, o que os testes verificam explicitamente. */
export function fundirRealces(...mapas: MapaDeRealce[]): MapaDeRealce {
  const saida: MapaDeRealce = new Map()
  for (const mapa of mapas) {
    for (const [id, estado] of mapa) {
      const atual = saida.get(id)
      if (!atual) {
        saida.set(id, { ...estado, motivos: [...estado.motivos] })
        continue
      }
      const vencedor = PRECEDENCIA_TOM[estado.tom] > PRECEDENCIA_TOM[atual.tom] ? estado : atual
      saida.set(id, { ...vencedor, motivos: [...atual.motivos, ...estado.motivos] })
    }
  }
  return saida
}

import { useEffect, useRef, useState } from 'react'
import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { atlas, carregarAtlas } from '../../lib/atlas'
import { deformarSuperficie } from '../../lib/composicao'
import { musculoPorId } from '../../data'
import type { PropsCorpo } from '../../types'

export interface SincronizacaoCamera {
  ouvintes: Set<(posicao: number[], alvo: number[]) => void>
}

interface Props extends PropsCorpo {
  superficie?: { gorduraDelta: number; massaLivreDelta: number }
  onFalha?: () => void
  sincronizacao?: SincronizacaoCamera
}

export default function CenaCorpo(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const atualizar = useRef<(() => void) | null>(null)
  const latest = useRef(props)
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando')
  const pele = !!props.superficie
  const sincronizacao = props.sincronizacao
  useEffect(() => { latest.current = props; atualizar.current?.() }, [props])

  useEffect(() => {
    const el = host.current!
    let encerrado = false, frame = 0
    let renderer: T.WebGLRenderer
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }) }
    catch { setEstado('erro'); latest.current.onFalha?.(); return }
    setEstado('carregando')
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = T.SRGBColorSpace
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    el.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', pele ? 'Silhueta ilustrativa. Arraste para girar.' : 'Anatomia 3D. Arraste para girar, toque para selecionar um músculo. A lista de músculos oferece acesso por teclado.')
    const scene = new T.Scene()
    const camera = new T.PerspectiveCamera(34, 1, .01, 30)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = .9
    controls.maxDistance = 6
    controls.minPolarAngle = .35
    controls.maxPolarAngle = Math.PI - .35
    controls.target.set(0, .87, 0)
    scene.add(new T.HemisphereLight('#ffffff', '#9ba9b4', 2))
    const key = new T.DirectionalLight('#fff3e4', 3)
    key.position.set(-2, 4, 4); scene.add(key)
    const rim = new T.DirectionalLight('#c8e5ef', 2)
    rim.position.set(2, 2, -3); scene.add(rim)
    const meshes: T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>[] = []
    const geometries: T.BufferGeometry[] = []
    const materials: T.Material[] = []
    const pedestal = new T.Mesh(new T.CylinderGeometry(.43, .45, .012, 64), new T.MeshStandardMaterial({ color: '#dce3e1', roughness: .9 }))
    pedestal.position.y = -.016
    scene.add(pedestal); geometries.push(pedestal.geometry); materials.push(pedestal.material)
    const render = () => {
      if (encerrado || frame) return
      frame = requestAnimationFrame(() => { frame = 0; if (!encerrado) renderer.render(scene, camera) })
    }
    let vistaAnterior = ''
    const fit = () => {
      const distancia = Math.max(3.25, .83 / Math.max(.2, camera.aspect) / (2 * Math.tan(T.MathUtils.degToRad(17))))
      camera.position.set(0, .9, latest.current.vista === 'costas' ? -distancia : distancia)
      controls.target.set(0, .87, 0)
      controls.update()
    }
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      fit(); render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    controls.addEventListener('change', render)
    let recebendoCamera = false
    const receberCamera = (posicao: number[], alvo: number[]) => {
      recebendoCamera = true
      camera.position.fromArray(posicao); controls.target.fromArray(alvo)
      controls.update(); render()
      recebendoCamera = false
    }
    const compartilharCamera = () => {
      if (recebendoCamera) return
      sincronizacao?.ouvintes.forEach(receber => {
        if (receber !== receberCamera) receber(camera.position.toArray(), controls.target.toArray())
      })
    }
    sincronizacao?.ouvintes.add(receberCamera)
    controls.addEventListener('change', compartilharCamera)
    let original: Float32Array | null = null
    let deformacaoAnterior = ''
    const update = () => {
      const p = latest.current
      if (vistaAnterior !== p.vista) { vistaAnterior = p.vista; fit() }
      const css = getComputedStyle(el)
      for (const mesh of meshes) {
        const id = mesh.userData.muscle as string | null
        const musculo = id ? musculoPorId.get(id) : undefined
        mesh.visible = pele || !musculo || p.camada === 'superficial' || musculo.camada === 'profunda'
        const realce = id ? p.realces.get(id) : undefined
        const selecionado = !!id && id === p.selecionado
        const cor = selecionado ? '#dbac50' : realce ? css.getPropertyValue(`--tom-${realce.tom}`).trim() : ''
        mesh.material.color.set(cor || (pele ? '#c6aea0' : id ? '#b47668' : '#e2ded1'))
        mesh.material.emissive.set(cor || '#000000')
        mesh.material.emissiveIntensity = selecionado ? .2 : realce ? .10 : 0
        if (pele && p.superficie && original) {
          const chave = JSON.stringify(p.superficie)
          if (chave !== deformacaoAnterior) {
            mesh.geometry.setAttribute('position', new T.BufferAttribute(deformarSuperficie(original, p.superficie.gorduraDelta, p.superficie.massaLivreDelta), 3))
            mesh.geometry.computeVertexNormals()
            mesh.geometry.computeBoundingSphere()
            deformacaoAnterior = chave
          }
        }
      }
      render()
    }
    atualizar.current = update
    const arquivo = pele ? atlas.superficie : atlas.anatomia
    carregarAtlas(arquivo).then(buffer => {
      if (encerrado) return
      const grupos = new Map<string, T.BufferGeometry[]>()
      for (const part of arquivo.parts) {
        const g = new T.BufferGeometry()
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, part.positions, part.vertexCount * 3), 3))
        g.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, part.normals, part.vertexCount * 3), 3, true))
        g.setIndex(new T.BufferAttribute(new Uint32Array(buffer, part.indices, part.indexCount), 1))
        const grupo = part.muscle ?? 'referencia'
        const lista = grupos.get(grupo) ?? []
        lista.push(g); grupos.set(grupo, lista)
      }
      for (const [id, partes] of grupos) {
        const geometry = mergeGeometries(partes, false)
        partes.forEach(g => g.dispose())
        if (!geometry) throw new Error('Geometria inválida')
        geometries.push(geometry)
        const material = new T.MeshStandardMaterial({ roughness: .68, metalness: .02, side: T.DoubleSide })
        materials.push(material)
        const mesh = new T.Mesh(geometry, material)
        mesh.userData.muscle = id === 'referencia' ? null : id
        if (pele) original = (geometry.getAttribute('position').array as Float32Array).slice()
        meshes.push(mesh); scene.add(mesh)
      }
      update(); setEstado('pronto')
    }).catch(erro => { if (!encerrado) { console.error('Falha ao carregar atlas:', erro); setEstado('erro'); latest.current.onFalha?.() } })

    const raycaster = new T.Raycaster()
    const pointer = new T.Vector2()
    const pick = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      // Include the skeleton as an occluder; never select a muscle behind a bone.
      const hit = raycaster.intersectObjects(meshes.filter(m => m.visible), false)[0]
      return (hit?.object.userData.muscle as string | undefined) ?? null
    }
    const pointers = new Set<number>()
    let inicio: { id: number; x: number; y: number; valido: boolean } | null = null
    const down = (e: PointerEvent) => {
      pointers.add(e.pointerId)
      if (pointers.size === 1) inicio = { id: e.pointerId, x: e.clientX, y: e.clientY, valido: e.button === 0 }
      else if (inicio) inicio.valido = false
    }
    const move = (e: PointerEvent) => {
      if (inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 7) inicio.valido = false
      if (!pele && e.pointerType === 'mouse' && !e.buttons) latest.current.onDestacar?.(pick(e))
    }
    const up = (e: PointerEvent) => {
      if (!pele && inicio?.id === e.pointerId && inicio.valido && pointers.size === 1 && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) <= 7) latest.current.onSelecionar(pick(e))
      pointers.delete(e.pointerId); inicio = null
    }
    const cancel = (e: PointerEvent) => { pointers.delete(e.pointerId); inicio = null }
    const leave = () => latest.current.onDestacar?.(null)
    const lost = (e: Event) => { e.preventDefault(); setEstado('erro'); latest.current.onFalha?.() }
    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('webglcontextlost', lost)
    resize(); update()
    return () => {
      encerrado = true; atualizar.current = null
      cancelAnimationFrame(frame)
      observer.disconnect(); controls.dispose()
      sincronizacao?.ouvintes.delete(receberCamera)
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('webglcontextlost', lost)
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose())
      renderer.dispose(); canvas.remove()
    }
  }, [pele, sincronizacao])

  return <div className="cena-corpo" ref={host} data-estado={estado}>
    {estado === 'carregando' && <div className="cena-status" role="status"><span className="carregando-anel" />Carregando {pele ? 'silhueta' : 'anatomia'}…<small>{pele ? '0,6' : '8,4'} MB · disponível offline após carregar</small></div>}
    {estado === 'erro' && <div className="cena-status" role="status">Visual 3D indisponível.<small>{pele ? 'Os cálculos continuam disponíveis.' : 'Use o mapa 2D.'}</small></div>}
  </div>
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LINE, LINE_DIR, polishLinePoint } from '../../config/birth'
import { content } from '../../content'
import { getAppState } from '../../story/appState'
import { birth } from './state'

/** HDR neon gold (above the bloom threshold); toneMapped off so it stays bright. */
const NEON = new THREE.Color(2.6, 1.75, 0.6)
const LABEL = { width: 1.3, height: 0.13, px: [1024, 102] as const, color: '#f2c46d' }

function drawLabel(canvas: HTMLCanvasElement, texture: THREE.CanvasTexture) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '500 56px "IBM Plex Mono", monospace'
  ctx.fillStyle = LABEL.color
  ctx.textBaseline = 'middle'
  ctx.fillText(content.birth.polishLabel.toUpperCase(), 8, canvas.height / 2)
  texture.needsUpdate = true
}

/**
 * The neon polish line (Act 7): a thin glowing quad tilted LINE.angle, moving right to left in front of the ring
 * (config/birth.ts polishLinePoint), with the label "processing and polishing" riding above its top end. Bloom does
 * the glow. Shown only while the line passes.
 */
export function PolishLine() {
  const line = useMemo(() => new THREE.PlaneGeometry(LINE.width, LINE.length), [])
  const lineMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: NEON, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  )
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = LABEL.px[0]
    c.height = LABEL.px[1]
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return { canvas: c, texture: t }
  }, [])
  const label = useMemo(() => new THREE.PlaneGeometry(LABEL.width, LABEL.height).translate(LABEL.width / 2, 0, 0), [])
  const labelMat = useMemo(() => new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, depthWrite: false }), [texture])
  useEffect(() => {
    drawLabel(canvas, texture)
    // The webfont may load after mount: redraw once it is ready (texture upload only, no shader compile).
    document.fonts?.load('500 56px "IBM Plex Mono"').then(() => drawLabel(canvas, texture))
    return () => {
      line.dispose()
      lineMat.dispose()
      label.dispose()
      labelMat.dispose()
      texture.dispose()
    }
  }, [canvas, texture, line, lineMat, label, labelMat])

  const group = useRef<THREE.Group>(null)
  const tag = useRef<THREE.Mesh>(null)
  const p = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const g = group.current
    const t = tag.current
    if (!g || !t) return
    polishLinePoint(birth.line, p)
    g.position.copy(p)
    t.position.copy(p).addScaledVector(LINE_DIR, LINE.length / 2 + 0.08)
    // Soft in and out at the ends of the pass.
    const fade = Math.min(1, birth.line / 0.06, (1 - birth.line) / 0.06)
    lineMat.opacity = fade
    labelMat.opacity = fade
    const show = getAppState().phase === 'loading' || (birth.line > 0.001 && birth.line < 0.999)
    g.visible = show
    t.visible = show
  })

  return (
    <>
      <group ref={group} rotation-z={LINE.angle - Math.PI / 2}>
        <mesh geometry={line} material={lineMat} renderOrder={30} />
      </group>
      <mesh ref={tag} geometry={label} material={labelMat} renderOrder={31} />
    </>
  )
}

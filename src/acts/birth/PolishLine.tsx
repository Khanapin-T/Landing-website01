import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LINE, LINE_DIR, POLISH, polishLinePoint } from '../../config/birth'
import { content } from '../../content'
import { getAppState } from '../../story/appState'
import { birth } from './state'
import { wipeView } from './useWipeClip'

/** HDR neon gold (above the bloom threshold); toneMapped off so it stays bright. */
export const NEON = new THREE.Color(2.6, 1.75, 0.6)
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
 * the glow. Shown from the start of the pass until the screen-space WipeLine takes over (birth.edge > 0); the label
 * then follows the wipe line's top end (wipeView, unprojected onto the line's plane) and fades out.
 */
export function PolishLine() {
  const line = useMemo(() => new THREE.PlaneGeometry(LINE.width, LINE.length), [])
  const lineMat = useMemo(
    // depthTest off: the turned ring never hides the line or its label.
    () =>
      new THREE.MeshBasicMaterial({
        color: NEON,
        toneMapped: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
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
  const labelMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, depthWrite: false, depthTest: false }),
    [texture],
  )
  useEffect(() => {
    let alive = true
    drawLabel(canvas, texture)
    // The webfont may load after mount: redraw once it is ready (texture upload only, no shader compile).
    document.fonts
      ?.load('500 56px "IBM Plex Mono"')
      .then(() => {
        if (alive) drawLabel(canvas, texture)
      })
      .catch(() => {})
    return () => {
      alive = false
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
  const ray = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }) => {
    const g = group.current
    const t = tag.current
    if (!g || !t) return
    polishLinePoint(birth.line, p)
    g.position.copy(p)
    // Soft in at the start of the pass; at its end the line stays for the hand-over to WipeLine.
    const fadeIn = Math.min(1, birth.line / 0.06)
    lineMat.opacity = fadeIn
    const loading = getAppState().phase === 'loading'
    g.visible = loading || (birth.line > 0.001 && birth.edge <= 0)

    if (birth.edge <= 0) {
      t.position.copy(p).addScaledVector(LINE_DIR, LINE.length / 2 + 0.08)
      labelMat.opacity = fadeIn
    } else {
      // Ride with the top end of the screen-space line (WipeLine has written wipeView this frame), on the line's plane.
      const l = wipeView.line
      const ex = l.x + Math.cos(l.angle) * l.half
      const ey = l.y + Math.sin(l.angle) * l.half
      ray.set(ex / wipeView.aspect, ey, 0.5).unproject(camera).sub(camera.position).normalize()
      const k = (POLISH.z + LINE.zFront - camera.position.z) / ray.z
      t.position.copy(camera.position).addScaledVector(ray, k)
      t.position.x += Math.cos(l.angle) * 0.08
      t.position.y += Math.sin(l.angle) * 0.08
      labelMat.opacity = Math.max(0, 1 - birth.edge / 0.35)
    }
    t.visible = loading || (birth.line > 0.001 && labelMat.opacity > 0.001)
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

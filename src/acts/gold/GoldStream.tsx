import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { goldFillVisible, streamSpan } from '../../config/gold'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'

/** A little thinner than the trunk (radius 0.08), so the stream runs down inside it. */
export const GOLD_STREAM_RADIUS = 0.05
/** HDR molten yellow-white: crosses the bloom threshold. */
const STREAM_COLOR = new THREE.Color(4.2, 2.3, 0.7)

/**
 * Act 5's pour: ONE continuous molten stream on the flask axis (world x = z = 0; the flask is flipped, funnel up). Its
 * top is above the frame; during the first part of the fill the tip falls down the axis to the far end of the trunk,
 * then the stream ends at the rising gold front (config/gold.ts `streamSpan`). Unlit and HDR, so it glows through
 * the bloom. Visible while loading (Precompile compiles it) and otherwise only while 0 < fill < 1 with X-ray on and
 * the flask fully flipped. Driven only by story.flask; no React state.
 */
export function GoldStream() {
  // Unit cylinder from y = 0 (top) down to y = -1 (bottom), scaled to the current span.
  const geometry = useMemo(() => new THREE.CylinderGeometry(GOLD_STREAM_RADIUS, GOLD_STREAM_RADIUS, 1, 16, 1, false).translate(0, -0.5, 0), [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: STREAM_COLOR, toneMapped: false }), [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const f = story.flask
    const span = streamSpan(f.fill)
    const len = span.top - span.bottom
    m.position.y = span.top
    m.scale.y = Math.max(len, 0.001)
    m.visible = getAppState().phase === 'loading' || (goldFillVisible(f) && f.fill < 1 && len > 0.001)
  })

  return <mesh ref={ref} geometry={geometry} material={material} />
}

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MOLD, investmentLevelY } from '../../config/mold'
import { getAppState } from '../../story/appState'
import { mold } from './state'
import {
  INVESTMENT_RADIUS,
  INVESTMENT_RENDER_ORDER,
  STREAM_RADIUS,
  STREAM_TOP_Y,
  createInvestmentMaterial,
  createInvestmentUniforms,
  pourPoint,
  pourStrength,
  streamSpan,
} from './investmentMaterial'

const { bottomY, topY } = MOLD.investment
const POUR_AT = pourPoint()

/**
 * The investment in flask-local space (the flask is seated and at rest while it shows, so flask-local Y = world Y):
 * the opaque liquid column cut at the level, the surface disc and the pour stream falling at the side of the flask.
 * Reads mold.fill / mold.boil and the clock in useFrame; no React state.
 */
export function Investment() {
  const shared = useMemo(createInvestmentUniforms, [])
  const mats = useMemo(
    () => ({
      body: createInvestmentMaterial('body', shared),
      surface: createInvestmentMaterial('surface', shared),
      stream: createInvestmentMaterial('stream', shared),
    }),
    [shared],
  )
  const body = useMemo(
    () => new THREE.CylinderGeometry(INVESTMENT_RADIUS, INVESTMENT_RADIUS, topY - bottomY, 64, 1, true).translate(0, (bottomY + topY) / 2, 0),
    [],
  )
  // A disc with radial subdivisions (a CircleGeometry has no inner vertices to ripple), laid flat, normal +Y.
  const disc = useMemo(() => new THREE.RingGeometry(0, INVESTMENT_RADIUS, 128, 40).rotateX(-Math.PI / 2), [])
  // Unit stream from y = 0 down to y = -1 (capped ends), scaled to the current span.
  const stream = useMemo(() => new THREE.CylinderGeometry(STREAM_RADIUS, STREAM_RADIUS, 1, 16, 48, false).translate(0, -0.5, 0), [])

  useEffect(
    () => () => {
      body.dispose()
      disc.dispose()
      stream.dispose()
    },
    [body, disc, stream],
  )
  useEffect(() => () => Object.values(mats).forEach((m) => m.material.dispose()), [mats])

  const bodyRef = useRef<THREE.Group>(null)
  const surfaceRef = useRef<THREE.Mesh>(null)
  const streamRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const loading = getAppState().phase === 'loading'
    const fill = mold.fill
    const level = investmentLevelY(fill)
    shared.uLevelY.value = level
    shared.uTime.value = clock.elapsedTime
    shared.uBoil.value = mold.boil
    shared.uPour.value = pourStrength(fill)

    if (bodyRef.current) bodyRef.current.visible = loading || fill > 0.001
    if (surfaceRef.current) surfaceRef.current.position.y = level
    const s = streamRef.current
    if (s) {
      const fall = Math.max(STREAM_TOP_Y - level, 0.001)
      const span = streamSpan(fill)
      const len = (span.bottom - span.top) * fall
      s.position.y = STREAM_TOP_Y - span.top * fall
      s.scale.y = Math.max(len, 0.001)
      mats.stream.uniforms.uStreamLen.value = s.scale.y
      mats.stream.uniforms.uStreamStart.value = span.top * fall
      s.visible = loading || len > 0.001
    }
  })

  // Everything starts visible: Precompile (traverseVisible) runs before the first frame sets the real values.
  return (
    <group>
      <group ref={bodyRef}>
        <mesh geometry={body} material={mats.body.material} renderOrder={INVESTMENT_RENDER_ORDER.body} />
        <mesh
          ref={surfaceRef}
          geometry={disc}
          material={mats.surface.material}
          renderOrder={INVESTMENT_RENDER_ORDER.surface}
          position-y={bottomY}
        />
      </group>
      <mesh
        ref={streamRef}
        geometry={stream}
        material={mats.stream.material}
        renderOrder={INVESTMENT_RENDER_ORDER.stream}
        position={[POUR_AT.x, STREAM_TOP_Y, POUR_AT.z]}
      />
    </group>
  )
}

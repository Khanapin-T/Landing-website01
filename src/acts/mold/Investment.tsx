import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MOLD, investmentLevelY } from '../../config/mold'
import { getAppState } from '../../story/appState'
import { mold } from './state'
import {
  INVESTMENT_RADIUS,
  INVESTMENT_RENDER_ORDER,
  createInvestmentMaterial,
  createInvestmentUniforms,
} from './investmentMaterial'

const { bottomY, topY } = MOLD.investment
const STREAM_RADIUS = 0.06
/** The pour starts above the top edge of the frame. */
const STREAM_TOP_Y = MOLD.flask.bottomY + MOLD.flask.height + 1.5

/**
 * The investment in flask-local space (the flask is seated and at rest while it shows, so flask-local Y = world Y):
 * the liquid body (back and front halves cut at the level), the rippling surface disc and the pour stream.
 * Reads mold.fill / mold.boil and the clock in useFrame; no React state.
 */
export function Investment() {
  const shared = useMemo(createInvestmentUniforms, [])
  const mats = useMemo(
    () => ({
      back: createInvestmentMaterial('back', shared),
      front: createInvestmentMaterial('front', shared),
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
  const disc = useMemo(() => new THREE.RingGeometry(0, INVESTMENT_RADIUS, 64, 32).rotateX(-Math.PI / 2), [])
  // Unit stream from y = 0 down to y = -1, scaled to the current length.
  const stream = useMemo(() => new THREE.CylinderGeometry(STREAM_RADIUS, STREAM_RADIUS, 1, 12, 24, true).translate(0, -0.5, 0), [])

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
    shared.uPour.value = Math.min(1, Math.max(0, Math.min(fill, 1 - fill) * 20))

    if (bodyRef.current) bodyRef.current.visible = loading || fill > 0.001
    if (surfaceRef.current) surfaceRef.current.position.y = level
    const s = streamRef.current
    if (s) {
      const len = Math.max(STREAM_TOP_Y - level, 0.001)
      s.scale.y = len
      mats.stream.uniforms.uStreamLen.value = len
      s.visible = loading || (fill > 0.001 && fill < 0.999)
    }
  })

  // Everything starts visible: Precompile (traverseVisible) runs before the first frame sets the real values.
  return (
    <group>
      <group ref={bodyRef}>
        <mesh geometry={body} material={mats.back.material} renderOrder={INVESTMENT_RENDER_ORDER.back} />
        <mesh geometry={body} material={mats.front.material} renderOrder={INVESTMENT_RENDER_ORDER.front} />
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
        position-y={STREAM_TOP_Y}
      />
    </group>
  )
}

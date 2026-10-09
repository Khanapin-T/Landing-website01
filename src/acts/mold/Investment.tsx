import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MOLD, investmentLevelY } from '../../config/mold'
import { funnelProfile } from '../../scene/furnace/funnel'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { mold } from './state'
import {
  INVESTMENT_RADIUS,
  INVESTMENT_RENDER_ORDER,
  STREAM_RADIUS,
  STREAM_TOP_Y,
  createInvestmentMaterial,
  createInvestmentUniforms,
  createPlugGeometry,
  investmentClipLevel,
  pourPoint,
  pourStrength,
  streamSpan,
} from './investmentMaterial'

const { bottomY, topY } = MOLD.investment
const POUR_AT = pourPoint()
/** The plugs are built around the middle of the flask (like the bores in Flask.tsx). */
const FLASK_MIDDLE_Y = MOLD.flask.bottomY + MOLD.flask.height / 2

/**
 * The investment in flask-local space (the flask is seated and at rest while it shows, so flask-local Y = world Y):
 * the opaque liquid column cut at the level, a plug in every flask hole (body material, cut at the same level; the
 * tape hides them until it comes off, then the holes show flush white plaster), the surface disc and the pour stream
 * falling at the side of the flask. The plugs line up with the holes because the flask spinner is at a whole number
 * of turns whenever the investment shows. Reads mold.fill / mold.boil and the clock in useFrame; no React state.
 */
export function Investment() {
  const shared = useMemo(createInvestmentUniforms, [])
  const mats = useMemo(
    () => ({
      body: createInvestmentMaterial('body', shared),
      surface: createInvestmentMaterial('surface', shared),
      stream: createInvestmentMaterial('stream', shared),
      funnel: createInvestmentMaterial('funnel', shared),
    }),
    [shared],
  )
  const body = useMemo(
    () => new THREE.CylinderGeometry(INVESTMENT_RADIUS, INVESTMENT_RADIUS, topY - bottomY, 64, 1, true).translate(0, (bottomY + topY) / 2, 0),
    [],
  )
  // A disc with radial subdivisions (a CircleGeometry has no inner vertices to ripple), laid flat, normal +Y.
  const plugs = useMemo(createPlugGeometry, [])
  const disc = useMemo(() => new THREE.RingGeometry(0, INVESTMENT_RADIUS, 128, 40).rotateX(-Math.PI / 2), [])
  // Unit stream from y = 0 down to y = -1 (capped ends), scaled to the current span.
  const stream = useMemo(() => new THREE.CylinderGeometry(STREAM_RADIUS, STREAM_RADIUS, 1, 16, 48, false).translate(0, -0.5, 0), [])
  // The funnel wall the crucible former leaves in the investment (world Y, from the flask bottom up to the trunk).
  const funnel = useMemo(() => new THREE.LatheGeometry(funnelProfile().map(([x, y]) => new THREE.Vector2(x, y)), 48), [])
  // Bottom cap: a flat annulus facing down at the investment bottom, its hole = the funnel mouth. Once the rubber base
  // has gone it closes the open column bottom (the body is front-face only), and it is the face that turns up when
  // the flask flips.
  const cap = useMemo(
    () => new THREE.RingGeometry(MOLD.base.coneRadius, INVESTMENT_RADIUS, 64).rotateX(Math.PI / 2).translate(0, bottomY, 0),
    [],
  )

  useEffect(
    () => () => {
      body.dispose()
      plugs.dispose()
      disc.dispose()
      stream.dispose()
      funnel.dispose()
      cap.dispose()
    },
    [body, plugs, disc, stream, funnel, cap],
  )
  useEffect(() => () => Object.values(mats).forEach((m) => m.material.dispose()), [mats])

  const bodyRef = useRef<THREE.Group>(null)
  const surfaceRef = useRef<THREE.Mesh>(null)
  const streamRef = useRef<THREE.Mesh>(null)
  const capRef = useRef<THREE.Mesh>(null)
  const funnelRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const loading = getAppState().phase === 'loading'
    const fill = mold.fill
    const level = investmentLevelY(fill)
    shared.uLevelY.value = investmentClipLevel(level, story.flask.flip)
    shared.uTime.value = clock.elapsedTime
    shared.uBoil.value = mold.boil
    shared.uPour.value = pourStrength(fill)

    // Act 6: the investment dissolves in the water (story.flask.wash); after that the flask is empty but for the tree.
    if (bodyRef.current) bodyRef.current.visible = loading || (fill > 0.001 && story.flask.wash < 0.5)
    // The cap and the funnel show only once the rubber base (and its cone) is gone: before that they would z-fight with it.
    const open = loading || mold.base <= 0.001
    if (capRef.current) capRef.current.visible = open
    if (funnelRef.current) funnelRef.current.visible = open
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
          geometry={plugs}
          material={mats.body.material}
          renderOrder={INVESTMENT_RENDER_ORDER.body}
          position-y={FLASK_MIDDLE_Y}
        />
        <mesh ref={capRef} geometry={cap} material={mats.body.material} renderOrder={INVESTMENT_RENDER_ORDER.body} />
        <mesh ref={funnelRef} geometry={funnel} material={mats.funnel.material} renderOrder={INVESTMENT_RENDER_ORDER.body} />
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

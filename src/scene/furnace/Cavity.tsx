import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { createSprueGeometry } from '../ring/sprue'
import { useRingLightGeometry } from '../ring/useRingGeometry'
import { slotPose } from '../tree/slots'
import { createTrunkGeometry } from '../tree/trunk'
import { cavityAlpha } from './cavityAlpha'
import { funnelProfile } from './funnel'
import { createXrayMaterial } from './xrayMaterial'

const CAVITY_COLOR = new THREE.Color(0.55, 1.3, 1.6)

/**
 * The hollow the burned tree leaves in the investment: the same shapes as the tree (trunk, four rings with their
 * sprues, the funnel) drawn as a glowing fresnel outline in the flask frame (mount it inside the flask rig). Visible
 * only in X-ray, after the burn (cavityAlpha). Act 5 reuses it for the metal pour.
 */
export function Cavity() {
  const ring = useRingLightGeometry()
  const sprue = useMemo(() => createSprueGeometry(), [])
  const trunk = useMemo(() => createTrunkGeometry(), [])
  const funnel = useMemo(() => new THREE.LatheGeometry(funnelProfile().map(([x, y]) => new THREE.Vector2(x, y)), 48), [])
  const poses = useMemo(() => [0, 1, 2, 3].map((i) => slotPose(i)), [])
  const { material, uniforms } = useMemo(() => createXrayMaterial(CAVITY_COLOR, { power: 1.6, base: 0.12, pushBack: true }), [])
  useEffect(() => () => sprue.dispose(), [sprue])
  useEffect(() => () => trunk.dispose(), [trunk])
  useEffect(() => () => funnel.dispose(), [funnel])
  useEffect(() => () => material.dispose(), [material])

  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const a = cavityAlpha(story.flask.xray, story.flask.burn)
    uniforms.uAlpha.value = a
    if (group.current) group.current.visible = getAppState().phase === 'loading' || a > 0.001
  })

  return (
    <group ref={group}>
      <mesh geometry={trunk} material={material} position={[0, MOLD.trunk.bottomY, 0]} />
      <mesh geometry={funnel} material={material} />
      {poses.map((p, i) => (
        <group key={i} position={p.position} quaternion={p.quaternion}>
          <mesh geometry={ring} material={material} />
          <mesh geometry={sprue} material={material} />
        </group>
      ))}
    </group>
  )
}

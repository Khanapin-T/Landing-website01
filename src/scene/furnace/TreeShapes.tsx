import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { createSprueGeometry } from '../ring/sprue'
import { useRingLightGeometry } from '../ring/useRingGeometry'
import { slotPose } from '../tree/slots'
import { createTrunkGeometry } from '../tree/trunk'
import { funnelProfile } from './funnel'

/**
 * The shapes of the casting tree and its funnel (trunk, funnel, four rings with their sprues), in the unflipped flask
 * frame, all drawn with one material. Mount it inside a group in the flask frame. Used by the cavity outline (Act 4) and
 * the solid gold fill (Act 5).
 */
export function TreeShapes({ material }: { material: THREE.Material }) {
  const ring = useRingLightGeometry()
  const sprue = useMemo(() => createSprueGeometry(), [])
  const trunk = useMemo(() => createTrunkGeometry(), [])
  const funnel = useMemo(() => new THREE.LatheGeometry(funnelProfile().map(([x, y]) => new THREE.Vector2(x, y)), 48), [])
  const poses = useMemo(() => [0, 1, 2, 3].map((i) => slotPose(i)), [])
  useEffect(() => () => sprue.dispose(), [sprue])
  useEffect(() => () => trunk.dispose(), [trunk])
  useEffect(() => () => funnel.dispose(), [funnel])

  return (
    <>
      <mesh geometry={trunk} material={material} position={[0, MOLD.trunk.bottomY, 0]} />
      <mesh geometry={funnel} material={material} />
      {poses.map((p, i) => (
        <group key={i} position={p.position} quaternion={p.quaternion}>
          <mesh geometry={ring} material={material} />
          <mesh geometry={sprue} material={material} />
        </group>
      ))}
    </>
  )
}

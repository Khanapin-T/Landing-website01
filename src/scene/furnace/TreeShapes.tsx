import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { createSprueGeometry } from '../ring/sprue'
import { useRingLightGeometry } from '../ring/useRingGeometry'
import { slotPose } from '../tree/slots'
import { SPRUE_TIP_LOCAL, createSprueWaxGeometry } from '../tree/sprueWax'
import { createTrunkGeometry } from '../tree/trunk'
import { funnelProfile } from './funnel'

/**
 * The shapes of the casting tree and its funnel (trunk, funnel, four rings with their sprues and the wax stubs that continue the sprues into the trunk), in the unflipped flask
 * frame, all drawn with one material. Mount it inside a group in the flask frame. Used by the cavity outline (Act 4) and
 * the solid gold fill (Act 5). The raw tree (Acts 6 and 7) passes slotMaterials: ring i, its sprue and its trunk stub use
 * slotMaterials[i] (each its own dirt seed, see rawGoldMaterial.ts DIRT_SEEDS).
 * Act 7 passes rings={false}: the empty tree after the cut keeps only the trunk stubs.
 */
export function TreeShapes({
  material,
  slotMaterials,
  rings = true,
}: {
  material: THREE.Material
  slotMaterials?: readonly THREE.Material[]
  rings?: boolean
}) {
  const ring = useRingLightGeometry()
  const sprue = useMemo(() => createSprueGeometry(), [])
  const trunk = useMemo(() => createTrunkGeometry(), [])
  const stub = useMemo(() => createSprueWaxGeometry(), [])
  const funnel = useMemo(() => new THREE.LatheGeometry(funnelProfile().map(([x, y]) => new THREE.Vector2(x, y)), 48), [])
  const poses = useMemo(() => [0, 1, 2, 3].map((i) => slotPose(i)), [])
  useEffect(() => () => sprue.dispose(), [sprue])
  useEffect(() => () => trunk.dispose(), [trunk])
  useEffect(() => () => stub.dispose(), [stub])
  useEffect(() => () => funnel.dispose(), [funnel])

  return (
    <>
      <mesh geometry={trunk} material={material} position={[0, MOLD.trunk.bottomY, 0]} />
      <mesh geometry={funnel} material={material} />
      {poses.map((p, i) => (
        <group key={i} position={p.position} quaternion={p.quaternion}>
          {rings && <mesh geometry={ring} material={slotMaterials?.[i] ?? material} />}
          {rings && <mesh geometry={sprue} material={slotMaterials?.[i] ?? material} />}
          <mesh geometry={stub} material={slotMaterials?.[i] ?? material} position={SPRUE_TIP_LOCAL as unknown as [number, number, number]} />
        </group>
      ))}
    </>
  )
}

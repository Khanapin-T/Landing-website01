import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { FINAL, heroMatrix, mirrorMatrix, polishLinePoint } from '../../config/birth'
import { createSprueGeometry } from '../../scene/ring/sprue'
import { useRingGeometry } from '../../scene/ring/useRingGeometry'
import { getAppState } from '../../story/appState'
import { birth } from './state'
import { createPolishMaterials } from './polishMaterial'

/**
 * The hero ring of Act 7 (slot 0, the full 100k model) from the tree to the final frame: on the tree, cut last, at rest
 * on top in the jar, out to the centre, polished by the line, then tilted and slowly spinning (ambient, frozen under
 * prefers-reduced-motion) over its faded mirror copy. Pose: config/birth.ts heroMatrix.
 */
export function PolishRing() {
  const ring = useRingGeometry()
  const sprue = useMemo(() => createSprueGeometry(), [])
  const mats = useMemo(() => createPolishMaterials(), [])
  useEffect(
    () => () => {
      sprue.dispose()
      mats.ring.dispose()
      mats.stub.dispose()
      mats.mirror.dispose()
    },
    [sprue, mats],
  )

  const reduce = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const spin = useRef(0)
  const hero = useRef<Group>(null)
  const mirror = useRef<Group>(null)
  const pose = useMemo(() => ({ cut: 0, jar: 0, out: 0, yaw: 0, tilt: 0 }), [])

  useFrame((_, delta) => {
    const g = hero.current
    const r = mirror.current
    if (!g || !r) return
    if (!reduce) spin.current += Math.min(delta, 0.1) * FINAL.spin * birth.finale
    pose.cut = birth.cut0
    pose.jar = birth.jar
    pose.out = birth.out
    pose.yaw = birth.turn + spin.current
    pose.tilt = birth.tilt
    heroMatrix(pose, g.matrix)
    g.matrixWorldNeedsUpdate = true
    mirrorMatrix(g.matrix, r.matrix)
    r.matrixWorldNeedsUpdate = true
    polishLinePoint(birth.line, mats.uniforms.uLinePoint.value)
    mats.uniforms.uAll.value = birth.all
    mats.uniforms.uReflect.value = birth.finale
    r.visible = getAppState().phase === 'loading' || birth.finale > 0.001
  })

  return (
    <>
      <group ref={hero} matrixAutoUpdate={false}>
        <mesh geometry={ring} material={mats.ring} />
        <mesh geometry={sprue} material={mats.stub} />
      </group>
      <group ref={mirror} matrixAutoUpdate={false}>
        <mesh geometry={ring} material={mats.mirror} />
      </group>
    </>
  )
}

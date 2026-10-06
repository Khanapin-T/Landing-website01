import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { burnFrontY } from '../../config/fire'
import { MOLD } from '../../config/mold'
import { PRINT, RING_HALF } from '../../config/print'
import { mold } from '../../acts/mold/state'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { burnUniforms } from '../furnace/burn'
import { getRingMaterial } from '../ring/sharedMaterial'
import { createSprueGeometry } from '../ring/sprue'
import { useRingLightGeometry } from '../ring/useRingGeometry'
import { slotPose } from './slots'
import { createTrunkGeometry } from './trunk'
import { createWaxMaterial } from './waxMaterial'

const CLONE_SLOTS = [1, 2, 3] as const
/** Ring origin relative to the sprue tip, in the slot's local space. */
const TIP_TO_RING = new THREE.Vector3(0, RING_HALF + PRINT.sprue.length, 0)

interface CloneLayout {
  /** World position of the sprue tip (the scale pivot). */
  tip: THREE.Vector3
  quaternion: THREE.Quaternion
}

function cloneLayout(i: number): CloneLayout {
  const { position, quaternion } = slotPose(i)
  const tip = TIP_TO_RING.clone().negate().applyQuaternion(quaternion).add(position)
  return { tip, quaternion }
}

/** The wax tree: a red wax trunk that grows from the cone and three clone rings that pop in about their sprue tips. */
export function Tree() {
  const { material: ringMaterial } = getRingMaterial()
  const ringGeometry = useRingLightGeometry()
  const sprueGeometry = useMemo(() => createSprueGeometry(), [])
  useEffect(() => () => sprueGeometry.dispose(), [sprueGeometry])

  const trunkGeometry = useMemo(() => createTrunkGeometry(), [])
  useEffect(() => () => trunkGeometry.dispose(), [trunkGeometry])

  const wax = useMemo(() => createWaxMaterial(), [])
  useEffect(() => () => wax.dispose(), [wax])

  const layouts = useMemo(() => CLONE_SLOTS.map((i) => cloneLayout(i)), [])

  const trunk = useRef<THREE.Mesh>(null)
  const clones = useRef<(THREE.Group | null)[]>([])

  useFrame(() => {
    // The one writer of the burn front (shared by the wax and the ring material).
    burnUniforms.uBurnY.value = burnFrontY(story.flask.burn)
    const loading = getAppState().phase === 'loading'
    const burned = story.flask.burn > 0.999
    const t = trunk.current
    if (t) {
      t.scale.y = Math.max(mold.trunk, 0.0001)
      t.visible = loading || (mold.trunk > 0.001 && !burned)
    }
    for (let k = 0; k < CLONE_SLOTS.length; k++) {
      const g = clones.current[k]
      if (!g) continue
      const s = mold.clones[k]
      g.scale.setScalar(s)
      g.visible = loading || (s > 0.001 && !burned)
    }
  })

  return (
    // Everything starts visible: Precompile (traverseVisible) runs before the first frame sets the real values.
    <group>
      <mesh ref={trunk} geometry={trunkGeometry} material={wax} position={[0, MOLD.trunk.bottomY, 0]} />
      {layouts.map((l, k) => (
        <group
          key={CLONE_SLOTS[k]}
          ref={(g) => {
            clones.current[k] = g
          }}
          position={l.tip}
          quaternion={l.quaternion}
        >
          <mesh geometry={ringGeometry} material={ringMaterial} position={TIP_TO_RING} />
          <mesh geometry={sprueGeometry} material={ringMaterial} position={TIP_TO_RING} />
        </group>
      ))}
    </group>
  )
}

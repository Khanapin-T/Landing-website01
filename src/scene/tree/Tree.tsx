import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { burnFrontY } from '../../config/fire'
import { MOLD } from '../../config/mold'
import { PRINT, RING_COUNT, RING_HALF } from '../../config/print'
import { mold } from '../../acts/mold/state'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { burnUniforms } from '../furnace/burn'
import { slotPose } from './slots'
import { createSprueWaxGeometry, stubGrowth } from './sprueWax'
import { createTrunkGeometry } from './trunk'
import { createWaxMaterial } from './waxMaterial'

/** Ring origin relative to the sprue tip, in the slot's local space. */
const TIP_TO_RING = new THREE.Vector3(0, RING_HALF + PRINT.sprue.length, 0)

interface StubLayout {
  /** World position of the sprue tip (the stub's scale pivot). */
  tip: THREE.Vector3
  quaternion: THREE.Quaternion
}

function stubLayout(i: number): StubLayout {
  const { position, quaternion } = slotPose(i)
  const tip = TIP_TO_RING.clone().negate().applyQuaternion(quaternion).add(position)
  return { tip, quaternion }
}

/**
 * The wax tree: a red wax trunk that rises into the frame standing on the rubber base's cone (mold.trunk), and a red
 * wax stub on each of the four slots that grows from the sprue tip as its ring seats (the rings themselves are the
 * persistent HeroRing set, story.ring.flight).
 */
export function Tree() {
  const trunkGeometry = useMemo(() => createTrunkGeometry(), [])
  useEffect(() => () => trunkGeometry.dispose(), [trunkGeometry])

  const wax = useMemo(() => createWaxMaterial(), [])
  useEffect(() => () => wax.dispose(), [wax])

  // Red wax continuation of every ring sprue (the same cylinder past the tip, into the trunk): only on the tree.
  const waxStub = useMemo(() => createSprueWaxGeometry(), [])
  useEffect(() => () => waxStub.dispose(), [waxStub])

  const layouts = useMemo(() => Array.from({ length: RING_COUNT }, (_, k) => stubLayout(k)), [])

  const trunk = useRef<THREE.Mesh>(null)
  const stubs = useRef<(THREE.Group | null)[]>([])

  useFrame(() => {
    // The one writer of the burn front (shared by the wax and the ring material).
    burnUniforms.uBurnY.value = burnFrontY(story.flask.burn)
    const loading = getAppState().phase === 'loading'
    const burned = story.flask.burn > 0.999
    const t = trunk.current
    if (t) {
      // Standing on the rising base (same offset as RubberBase), then in place.
      t.position.y = MOLD.trunk.bottomY + (1 - mold.trunk) * MOLD.base.dropOffset
      t.visible = loading || (mold.trunk > 0.001 && !burned)
    }
    for (let k = 0; k < RING_COUNT; k++) {
      const g = stubs.current[k]
      if (!g) continue
      const s = stubGrowth(story.ring.flight[k])
      g.scale.setScalar(Math.max(s, 0.0001))
      g.visible = loading || (s > 0.001 && !burned)
    }
  })

  return (
    // Everything starts visible: Precompile (traverseVisible) runs before the first frame sets the real values.
    <group>
      <mesh ref={trunk} geometry={trunkGeometry} material={wax} position={[0, MOLD.trunk.bottomY, 0]} />
      {layouts.map((l, k) => (
        <group
          key={k}
          ref={(g) => {
            stubs.current[k] = g
          }}
          position={l.tip}
          quaternion={l.quaternion}
        >
          <mesh geometry={waxStub} material={wax} />
        </group>
      ))}
    </group>
  )
}

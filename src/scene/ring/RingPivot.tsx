import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { story } from '../../story/store'
import { slotPose } from '../tree/slots'
import { blendPose, newPose, ringPose } from './pose'

// Module-level scratch: nothing is allocated per frame.
const free = newPose()
const blended = newPose()
const slot0 = slotPose(0)

/**
 * Applies the ring's scroll-driven placement to everything attached to it: T(0, y, 0) * Rz(flip) * Ry(yaw),
 * blended into tree slot 0 by story.ring.tree (Act 3). With tree = 0 this equals the old nested groups.
 */
export function RingPivot({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    ringPose(story.ring, free)
    const t = story.ring.tree
    const pose = t > 0 ? blendPose(free, slot0, t, blended) : free
    g.position.copy(pose.position)
    g.quaternion.copy(pose.quaternion)
  })
  return <group ref={group}>{children}</group>
}

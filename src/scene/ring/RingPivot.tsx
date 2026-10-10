import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { story } from '../../story/store'
import { newPose } from './pose'
import { ringPlacement } from './placement'

// Module-level scratch: nothing is allocated per frame (each pivot copies it out right away).
const pose = newPose()

/**
 * Applies ring `index`'s scroll-driven placement to everything attached to it (ringPlacement): its print-row pose
 * T(x_k, y, 0) * Rz(flip) * Ry(yaw), then its flight onto tree slot k by story.ring.flight[k], at its flight scale.
 */
export function RingPivot({ index = 0, children }: { index?: number; children: ReactNode }) {
  const group = useRef<Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    const s = ringPlacement(story.ring, index, pose)
    g.position.copy(pose.position)
    g.quaternion.copy(pose.quaternion)
    g.scale.setScalar(s)
  })
  return <group ref={group}>{children}</group>
}

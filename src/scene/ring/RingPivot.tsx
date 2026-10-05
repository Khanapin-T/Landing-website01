import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { story } from '../../story/store'

/** Applies the ring's scroll-driven placement to everything attached to it: lift (Y), flip (Z), turn (Y). */
export function RingPivot({ children }: { children: ReactNode }) {
  const outer = useRef<Group>(null)
  const inner = useRef<Group>(null)
  useFrame(() => {
    if (outer.current) {
      outer.current.position.y = story.ring.y
      outer.current.rotation.z = story.ring.flip
    }
    if (inner.current) inner.current.rotation.y = story.ring.yaw
  })
  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  )
}

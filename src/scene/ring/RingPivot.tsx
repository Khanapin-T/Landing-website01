import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { story } from '../../story/store'

/** Applies the ring's scroll-driven yaw (turn around Y) to everything attached to the ring. */
export function RingPivot({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.y = story.ring.yaw
  })
  return <group ref={ref}>{children}</group>
}

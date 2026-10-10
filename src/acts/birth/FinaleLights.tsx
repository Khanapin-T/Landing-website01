import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PointLight } from 'three'
import { FINAL_LIGHT } from '../../config/birth'
import { birth } from './state'

/**
 * The final frame's real lights (config/birth.ts FINAL_LIGHT): a warm key, a warm fill and a faint cool rim on the
 * polished ring. Mounted with the scene from the loader on, outside any group whose visibility toggles, and never
 * hidden: only the intensity follows birth.finale (0 elsewhere). A changed light count would recompile every lit shader
 * mid-scroll.
 */
export function FinaleLights() {
  const key = useRef<PointLight>(null)
  const fill = useRef<PointLight>(null)
  const rim = useRef<PointLight>(null)

  useFrame(() => {
    // Off through the first polish pass (the ring is only polished, lit by the environment, no glare or bloom); the
    // second pass (the sweep) brings the lights in with birth.finale.
    const k = birth.finale
    if (key.current) key.current.intensity = FINAL_LIGHT.key.intensity * k
    if (fill.current) fill.current.intensity = FINAL_LIGHT.fill.intensity * k
    if (rim.current) rim.current.intensity = FINAL_LIGHT.rim.intensity * k
  })

  return (
    <>
      <pointLight ref={key} position={[...FINAL_LIGHT.key.position]} color={FINAL_LIGHT.key.color} intensity={0} decay={2} />
      <pointLight ref={fill} position={[...FINAL_LIGHT.fill.position]} color={FINAL_LIGHT.fill.color} intensity={0} decay={2} />
      <pointLight ref={rim} position={[...FINAL_LIGHT.rim.position]} color={FINAL_LIGHT.rim.color} intensity={0} decay={2} />
    </>
  )
}

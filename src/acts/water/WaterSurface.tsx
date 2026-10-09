import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WATER_Y, bucketInnerRadius } from '../../config/water'
import { water } from './state'
import { createWaterMaterial } from './waterMaterial'

/**
 * The water in the bucket (mount inside <Bucket>): a subdivided disc at WATER_Y that boils and turns milky
 * (water.boil, water.milk). The boil moves on time (ambient), frozen under prefers-reduced-motion.
 */
export function WaterSurface() {
  // Radial subdivisions so the boil can displace inner vertices; laid flat, normal +Y.
  const geometry = useMemo(() => new THREE.RingGeometry(0, bucketInnerRadius(WATER_Y), 128, 48).rotateX(-Math.PI / 2), [])
  const { material, uniforms } = useMemo(createWaterMaterial, [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const reduce = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  useFrame(({ clock }) => {
    uniforms.uBoil.value = water.boil
    uniforms.uMilk.value = water.milk
    uniforms.uTime.value = reduce ? 0 : clock.elapsedTime
  })

  return <mesh geometry={geometry} material={material} position-y={WATER_Y} />
}

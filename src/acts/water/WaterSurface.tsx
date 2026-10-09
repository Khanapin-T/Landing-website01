import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WATER_Y, bucketInnerRadius, immersion } from '../../config/water'
import { story } from '../../story/store'
import { water } from './state'
import { createWaterMaterial } from './waterMaterial'

/**
 * The water in the bucket (mount inside <Bucket>): a subdivided disc at WATER_Y that boils and turns milky
 * (water.boil, water.milk). The boil spreads from the middle as the flask goes under (immersion). The boil moves on time (ambient), frozen under prefers-reduced-motion.
 */
export function WaterSurface() {
  // Radial subdivisions so the boil can displace inner vertices; laid flat, normal +Y.
  const radius = bucketInnerRadius(WATER_Y)
  const geometry = useMemo(() => new THREE.RingGeometry(0, radius, 128, 48).rotateX(-Math.PI / 2), [radius])
  const { material, uniforms } = useMemo(() => {
    const m = createWaterMaterial()
    m.uniforms.uRadius.value = radius
    return m
  }, [radius])
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
    uniforms.uSpread.value = immersion(story.flask.dip)
    uniforms.uMilk.value = water.milk
    uniforms.uTime.value = reduce ? 0 : clock.elapsedTime
  })

  return <mesh geometry={geometry} material={material} position-y={WATER_Y} />
}

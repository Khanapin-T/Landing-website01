import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { particleDrawCount, type ParticleBuffers } from './particleData'
import { useQuality } from '../quality/qualityStore'
import { getAppState } from '../../story/appState'

export interface ParticleCloudState {
  /** Stream progress 0..1. */
  progress: number
  opacity: number
}

// Point size: uSize (world units) projected to drawing-buffer px.
// projectionMatrix[1][1] = 1 / tan(fov / 2); uScale = half the drawing-buffer height.
// 0.006 at ~4.2 units with a 30 deg fov at 1080 px: 0.006 * 540 * 3.73 / 4.2 = ~2.9 px (x 0.6..1.4 per seed).
const vertexShader = /* glsl */ `
attribute vec3 aTo;
attribute float aDelay;
attribute float aSeed;
uniform float uProgress;
uniform float uSize;
uniform float uScale; // half the drawing-buffer height in px
varying float vAlpha;
void main() {
  float k = smoothstep(aDelay, aDelay + 0.35, uProgress);
  vec3 p = mix(position, aTo, k * k);
  float flight = sin(3.14159265 * k);
  p.x += sin(aSeed * 40.0 + k * 6.0) * 0.04 * flight;
  p.z += cos(aSeed * 31.0 + k * 5.0) * 0.04 * flight;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uScale * projectionMatrix[1][1] / -mv.z * (0.6 + 0.8 * aSeed);
  vAlpha = 1.0 - 0.6 * smoothstep(0.8, 1.0, k);
}
`

// smoothstep needs edge0 < edge1 (reversed edges are undefined in GLSL), hence 1.0 - smoothstep(...).
const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.15, 0.5, d)) * vAlpha * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`

/** The one particle shader: points flying from `from` to `to`, each on its own delay. Additive, no depth write. */
export function ParticleCloud({
  buffers,
  state,
  color = '#cfe0f5',
  size = 0.006,
}: {
  buffers: ParticleBuffers
  state: Readonly<ParticleCloudState>
  color?: THREE.ColorRepresentation
  size?: number
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(buffers.from, 3))
    g.setAttribute('aTo', new THREE.BufferAttribute(buffers.to, 3))
    g.setAttribute('aDelay', new THREE.BufferAttribute(buffers.delay, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(buffers.seed, 1))
    return g
  }, [buffers])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uProgress: { value: 0 },
          uOpacity: { value: 0 },
          uSize: { value: size },
          uScale: { value: 540 },
          uColor: { value: new THREE.Color(color) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // The fragment shader outputs premultiplied color. Without this flag three blends
        // additive as SRC_ALPHA, ONE and the color is multiplied by alpha twice.
        premultipliedAlpha: true,
      }),
    [color, size],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  const { particleScale } = useQuality()
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    geometry.setDrawRange(0, particleDrawCount(buffers.count, particleScale, reduce))
  }, [geometry, buffers.count, particleScale])

  const gl = useThree((s) => s.gl)
  const ref = useRef<THREE.Points>(null)
  useFrame(() => {
    const u = material.uniforms
    u.uProgress.value = state.progress
    u.uOpacity.value = state.opacity
    u.uScale.value = (gl.domElement.height || 1080) / 2
    if (ref.current) ref.current.visible = getAppState().phase === 'loading' || state.opacity > 0.001
  })

  // frustumCulled off: the bounding sphere covers only the start shape, not the flight.
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}

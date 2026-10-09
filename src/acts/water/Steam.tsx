import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WATER_Y, bucketInnerRadius } from '../../config/water'
import { mulberry32 } from '../../lib/random'
import { getAppState } from '../../story/appState'
import { water } from './state'

/** Number of steam puffs. */
const COUNT = 80
/** How high a puff rises over its life, world units. */
const RISE = 4.2

const vertexShader = /* glsl */ `
attribute vec3 aBase;
attribute float aSeed;
uniform float uTime;
uniform float uSteam;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
void main() {
  // Each puff loops: born on the water, rising and growing, gone at the top (ambient; frozen when uTime is 0).
  float life = fract(aSeed * 7.13 + uTime * (0.11 + 0.06 * aSeed));
  vec3 c = aBase;
  c.y += life * ${RISE.toFixed(2)};
  c.x += sin(aSeed * 31.0 + uTime * 0.7) * 0.35 * life;
  c.z += cos(aSeed * 17.0 + uTime * 0.5) * 0.25 * life;
  float size = mix(0.9, 2.6, life) * (0.7 + 0.6 * aSeed);
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  mv.xy += position.xy * size; // camera-facing billboard
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vSeed = aSeed;
  vAlpha = uSteam * smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.55, 1.0, life));
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
float sHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float sNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec2 p = vUv - 0.5;
  float soft = 1.0 - smoothstep(0.1, 0.5, length(p));
  float n = sNoise(vUv * 4.0 + vSeed * 10.0) * 0.6 + sNoise(vUv * 9.0 - vSeed * 5.0) * 0.4;
  float a = soft * (0.45 + 0.55 * n) * vAlpha * 0.35;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`

/**
 * Steam over the bucket (Act 6, mount inside <Bucket>): COUNT soft camera-facing puffs born on the water surface,
 * rising and growing. `water.steam` sets the amount (scroll); the drift runs on time (ambient), frozen under
 * prefers-reduced-motion. Premultiplied alpha, no depth write, drawn after the opaque scene.
 */
export function Steam() {
  const geometry = useMemo(() => {
    const quad = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = quad.index
    g.setAttribute('position', quad.getAttribute('position'))
    g.setAttribute('uv', quad.getAttribute('uv'))
    const rand = mulberry32(61)
    const r = bucketInnerRadius(WATER_Y) * 0.8
    const base = new Float32Array(COUNT * 3)
    const seed = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const a = rand() * Math.PI * 2
      const d = Math.sqrt(rand()) * r
      base.set([Math.cos(a) * d, WATER_Y + 0.1, Math.sin(a) * d], i * 3)
      seed[i] = rand()
    }
    g.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3))
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
    g.instanceCount = COUNT
    return g
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 }, uSteam: { value: 0 }, uColor: { value: new THREE.Color('#eef1f2') } },
        transparent: true,
        depthWrite: false,
        premultipliedAlpha: true,
      }),
    [],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const reduce = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    material.uniforms.uSteam.value = water.steam
    material.uniforms.uTime.value = reduce ? 0 : clock.elapsedTime
    if (ref.current) ref.current.visible = getAppState().phase === 'loading' || water.steam > 0.001
  })

  // frustumCulled off: the bounding sphere of one quad says nothing about the instances.
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={20} />
}

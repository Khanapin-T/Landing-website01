import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WATER_Y, bucketInnerRadius, immersion } from '../../config/water'
import { mulberry32 } from '../../lib/random'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { water } from './state'

/** Size of the puff pool (the author: half of the first 80). */
const COUNT = 40
/** How high a puff rises over its life, world units. */
const RISE = 4.2
/** Seconds a puff lives: born small on the water, rising and growing, gone at the top. */
const LIFE = 2.6
/** Puffs born per second at water.steam = 1: the pool is never exhausted (COUNT / LIFE). */
const RATE = COUNT / LIFE
/** Birth time of a free slot: far in the past, so the puff is dead. */
const DEAD = -1e6

const vertexShader = /* glsl */ `
attribute vec3 aBase;
attribute float aSeed;
attribute float aBirth;
uniform float uTime;
uniform float uStatic;
uniform float uSteam;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
void main() {
  // Live: age since birth (puffs keep rising after the birth rate drops). Reduced motion: a still layer over the
  // water whose amount follows uSteam.
  float age = uStatic > 0.5 ? fract(aSeed * 7.13) * 0.6 : (uTime - aBirth) / ${LIFE.toFixed(2)};
  float alive = step(0.0, age) * step(age, 1.0);
  float life = clamp(age, 0.0, 1.0);
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
  float amount = uStatic > 0.5 ? uSteam : 1.0;
  vAlpha = alive * amount * smoothstep(0.0, 0.3, life) * (1.0 - smoothstep(0.5, 1.0, life));
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
 * Steam over the bucket (Act 6, mount inside <Bucket>): a pool of COUNT soft camera-facing puffs. `water.steam` is the
 * birth rate (scroll): puffs are born small on the water, inside the part that boils (immersion of the flask, from
 * the middle), then rise, grow and fade over LIFE seconds on their own, so when the rate drops the steam already up
 * keeps rising and vanishes. Ambient (time); under prefers-reduced-motion a still layer whose amount is water.steam.
 * Premultiplied alpha, no depth write, drawn after the opaque scene.
 */
export function Steam() {
  const { geometry, base, birth } = useMemo(() => {
    const quad = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = quad.index
    g.setAttribute('position', quad.getAttribute('position'))
    g.setAttribute('uv', quad.getAttribute('uv'))
    const rand = mulberry32(61)
    const r = bucketInnerRadius(WATER_Y) * 0.8
    const baseArr = new Float32Array(COUNT * 3)
    const seed = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      // Still (reduced motion) layout over the whole water; a live puff gets a new spot when it is born.
      const a = rand() * Math.PI * 2
      const d = Math.sqrt(rand()) * r
      baseArr.set([Math.cos(a) * d, WATER_Y + 0.05, Math.sin(a) * d], i * 3)
      seed[i] = rand()
    }
    const base = new THREE.InstancedBufferAttribute(baseArr, 3)
    const birth = new THREE.InstancedBufferAttribute(new Float32Array(COUNT).fill(DEAD), 1)
    base.setUsage(THREE.DynamicDrawUsage)
    birth.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute('aBase', base)
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1))
    g.setAttribute('aBirth', birth)
    g.instanceCount = COUNT
    return { geometry: g, base, birth }
  }, [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uTime: { value: 0 }, uStatic: { value: 0 }, uSteam: { value: 0 }, uColor: { value: new THREE.Color('#eef1f2') } },
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
  const spawn = useRef({ acc: 0, next: 0, last: DEAD })
  const waterRadius = useMemo(() => bucketInnerRadius(WATER_Y) * 0.85, [])

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime
    const u = material.uniforms
    u.uTime.value = reduce ? 0 : now
    u.uStatic.value = reduce ? 1 : 0
    u.uSteam.value = water.steam

    const s = spawn.current
    if (!reduce && water.steam > 0.001) {
      // Born inside the boiling part: a disc from the middle that grows as the flask goes under.
      const r = Math.max(immersion(story.flask.dip), 0.15) * waterRadius
      s.acc += water.steam * RATE * Math.min(delta, 0.1)
      let changed = false
      while (s.acc >= 1) {
        s.acc -= 1
        const i = s.next
        if (now - birth.array[i] < LIFE) break // pool full: every slot is still alive
        s.next = (i + 1) % COUNT
        const a = Math.random() * Math.PI * 2
        const d = Math.sqrt(Math.random()) * r
        base.setXYZ(i, Math.cos(a) * d, WATER_Y + 0.05, Math.sin(a) * d)
        birth.setX(i, now)
        s.last = now
        changed = true
      }
      if (changed) {
        base.needsUpdate = true
        birth.needsUpdate = true
      }
    } else {
      s.acc = 0
    }

    if (ref.current) {
      const alive = reduce ? water.steam > 0.001 : now - s.last < LIFE
      ref.current.visible = getAppState().phase === 'loading' || alive
    }
  })

  // frustumCulled off: the bounding sphere of one quad says nothing about the instances.
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={20} />
}

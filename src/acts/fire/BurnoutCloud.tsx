import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { BURN, FUNNEL } from '../../config/fire'
import { mulberry32 } from '../../lib/random'
import { particleDrawCount } from '../../scene/particles/particleData'
import { useQuality } from '../../scene/quality/qualityStore'
import { createSprueGeometry } from '../../scene/ring/sprue'
import { useRingLightGeometry } from '../../scene/ring/useRingGeometry'
import { createTrunkGeometry } from '../../scene/tree/trunk'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { buildBurnoutParts, burnoutBuffers, sampleParts, type BurnoutBuffers } from './burnoutData'

/** Point size in world units (about 3 px at the tree view on a 1080 px frame). */
const SIZE = 0.011

const vertexShader = /* glsl */ `
attribute float aStart;
attribute float aSeed;
uniform float uBurn;
uniform float uTrail;
uniform float uExitY;
uniform float uSize;
uniform float uScale; // half the drawing-buffer height in px
varying float vAlpha;
varying float vHot;
void main() {
  // 0 = still on the part (the burning surface shows it), 1 = out of the foot.
  float u = clamp((uBurn - aStart) / uTrail, 0.0, 1.0);
  vec3 p = position;
  // Phase A: leave the surface toward the trunk axis (x = z = 0), rising a little like hot gas.
  float a = smoothstep(0.0, 0.4, u);
  p.xz = mix(p.xz, p.xz * 0.15, a);
  p.y += 0.12 * sin(3.14159265 * a);
  // Phase B: flow down the axis, speeding up, through the funnel and out of the foot.
  float b = smoothstep(0.4, 1.0, u);
  float fall = b * b;
  p.y = mix(p.y, uExitY, fall);
  p.xz *= 1.0 - 0.7 * fall;
  p.x += sin(aSeed * 40.0 + u * 9.0) * 0.03 * (1.0 - fall);
  p.z += cos(aSeed * 31.0 + u * 8.0) * 0.03 * (1.0 - fall);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uScale * projectionMatrix[1][1] / -mv.z * (0.6 + 0.8 * aSeed);
  // Invisible before it detaches, white-hot at release, fading out near the foot.
  vAlpha = step(0.0001, u) * smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.82, 1.0, u));
  vHot = 1.0 - smoothstep(0.0, 0.7, u);
}
`

// smoothstep needs edge0 < edge1 (reversed edges are undefined in GLSL), hence 1.0 - smoothstep(...).
const fragmentShader = /* glsl */ `
uniform vec3 uHot;
uniform vec3 uCool;
varying float vAlpha;
varying float vHot;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.15, 0.5, d)) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(mix(uCool, uHot, vHot) * a, a);
}
`

const cache = new WeakMap<THREE.BufferGeometry, BurnoutBuffers>()

/**
 * Act 4's burnout (world space, unflipped flask): each point detaches from the tree when the burn front passes its
 * height, drifts to the trunk axis and flows down through the funnel out of the foot. Driven only by story.flask.burn.
 */
export function BurnoutCloud() {
  const ring = useRingLightGeometry()
  const buffers = useMemo(() => {
    let b = cache.get(ring)
    if (!b) {
      const sprue = createSprueGeometry()
      const trunk = createTrunkGeometry()
      b = burnoutBuffers(sampleParts(buildBurnoutParts(ring, sprue, trunk), mulberry32(21)), mulberry32(22))
      sprue.dispose()
      trunk.dispose()
      cache.set(ring, b)
    }
    return b
  }, [ring])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(buffers.position, 3))
    g.setAttribute('aStart', new THREE.BufferAttribute(buffers.start, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(buffers.seed, 1))
    return g
  }, [buffers])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uBurn: { value: 0 },
          uTrail: { value: BURN.trail },
          uExitY: { value: FUNNEL.exitY },
          uSize: { value: SIZE },
          uScale: { value: 540 },
          uHot: { value: new THREE.Color(3.0, 2.2, 1.2) },
          uCool: { value: new THREE.Color(1.6, 0.35, 0.06) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // The fragment shader outputs premultiplied color (see ParticleCloud).
        premultipliedAlpha: true,
      }),
    [],
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
    u.uBurn.value = story.flask.burn
    u.uScale.value = (gl.domElement.height || 1080) / 2
    if (ref.current) ref.current.visible = getAppState().phase === 'loading' || (story.flask.burn > 0.001 && story.flask.burn < 0.999)
  })

  // frustumCulled off: the bounding sphere covers only the tree, not the flow down to the foot.
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}

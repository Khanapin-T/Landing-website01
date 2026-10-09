import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FLIP } from '../../config/fire'
import { FILL, pourVisible } from '../../config/gold'
import { mulberry32 } from '../../lib/random'
import { particleDrawCount } from '../../scene/particles/particleData'
import { useQuality } from '../../scene/quality/qualityStore'
import { createSprueGeometry } from '../../scene/ring/sprue'
import { useRingLightGeometry } from '../../scene/ring/useRingGeometry'
import { buildTreeParts, sampleParts } from '../../scene/tree/treeSamples'
import { createTrunkGeometry } from '../../scene/tree/trunk'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { POUR_COUNTS, pourBuffers, type PourBuffers } from './pourData'

/** Point size in world units (a little finer than the burnout sparks). */
const SIZE = 0.012

const vertexShader = /* glsl */ `
attribute float aArrive;
attribute float aSeed;
uniform float uFill;
uniform float uTrail;
uniform float uStreamY;
uniform float uSize;
uniform float uScale; // half the drawing-buffer height in px
varying float vAlpha;
varying float vHot;
void main() {
  // 0 = launched from above the frame, 1 = arrived (the solid front takes over).
  float u = clamp((uFill - (aArrive - uTrail)) / uTrail, 0.0, 1.0);
  // Phase A: fly along the funnel axis from the stream start to the point's height (flask frame: Y rises, the
  // flipped world sees it fall). Phase B: spread from the axis to the point's spot.
  float a = smoothstep(0.0, 0.75, u);
  float b = smoothstep(0.55, 1.0, u);
  vec2 axis = vec2(sin(aSeed * 40.0 + u * 9.0), cos(aSeed * 31.0 + u * 8.0)) * 0.03 * (1.0 - b);
  vec3 p = vec3(mix(axis.x, position.x, b), mix(uStreamY, position.y, a), mix(axis.y, position.z, b));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uScale * projectionMatrix[1][1] / -mv.z * (0.6 + 0.8 * aSeed);
  // Invisible before launch, bright in flight, gone when the front arrives.
  vAlpha = step(0.0001, u) * smoothstep(0.0, 0.05, u) * (1.0 - smoothstep(0.9, 1.0, u));
  vHot = 1.0 - smoothstep(0.0, 0.9, u);
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

const cache = new WeakMap<THREE.BufferGeometry, PourBuffers>()

/**
 * Act 5's pour: a stream of glowing points that enters from above the frame, runs down the funnel and trunk and settles
 * on the rings, each point arriving as the solid front reaches its height. Mounted under a fixed flip transform
 * (Rz(pi) about the flask pivot = the flask frame while the flask is flipped). Driven only by story.flask.fill.
 */
export function PourCloud() {
  const ring = useRingLightGeometry()
  const buffers = useMemo(() => {
    let b = cache.get(ring)
    if (!b) {
      const sprue = createSprueGeometry()
      const trunk = createTrunkGeometry()
      b = pourBuffers(sampleParts(buildTreeParts(ring, sprue, trunk, POUR_COUNTS), mulberry32(31)), mulberry32(32))
      sprue.dispose()
      trunk.dispose()
      cache.set(ring, b)
    }
    return b
  }, [ring])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(buffers.position, 3))
    g.setAttribute('aArrive', new THREE.BufferAttribute(buffers.arrive, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(buffers.seed, 1))
    return g
  }, [buffers])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uFill: { value: 0 },
          uTrail: { value: FILL.trail },
          uStreamY: { value: FILL.streamY },
          uSize: { value: SIZE },
          uScale: { value: 540 },
          uHot: { value: new THREE.Color(3.2, 2.6, 1.4) },
          uCool: { value: new THREE.Color(2.4, 1.2, 0.25) },
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
    u.uFill.value = story.flask.fill
    u.uScale.value = (gl.domElement.height || 1080) / 2
    if (ref.current) ref.current.visible = getAppState().phase === 'loading' || pourVisible(story.flask)
  })

  // frustumCulled off: the bounding sphere covers only the tree, not the stream above it.
  return (
    <group position-y={2 * FLIP.pivotY} rotation-z={Math.PI}>
      <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}

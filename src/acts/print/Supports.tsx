import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PRINT, RESIN_COLOR } from '../../config/print'
import { mulberry32 } from '../../lib/random'
import { particleDrawCount } from '../../scene/particles/particleData'
import { useQuality } from '../../scene/quality/qualityStore'
import { useRingLightGeometry } from '../../scene/ring/useRingGeometry'
import { getAppState } from '../../story/appState'
import { story } from '../../story/store'
import { print } from './state'
import { buildSupportGeometry, computeSupports, meshCastUp, sampleSupportPoints, type Support } from './supportsData'

/** Points per support for the break-up. */
const POINTS_PER_SUPPORT = 36
/** Point size in world units. */
const POINT_SIZE = 0.012

/**
 * The break-up (print frame = world axes): each support turns into points at its own moment (seed, staggered over the
 * first part of the drop), quickly; its points then drift away in a short puff and fade. Shared by the columns and the points.
 */
const BREAK_GLSL = /* glsl */ `
uniform float uDrop;
float supStart(float seed) { return seed * 0.25; }
// 0..1: how far the support has turned into points.
float supBreak(float seed) { return smoothstep(supStart(seed), supStart(seed) + 0.12, uDrop); }
// 0..1: time since its points were released (the puff).
float supFallT(float seed) { return clamp((uDrop - supStart(seed)) / (1.0 - supStart(seed)), 0.0, 1.0); }
`

/**
 * Resin supports (MeshStandardMaterial in the resin colour): clipped by the cure plane like the ring (they print
 * first, from the plate down); at the break-up they vanish in place with a stable object-space dither while their
 * points take over.
 */
function createSupportMaterial(cure: { value: number }, drop: { value: number }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: RESIN_COLOR,
    roughness: 0.35,
    metalness: 0,
    emissive: new THREE.Color(RESIN_COLOR).multiplyScalar(0.25),
    envMapIntensity: 0.9,
  })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCureY = cure
    shader.uniforms.uDrop = drop
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${BREAK_GLSL}\nattribute float aSeed;\nvarying vec3 vObj;\nvarying float vWorldY;\nvarying float vDissolve;`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vObj = position;
        vWorldY = (modelMatrix * vec4(transformed, 1.0)).y;
        vDissolve = supBreak(aSeed);`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uCureY;\nvarying vec3 vObj;\nvarying float vWorldY;\nvarying float vDissolve;')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if (vWorldY < uCureY + 1e-4) discard;
        if (fract(sin(dot(floor(vObj * 500.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453) < vDissolve) discard;`,
      )
  }
  m.customProgramCacheKey = () => 'print-supports-v2'
  return m
}

const pointsVertex = /* glsl */ `
${BREAK_GLSL}
attribute float aSeed;
attribute vec3 aJitter;
uniform float uSize;
uniform float uScale;
varying float vAlpha;
void main() {
  float k = supBreak(aSeed);
  float t = supFallT(aSeed);
  // A short puff from where the support stood: outward (away from the ring axis) and back (away from the camera),
  // slowing down, never down through the ring that still hangs below.
  vec3 dir = normalize(vec3(position.x * 2.5, 0.12, -0.5 - abs(position.z)));
  float go = 1.0 - (1.0 - t) * (1.0 - t);
  vec3 p = position + (dir * ${PRINT.supports.puff.toFixed(3)} + aJitter * 0.06) * go;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uScale * projectionMatrix[1][1] / -mv.z * (0.7 + 0.6 * fract(aSeed * 13.7 + aJitter.x));
  vAlpha = k * (1.0 - smoothstep(0.35, 1.0, t));
}
`

const pointsFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.15, 0.5, d)) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`

/**
 * Act 2's print supports (author 2026-10-09: many, like real resin printing): thin resin columns from the plate down
 * onto the upside-down ring, landing on its real surface (rays cast once against the light ring model), drawn at
 * PRINT.scale like the ring. They print with the ring and rise with it (print.sup); at 100%, while the ring still hangs
 * on its sprue, they crumble into a short puff of points (print.drop). The sprue is the ring's own and stays.
 */
export function Supports() {
  const ring = useRingLightGeometry()
  const supports = useMemo<Support[]>(() => computeSupports(meshCastUp(ring), mulberry32(31)), [ring])
  const geometry = useMemo(() => buildSupportGeometry(supports), [supports])
  const cure = useMemo(() => ({ value: PRINT.cureY as number }), [])
  const drop = useMemo(() => ({ value: 0 }), [])
  const material = useMemo(() => createSupportMaterial(cure, drop), [cure, drop])

  const points = useMemo(() => {
    const p = sampleSupportPoints(supports, POINTS_PER_SUPPORT, mulberry32(32))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p.position, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(p.seed, 1))
    g.setAttribute('aJitter', new THREE.BufferAttribute(p.jitter, 3))
    return { geometry: g, count: p.count }
  }, [supports])
  const pointsMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pointsVertex,
        fragmentShader: pointsFragment,
        uniforms: { uDrop: drop, uSize: { value: POINT_SIZE }, uScale: { value: 540 }, uColor: { value: new THREE.Color('#a6f2c4') } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        // The fragment shader outputs premultiplied color (see ParticleCloud).
        premultipliedAlpha: true,
      }),
    [drop],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      points.geometry.dispose()
      pointsMaterial.dispose()
    },
    [geometry, material, points, pointsMaterial],
  )

  const { particleScale } = useQuality()
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    points.geometry.setDrawRange(0, particleDrawCount(points.count, particleScale, reduce))
  }, [points, particleScale])

  const gl = useThree((s) => s.gl)
  const group = useRef<THREE.Group>(null)
  const columns = useRef<THREE.Mesh>(null)
  const cloud = useRef<THREE.Points>(null)
  useFrame(() => {
    const loading = getAppState().phase === 'loading'
    cure.value = story.ring.cureY
    drop.value = print.drop
    pointsMaterial.uniforms.uScale.value = (gl.domElement.height || 1080) / 2
    if (group.current) group.current.position.y = print.sup
    // Only while the ring is resin with its sprue (Act 2 on), and until every support has fallen.
    const printed = story.ring.resin > 0.5 && story.ring.sprue > 0.5
    if (columns.current) columns.current.visible = loading || (printed && print.drop < 0.999)
    if (cloud.current) cloud.current.visible = loading || (printed && print.drop > 0.001 && print.drop < 0.999)
  })

  // Starts visible: Precompile (traverseVisible) runs before the first frame sets the real values. frustumCulled off:
  // the falling vertices leave the geometry's bounds.
  return (
    <group ref={group} position-y={print.sup} scale={PRINT.scale}>
      <mesh ref={columns} geometry={geometry} material={material} frustumCulled={false} />
      <points ref={cloud} geometry={points.geometry} material={pointsMaterial} frustumCulled={false} />
    </group>
  )
}

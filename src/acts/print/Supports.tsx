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
 * The fall of one support (print frame = world axes): it breaks off at its own moment (seed), tips over a little about
 * its centre and drops with gravity. `d` 0..1 = how far along its own fall it is. Shared by the columns and the points.
 */
const FALL_GLSL = /* glsl */ `
uniform float uDrop;
float supProgress(float seed) { return clamp((uDrop - seed * 0.3) / 0.7, 0.0, 1.0); }
mat3 supRot(float seed, float d) {
  float a = (seed - 0.5) * 1.8 * d;
  float b = (fract(seed * 7.31) - 0.5) * 1.2 * d;
  float ca = cos(a);
  float sa = sin(a);
  float cb = cos(b);
  float sb = sin(b);
  mat3 rz = mat3(ca, sa, 0.0, -sa, ca, 0.0, 0.0, 0.0, 1.0);
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cb, sb, 0.0, -sb, cb);
  return rz * rx;
}
vec3 supFall(vec3 p, vec3 c, float seed, float d) {
  vec3 q = supRot(seed, d) * (p - c) + c;
  q.y -= ${PRINT.supports.fall.toFixed(3)} * d * d;
  q.x += (fract(seed * 3.17) - 0.5) * 0.35 * d;
  return q;
}
`

/**
 * Resin supports (MeshStandardMaterial in the resin colour): clipped by the cure plane like the ring (they print
 * first, from the plate down), and while falling they dissolve with a stable object-space dither as their points
 * take over.
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
      .replace(
        '#include <common>',
        `#include <common>\n${FALL_GLSL}\nattribute vec3 aCenter;\nattribute float aSeed;\nvarying vec3 vObj;\nvarying float vWorldY;\nvarying float vDissolve;`,
      )
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = supRot(aSeed, supProgress(aSeed)) * objectNormal;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float supD = supProgress(aSeed);
        vObj = position;
        transformed = supFall(transformed, aCenter, aSeed, supD);
        vWorldY = (modelMatrix * vec4(transformed, 1.0)).y;
        vDissolve = smoothstep(0.08, 0.7, supD);`,
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
  m.customProgramCacheKey = () => 'print-supports-v1'
  return m
}

const pointsVertex = /* glsl */ `
${FALL_GLSL}
attribute vec3 aCenter;
attribute float aSeed;
attribute vec3 aJitter;
uniform float uSize;
uniform float uScale;
varying float vAlpha;
void main() {
  float d = supProgress(aSeed);
  float k = smoothstep(0.08, 0.7, d);
  vec3 p = supFall(position, aCenter, aSeed, d);
  // Once its support breaks up, each point drifts apart and falls a little faster.
  p += aJitter * 0.18 * k;
  p.y -= 0.6 * k * k;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uScale * projectionMatrix[1][1] / -mv.z * (0.7 + 0.6 * fract(aSeed * 13.7 + aJitter.x));
  vAlpha = k * (1.0 - smoothstep(0.75, 1.0, d));
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
 * onto the upside-down ring, landing on its real surface (rays cast once against the light ring model). They print
 * with the ring and rise with it (print.sup); as the ring turns over they break off, tumble down and turn into points
 * (print.drop). The sprue is the ring's own and stays.
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
    g.setAttribute('aCenter', new THREE.BufferAttribute(p.center, 3))
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
    <group ref={group} position-y={print.sup}>
      <mesh ref={columns} geometry={geometry} material={material} frustumCulled={false} />
      <points ref={cloud} geometry={points.geometry} material={pointsMaterial} frustumCulled={false} />
    </group>
  )
}

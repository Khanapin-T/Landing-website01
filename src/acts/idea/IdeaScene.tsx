import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import * as THREE from 'three'
import { mulberry32 } from '../../lib/random'
import { getAppState } from '../../story/appState'
import { master, syncMaster } from '../../story/master'
import { story } from '../../story/store'
import { shouldRender } from '../../story/visibility'
import { RingPivot } from '../../scene/ring/RingPivot'
import { useRingGeometry } from '../../scene/ring/useRingGeometry'
import type { Box, Vec3 } from '../../scene/ring/normalize'
import { ParticleCloud, type ParticleCloudState } from '../../scene/particles/ParticleCloud'
import { sampleSurface, streamDown, type ParticleBuffers } from '../../scene/particles/particleData'
import { registerPlaceholder } from '../placeholder'
import { IDEA_BEATS } from './beats'
import { dimLabelEls } from './DimLabels'
import { createLineDrawMaterial } from './lineDraw'
import { buildEdgeGeometry, dimensionAnchors, dimensionSegments, toLineGeometry } from './segments'
import { idea } from './state'
import { registerIdea } from './timeline'

const BG = new THREE.Color('#0a1622')
const CELL = new THREE.Color('#15304a')
const SECTION = new THREE.Color('#24496c')
const PARTICLES = 24000
/** Label offsets from the dimension-line midpoints, in screen px (right of the height line, under the width line). */
const LABEL_GAP = 14
const projected = new THREE.Vector3()

const lastPlaced = new WeakMap<HTMLElement, number>()

/**
 * Edge lines (~0.5 s on a 100k-tri ring) and particle targets, built once per ring geometry and kept for the
 * app's lifetime like the ring itself, so StrictMode and re-renders never rebuild them.
 */
const derived = new WeakMap<THREE.BufferGeometry, { edgeGeometry: THREE.BufferGeometry; particles: ParticleBuffers }>()
function ringDerived(ring: THREE.BufferGeometry) {
  let d = derived.get(ring)
  if (!d) {
    d = {
      edgeGeometry: buildEdgeGeometry(ring, 30),
      particles: streamDown(sampleSurface(ring, PARTICLES, mulberry32(11)), mulberry32(12), { floorY: -1.6 }),
    }
    derived.set(ring, d)
  }
  return d
}

/** Writes a DOM label's transform so it sits at a world point (no React state; skips unchanged positions). */
function placeLabel(el: HTMLElement | null, world: THREE.Vector3, camera: THREE.Camera, w: number, h: number, dx: number, dy: number, centerX: boolean): void {
  if (!el) return
  projected.copy(world).project(camera)
  const x = Math.round((((projected.x + 1) / 2) * w + dx) * 2) / 2
  const y = Math.round((((1 - projected.y) / 2) * h + dy) * 2) / 2
  const key = x * 100000 + y
  if (lastPlaced.get(el) === key) return
  lastPlaced.set(el, key)
  el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(${centerX ? '-50%' : '0'}, ${centerX ? '0' : '-50%'})`
}

/** Act 1: the ring drawn as blueprint lines on a grid, dimensioned, turned, filled, then dissolved into points. */
export function IdeaScene() {
  const ring = useRingGeometry()
  const box = useMemo<Box>(() => {
    const b = ring.boundingBox!
    return { min: b.min.toArray() as Vec3, max: b.max.toArray() as Vec3 }
  }, [ring])

  const { edgeGeometry, particles } = useMemo(() => ringDerived(ring), [ring])
  const dimGeometry = useMemo(() => toLineGeometry(dimensionSegments(box)), [box])
  const edges = useMemo(() => createLineDrawMaterial({ color: '#cfe0f5', hot: '#ffffff', hotIntensity: 2.6, span: 0.04, back: 0.28 }), [])
  const dims = useMemo(() => createLineDrawMaterial({ color: '#8aa0b8', hot: '#ffffff', hotIntensity: 1.8, span: 0.4, back: 1 }), [])
  const cloud = useMemo<ParticleCloudState>(() => ({ progress: 0, opacity: 0 }), [])
  const anchors = useMemo(() => {
    const a = dimensionAnchors(box)
    return { height: new THREE.Vector3(...a.height), width: new THREE.Vector3(...a.width) }
  }, [box])
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useEffect(() => () => dimGeometry.dispose(), [dimGeometry])
  useEffect(() => () => edges.material.dispose(), [edges])
  useEffect(() => () => dims.material.dispose(), [dims])

  useLayoutEffect(() => {
    const offs = [registerIdea(master), registerPlaceholder(master)]
    syncMaster()
    return () => offs.forEach((off) => off())
  }, [])

  const root = useRef<THREE.Group>(null)
  const grid = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const visible = shouldRender(getAppState().phase, story.screen, IDEA_BEATS.windowFrom, IDEA_BEATS.windowTo)
    if (root.current) root.current.visible = visible
    edges.uniforms.uDraw.value = idea.draw
    edges.uniforms.uOpacity.value = idea.edges
    dims.uniforms.uDraw.value = idea.dims
    dims.uniforms.uOpacity.value = idea.dimsOpacity
    cloud.progress = idea.dissolve
    cloud.opacity = idea.points
    if (visible) {
      placeLabel(dimLabelEls.height, anchors.height, camera, size.width, size.height, LABEL_GAP, 0, false)
      placeLabel(dimLabelEls.width, anchors.width, camera, size.width, size.height, 0, LABEL_GAP, true)
    }
    // The grid fades by blending its line colors into the background.
    const u = (grid.current?.material as THREE.ShaderMaterial | undefined)?.uniforms
    if (u) {
      ;(u.cellColor.value as THREE.Color).lerpColors(BG, CELL, idea.grid)
      ;(u.sectionColor.value as THREE.Color).lerpColors(BG, SECTION, idea.grid)
    }
  })

  return (
    <group ref={root}>
      {/* Blueprint sheet standing behind the ring. */}
      <Grid
        ref={grid}
        position={[0, 0, -1.6]}
        rotation-x={Math.PI / 2}
        args={[14, 14]}
        cellSize={0.1}
        sectionSize={0.5}
        cellThickness={0.6}
        sectionThickness={1}
        cellColor={CELL}
        sectionColor={SECTION}
        fadeDistance={10}
        fadeStrength={1.2}
        side={THREE.DoubleSide}
      />
      <RingPivot>
        <lineSegments geometry={edgeGeometry} material={edges.material} />
        <ParticleCloud buffers={particles} state={cloud} />
      </RingPivot>
      <lineSegments geometry={dimGeometry} material={dims.material} />
    </group>
  )
}

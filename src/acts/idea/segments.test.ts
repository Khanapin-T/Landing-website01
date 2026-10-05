import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { buildEdgeGeometry, dimensionAnchors, dimensionSegments, edgeRevealAttributes, toLineGeometry } from './segments'
import { createLineDrawMaterial } from './lineDraw'
import { mulberry32 } from '../../lib/random'
import type { Box } from '../../scene/ring/normalize'

const BOX: Box = { min: [-0.47, -0.5, -0.2], max: [0.47, 0.5, 0.2] }

describe('edge reveal attributes', () => {
  // Four segments at the bottom, right, top and left of a ring seen from the front (+Z).
  const pos = new Float32Array([
    -0.1, -0.5, 0, 0.1, -0.5, 0,
    0.5, -0.1, 0, 0.5, 0.1, 0,
    0.1, 0.5, 0, -0.1, 0.5, 0,
    -0.5, 0.1, 0, -0.5, -0.1, 0,
  ])

  it('sweeps counterclockwise from the bottom, one value per segment', () => {
    const { reveal, t } = edgeRevealAttributes(pos, mulberry32(1), 0)
    expect(reveal.length).toBe(8)
    expect(reveal[0]).toBeCloseTo(0)
    expect(reveal[2]).toBeCloseTo(0.25)
    expect(reveal[4]).toBeCloseTo(0.5)
    expect(reveal[6]).toBeCloseTo(0.75)
    for (let i = 0; i < 8; i += 2) {
      expect(reveal[i]).toBe(reveal[i + 1])
      expect(t[i]).toBe(0)
      expect(t[i + 1]).toBe(1)
    }
  })

  it('stays inside [0, 1] with jitter', () => {
    const { reveal } = edgeRevealAttributes(pos, mulberry32(2), 0.08)
    for (const r of reveal) {
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(1)
    }
  })
})

describe('dimension segments', () => {
  it('builds 10 segments on the front plane', () => {
    const d = dimensionSegments(BOX)
    expect(d.positions.length).toBe(10 * 2 * 3)
    expect(d.reveal.length).toBe(20)
    for (let i = 2; i < d.positions.length; i += 3) expect(d.positions[i]).toBeCloseTo(BOX.max[2])
  })

  it('the height line runs right of the ring from bottom to top; the width line under it', () => {
    const d = dimensionSegments(BOX, { gap: 0.12 })
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i < d.positions.length; i += 3) {
      xs.push(d.positions[i])
      ys.push(d.positions[i + 1])
    }
    expect(Math.max(...xs)).toBeGreaterThan(BOX.max[0] + 0.12)
    expect(Math.min(...ys)).toBeLessThan(BOX.min[1] - 0.12)
    const a = dimensionAnchors(BOX, { gap: 0.12 })
    expect(a.height).toEqual([BOX.max[0] + 0.12, 0, BOX.max[2]])
    expect(a.width).toEqual([0, BOX.min[1] - 0.12, BOX.max[2]])
  })

  it('reveals extension lines first, then main lines, then ticks', () => {
    const d = dimensionSegments(BOX)
    // Float32 storage: round before comparing.
    const values = [...new Set(Array.from(d.reveal, (r) => Math.round(r * 100) / 100))].sort((a, b) => a - b)
    expect(values).toEqual([0, 0.2, 0.6])
  })
})

describe('line geometry and material', () => {
  it('exposes position, aReveal and aT attributes', () => {
    const g = toLineGeometry(dimensionSegments(BOX))
    expect(g.getAttribute('position').count).toBe(20)
    expect(g.getAttribute('aReveal').itemSize).toBe(1)
    expect(g.getAttribute('aT').itemSize).toBe(1)
  })

  it('builds edge lines from a mesh', () => {
    const g = buildEdgeGeometry(new THREE.BoxGeometry(1, 1, 1), 30, 3)
    expect(g.getAttribute('position').count).toBe(24) // 12 box edges
    expect(g.getAttribute('aReveal').count).toBe(24)
  })

  it('creates a transparent, non-depth-writing material with draw uniforms', () => {
    const { material, uniforms } = createLineDrawMaterial({ color: '#cfe0f5', hot: '#ffffff', hotIntensity: 2.5, span: 0.04, back: 0.3 })
    expect(material.transparent).toBe(true)
    expect(material.depthWrite).toBe(false)
    expect(uniforms.uDraw.value).toBe(0)
    expect(uniforms.uOpacity.value).toBe(1)
    expect(material.uniforms.uSpan.value).toBe(0.04)
    // The handle must stay live: writing uniforms.uDraw.value has to reach the shader.
    expect(material.uniforms.uDraw).toBe(uniforms.uDraw)
  })
})

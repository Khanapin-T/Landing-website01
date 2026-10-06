import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import {
  BORE_SEGMENTS,
  BRUSH,
  FLANGE,
  FLANGE_RADIUS,
  FLASK_INNER_RADIUS,
  FLASK_RADIUS,
  FOOT,
  FOOT_RADIUS,
  HOLE_BAND,
  HOLE_COLUMNS,
  HOLE_EDGE,
  HOLE_RADIUS,
  HOLE_ROWS,
  INNER_SHELL,
  NECK,
  RIM,
  SHELL,
  STEEL,
  baseProfile,
  createBoreGeometry,
  createFlaskMaterial,
  createSteelMaterial,
  flangeProfile,
  flaskHoleDistance,
  footProfile,
  holeCenters,
  rimProfile,
} from './flaskMaterial'
import { heatUniforms, xrayUniform } from '../../scene/furnace/uniforms'

const H = MOLD.flask.height
const R = MOLD.flask.innerRadius + MOLD.flask.wall
const TOP = MOLD.flask.bottomY + H

function fakeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: ['#include <common>', 'void main() {', '#include <begin_vertex>', '}'].join('\n'),
    fragmentShader: [
      '#include <common>',
      'void main() {',
      '#include <clipping_planes_fragment>',
      '#include <color_fragment>',
      '#include <roughnessmap_fragment>',
      '#include <normal_fragment_begin>',
      '#include <opaque_fragment>',
      '}',
    ].join('\n'),
  }
}

function realShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  }
}

function compile(material: THREE.Material, real = false) {
  const shader = real ? realShader() : fakeShader()
  material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
  return shader
}

const hasPoint = (pts: [number, number][], x: number, y: number) =>
  pts.some((p) => Math.abs(p[0] - x) < 1e-9 && Math.abs(p[1] - y) < 1e-9)

/**
 * Lathe vertices as (radius, y, radial normal, vertical normal), normals normalized (three leaves the last profile
 * point's normal unnormalized; the shader normalizes it).
 */
function latheVertices(pts: [number, number][]) {
  const g = new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    8,
  )
  const pos = g.getAttribute('position')
  const nor = g.getAttribute('normal')
  const n = new THREE.Vector3()
  const out: { r: number; y: number; nr: number; ny: number }[] = []
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i))
    n.fromBufferAttribute(nor, i).normalize()
    out.push({ r, y: pos.getY(i), nr: r > 1e-9 ? (pos.getX(i) * n.x + pos.getZ(i) * n.z) / r : 0, ny: n.y })
  }
  return out
}

describe('flask material', () => {
  it('builds both halves as opaque steel: inner wall on the back side, outer wall on the front side', () => {
    const back = createFlaskMaterial('back')
    expect(back.material.side).toBe(THREE.BackSide)
    const front = createFlaskMaterial('front')
    expect(front.material.side).toBe(THREE.FrontSide)
    for (const m of [back.material, front.material]) {
      expect(m.transparent).toBe(false)
      expect(m.depthWrite).toBe(true)
      expect(m.opacity).toBe(1)
    }
  })

  it('is brushed stainless steel', () => {
    const { material } = createFlaskMaterial('front')
    expect(material.metalness).toBe(1)
    expect(material.roughness).toBeCloseTo(STEEL.roughness)
    expect(material.envMapIntensity).toBeCloseTo(STEEL.envMapIntensity)
    expect(material.color.getHexString()).toBe(STEEL.color.slice(1))
    expect(STEEL.color).toBe('#d2d9e0')
    expect(STEEL.roughness).toBeCloseTo(0.42)
    expect(STEEL.envMapIntensity).toBeCloseTo(3.2)
  })

  it('has no ghost alpha, hole outline glow, fresnel rim or fake bore ring left', () => {
    for (const side of ['back', 'front'] as const) {
      const shader = compile(createFlaskMaterial(side).material)
      // Only the shared furnace uniforms (X-ray dissolve and heat), no per-material look uniforms.
      expect(Object.keys(shader.uniforms).sort()).toEqual(['uHeat', 'uHeatColor', 'uXray'])
      for (const dead of [
        'uGhost',
        'uAlpha',
        'uOutlineColor',
        'uRimColor',
        'uRimAlpha',
        'diffuseColor.a',
        'Fres',
        'HOLE_BORE',
        'ARC_PITCH',
      ]) {
        expect(shader.fragmentShader).not.toContain(dead)
      }
    }
  })

  it('cuts the holes as radial bores (same cross-section on the outer and the inner wall) with a rim highlight', () => {
    const shader = compile(createFlaskMaterial('front').material)
    expect(shader.vertexShader).toContain('varying vec3 vFlaskLocal;')
    expect(shader.vertexShader).toContain('vFlaskLocal = position;')
    expect(shader.fragmentShader).toContain('float flaskHoleDistance(vec3 p)')
    // Distance to the bore axis: the surface radius times the sine of the azimuth offset (not the arc length).
    expect(shader.fragmentShader).toContain('length(p.xz) * sin(')
    expect(shader.fragmentShader).toMatch(/if \(flaskHole < 0\.0\) discard;/)
    expect(shader.fragmentShader).toContain(`#define HOLE_EDGE_WIDTH ${HOLE_EDGE.edge.toFixed(6)}`)
    expect(shader.fragmentShader).toContain('#ifdef FLIP_SIDED')
  })

  it('brushes the steel: fine streaks around the circumference modulate roughness and brightness', () => {
    const shader = compile(createFlaskMaterial('back').material)
    expect(shader.fragmentShader).toContain(`#define BRUSH_FINE ${BRUSH.fine.toFixed(6)}`)
    expect(shader.fragmentShader).toContain('roughnessFactor = clamp(roughnessFactor + flaskBrush * BRUSH_ROUGHNESS')
    expect(shader.fragmentShader).toContain('diffuseColor.rgb *= 1.0 + flaskBrush * BRUSH_TINT;')
    // Subtle: a few percent of brightness, a small roughness swing.
    expect(BRUSH.tint).toBeLessThanOrEqual(0.1)
    expect(BRUSH.roughness).toBeLessThanOrEqual(0.1)
  })

  it('bakes the layout numbers into the shader', () => {
    const shader = compile(createFlaskMaterial('back').material)
    expect(shader.fragmentShader).toContain(`#define HOLE_COLUMNS ${HOLE_COLUMNS.toFixed(1)}`)
    expect(shader.fragmentShader).toContain(`#define HOLE_ROWS ${HOLE_ROWS.toFixed(1)}`)
    expect(shader.fragmentShader).toContain(`#define HOLE_RADIUS ${HOLE_RADIUS.toFixed(6)}`)
    expect(shader.fragmentShader).toContain(`#define FLASK_R ${R.toFixed(6)}`)
    expect(shader.fragmentShader).toContain(`#define FLASK_H ${H.toFixed(6)}`)
  })

  it('finds every anchor in the real three standard shader, in pipeline order', () => {
    const shader = compile(createFlaskMaterial('front').material, true)
    const fs = shader.fragmentShader
    expect(shader.vertexShader).toContain('vFlaskLocal = position;')
    expect(fs).toContain('float flaskHoleDistance(vec3 p)')
    const at = (s: string) => {
      const i = fs.indexOf(s)
      expect(i, s).toBeGreaterThan(-1)
      return i
    }
    const discard = at('discard;')
    const tint = at('diffuseColor.rgb *= 1.0 + flaskBrush')
    const rough = at('roughnessFactor = clamp(')
    // First use of the rim highlight inside main() (the define itself sits above main).
    const edgeUse = fs.indexOf('HOLE_EDGE_GAIN', at('void main()'))
    expect(discard).toBeLessThan(tint)
    expect(tint).toBeGreaterThan(at('#include <color_fragment>'))
    expect(rough).toBeGreaterThan(at('#include <roughnessmap_fragment>'))
    expect(edgeUse).toBeGreaterThan(at('#include <lights_fragment_end>'))
    expect(edgeUse).toBeLessThan(at('#include <opaque_fragment>'))
  })

  it('keeps one constant program key per material kind; the flange/rim/bore steel shares the look without the holes', () => {
    const back = createFlaskMaterial('back')
    const front = createFlaskMaterial('front')
    expect(front.material.customProgramCacheKey()).toBe(back.material.customProgramCacheKey())
    expect(front.material.customProgramCacheKey()).toBe('flask-steel-v4')
    expect(createFlaskMaterial('front').material.customProgramCacheKey()).toBe(front.material.customProgramCacheKey())

    const steel = createSteelMaterial()
    expect(steel.side).toBe(THREE.FrontSide)
    expect(steel.transparent).toBe(false)
    expect(steel.color.getHexString()).toBe(STEEL.color.slice(1))
    expect(steel.customProgramCacheKey()).toBe('flask-steel-plain-v4')
    expect(createSteelMaterial().customProgramCacheKey()).toBe(steel.customProgramCacheKey())
    const fs = compile(steel, true).fragmentShader
    expect(fs).toContain('#define FLASK_NO_HOLES')
    expect(fs).toContain('flaskBrush')
  })
})

describe('flask X-ray dissolve and furnace heat', () => {
  const real = () => ({
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  })

  it.each([
    ['front', () => createFlaskMaterial('front').material],
    ['back', () => createFlaskMaterial('back').material],
    ['steel', () => createSteelMaterial()],
  ])('%s: shares the furnace uniforms and dithers away by uXray', (_name, make) => {
    const shader = real()
    make().onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
    expect(shader.uniforms.uXray).toBe(xrayUniform)
    expect(shader.uniforms.uHeat).toBe(heatUniforms.uHeat)
    expect(shader.uniforms.uHeatColor).toBe(heatUniforms.uHeatColor)
    expect(shader.fragmentShader).toContain('if (uXray > 0.001 && xrayDither() < uXray) discard;')
    expect(shader.fragmentShader).toContain('uHeatColor * uHeat')
    // The heat tint runs on the lit color, before the final color write.
    expect(shader.fragmentShader.indexOf('uHeatColor * uHeat')).toBeLessThan(shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  })

  it('has new program keys (shader source changed)', () => {
    expect(createFlaskMaterial('front').material.customProgramCacheKey()).toBe('flask-steel-v4')
    expect(createSteelMaterial().customProgramCacheKey()).toBe('flask-steel-plain-v4')
  })
})

describe('flask height and the layout derived from it', () => {
  it('is 4.2 tall (one centimetre = 0.4 taller than before) on the same bottom', () => {
    expect(MOLD.flask.height).toBeCloseTo(4.2)
    expect(MOLD.flask.bottomY).toBeCloseTo(-1.4)
    expect(TOP).toBeCloseTo(2.8)
  })

  it('fills the investment from the flask bottom to 0.1 under the top and keeps the trunk at 40% of the height', () => {
    expect(MOLD.investment.bottomY).toBeCloseTo(MOLD.flask.bottomY)
    expect(MOLD.investment.topY).toBeCloseTo(TOP - 0.1)
    expect(MOLD.investment.topY).toBeCloseTo(2.7)
    expect(MOLD.trunk.topY).toBeCloseTo(MOLD.flask.bottomY + 0.4 * H)
    expect(MOLD.trunk.topY).toBeCloseTo(0.28)
  })
})

describe('thick tube wall', () => {
  it('is a real tube: 0.08 wall between the inner and the outer surface', () => {
    expect(MOLD.flask.wall).toBeCloseTo(0.08)
    expect(FLASK_RADIUS).toBeCloseTo(MOLD.flask.innerRadius + 0.08)
    expect(FLASK_INNER_RADIUS).toBeCloseTo(MOLD.flask.innerRadius)
  })

  it('keeps the tape outside the steel and the investment inside it', () => {
    expect(MOLD.flask.innerRadius + MOLD.flask.wall + 0.012).toBeGreaterThan(FLASK_RADIUS)
    expect(MOLD.flask.innerRadius - 0.01).toBeLessThan(FLASK_INNER_RADIUS)
  })

  it('stops both shell surfaces under the rounded rim, in flask-local space (0 = middle of the flask)', () => {
    expect(SHELL.bottom).toBeCloseTo(-H / 2)
    expect(SHELL.top).toBeCloseTo(H / 2 - RIM.round)
    expect(SHELL.height).toBeCloseTo(SHELL.top - SHELL.bottom)
    expect(SHELL.center).toBeCloseTo((SHELL.top + SHELL.bottom) / 2)
  })

  it('runs the inner surface on down through the foot to its bottom (one continuous bore, one shade)', () => {
    expect(INNER_SHELL.top).toBeCloseTo(SHELL.top)
    expect(INNER_SHELL.bottom).toBeCloseTo(-H / 2 - FOOT.height)
    expect(INNER_SHELL.height).toBeCloseTo(INNER_SHELL.top - INNER_SHELL.bottom)
    expect(INNER_SHELL.center).toBeCloseTo((INNER_SHELL.top + INNER_SHELL.bottom) / 2)
    // No hole is cut in the foot part of the inner surface.
    for (const y of [-H / 2 - 0.05, -H / 2 - FOOT.height / 2, -H / 2 - FOOT.height + 0.01]) {
      for (let az = -Math.PI; az < Math.PI; az += 0.2) expect(flaskHoleDistance(y, az, FLASK_INNER_RADIUS)).toBeGreaterThan(0.3)
    }
  })
})

describe('top rim', () => {
  const pts = rimProfile()
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])

  it('caps the wall between the two radii, flush with the flask top', () => {
    expect(Math.max(...xs)).toBeCloseTo(FLASK_RADIUS)
    expect(Math.min(...xs)).toBeCloseTo(FLASK_INNER_RADIUS)
    expect(Math.max(...ys)).toBeCloseTo(TOP)
    // Starts and ends where the shells stop.
    expect(pts[0][0]).toBeCloseTo(FLASK_RADIUS)
    expect(pts[0][1]).toBeCloseTo(MOLD.flask.bottomY + H / 2 + SHELL.top)
    expect(pts[pts.length - 1][0]).toBeCloseTo(FLASK_INNER_RADIUS)
    expect(pts[pts.length - 1][1]).toBeCloseTo(MOLD.flask.bottomY + H / 2 + SHELL.top)
  })

  it('has a flat top with rolled edges (no point on either sharp corner)', () => {
    expect(RIM.round).toBeGreaterThan(0.01)
    expect(RIM.round).toBeLessThan(MOLD.flask.wall / 3)
    const flat = pts.filter((p) => Math.abs(p[1] - TOP) < 1e-9)
    expect(flat.length).toBeGreaterThanOrEqual(2)
    expect(Math.max(...flat.map((p) => p[0])) - Math.min(...flat.map((p) => p[0]))).toBeGreaterThan(MOLD.flask.wall / 3)
    expect(hasPoint(pts, FLASK_RADIUS, TOP)).toBe(false)
    expect(hasPoint(pts, FLASK_INNER_RADIUS, TOP)).toBe(false)
  })

  it('runs up the outside, inward across the top, down the inside (outward normals in LatheGeometry)', () => {
    for (const v of latheVertices(pts)) {
      if (v.r > FLASK_RADIUS - 1e-6) expect(v.nr).toBeGreaterThan(0.5)
      if (v.r < FLASK_INNER_RADIUS + 1e-6) expect(v.nr).toBeLessThan(-0.5)
      if (Math.abs(v.y - TOP) < 1e-9) expect(v.ny).toBeGreaterThan(0.5)
    }
  })
})

describe('flange', () => {
  const pts = flangeProfile()
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const y0 = MOLD.flask.bottomY
  const y1 = y0 + FLANGE.height

  it('is a chunky flat flange on the flask bottom: outer radius = outer tube + 0.60, plate 0.16 high, small neck above', () => {
    expect(FLANGE.overhang).toBeCloseTo(0.6)
    expect(FLANGE.height).toBeCloseTo(0.16)
    expect(FLANGE_RADIUS).toBeCloseTo(FLASK_RADIUS + 0.6)
    expect(Math.max(...xs)).toBeCloseTo(FLANGE_RADIUS)
    // The plate underside is the flask bottom (where the rubber cup top meets it).
    expect(Math.min(...ys)).toBeCloseTo(y0)
    expect(Math.max(...ys)).toBeCloseTo(y0 + FLANGE.height + NECK.height)
    // The neck stays a thin ring around the body, much narrower and lower than the plate.
    expect(NECK.overhang).toBeGreaterThan(0.01)
    expect(NECK.overhang).toBeLessThan(FLANGE.overhang / 8)
    expect(NECK.height).toBeLessThan(FLANGE.height)
  })

  it('has thick chamfered plate edges (no point sits on an outer corner)', () => {
    expect(hasPoint(pts, FLANGE_RADIUS, y0)).toBe(false)
    expect(hasPoint(pts, FLANGE_RADIUS, y1)).toBe(false)
    expect(hasPoint(pts, FLANGE_RADIUS, y0 + FLANGE.chamferBottom)).toBe(true)
    expect(hasPoint(pts, FLANGE_RADIUS, y1 - FLANGE.chamferTop)).toBe(true)
    expect(FLANGE.chamferTop).toBeGreaterThanOrEqual(0.04)
    expect(FLANGE.chamferBottom).toBeGreaterThanOrEqual(0.02)
    expect(FLANGE.chamferTop + FLANGE.chamferBottom).toBeLessThan(FLANGE.height)
  })

  it('hides its inner face inside the wall (never in front of the inner surface)', () => {
    expect(Math.min(...xs)).toBeGreaterThan(FLASK_INNER_RADIUS)
    expect(Math.min(...xs)).toBeLessThan(FLASK_RADIUS)
  })
})

describe('foot under the flange', () => {
  const pts = footProfile()
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const top = MOLD.flask.bottomY
  const bottom = top - FOOT.height

  it('is the same steel tube as the perforated part: outer radius = tube outer radius, hollow down to the tube bore', () => {
    expect(FOOT_RADIUS).toBeCloseTo(FLASK_RADIUS)
    expect(Math.max(...xs)).toBeCloseTo(FLASK_RADIUS)
    // Its bottom ring reaches in to the inner surface (INNER_SHELL carries the bore wall down through the foot).
    expect(Math.min(...xs)).toBeCloseTo(FLASK_INNER_RADIUS)
  })

  it('hangs 0.8 below the flange: from the flask bottom down, the flange and everything above stay put', () => {
    expect(FOOT.height).toBeCloseTo(0.8)
    expect(Math.max(...ys)).toBeCloseTo(top)
    expect(Math.min(...ys)).toBeCloseTo(bottom)
    expect(bottom).toBeCloseTo(-2.2)
  })

  it('has a small chamfer on its lower outer rim', () => {
    expect(FOOT.chamfer).toBeGreaterThanOrEqual(0.01)
    expect(FOOT.chamfer).toBeLessThanOrEqual(0.04)
    expect(hasPoint(pts, FLASK_RADIUS, bottom)).toBe(false)
    expect(hasPoint(pts, FLASK_RADIUS - FOOT.chamfer, bottom)).toBe(true)
    expect(hasPoint(pts, FLASK_RADIUS, bottom + FOOT.chamfer)).toBe(true)
    // Straight side from the chamfer up to the plate underside.
    expect(hasPoint(pts, FLASK_RADIUS, top)).toBe(true)
  })

  it('runs outward along the bottom and up the outside (outward normals in LatheGeometry)', () => {
    for (const v of latheVertices(pts)) {
      if (v.r > FLASK_RADIUS - 1e-6 && v.y > bottom + FOOT.chamfer - 1e-9) expect(v.nr).toBeGreaterThan(0.5)
      if (Math.abs(v.y - bottom) < 1e-9 && v.r < FLASK_RADIUS - FOOT.chamfer + 1e-9) expect(v.ny).toBeLessThan(-0.5)
    }
  })
})

describe('rubber base', () => {
  const { base, baseTopY } = MOLD
  const pts = baseProfile()
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const bottom = baseTopY - base.height
  const floorY = bottom + base.floor
  const boreR = FOOT_RADIUS + base.clearance
  const footBottom = MOLD.flask.bottomY - FOOT.height

  it('is a cup around the foot, 0.65 deep, its top half a centimetre (0.2) under the flange underside', () => {
    expect(base.gap).toBeCloseTo(0.2)
    expect(baseTopY).toBeCloseTo(MOLD.flask.bottomY - base.gap)
    expect(baseTopY).toBeCloseTo(-1.6)
    expect(Math.min(...flangeProfile().map((p) => p[1])) - baseTopY).toBeCloseTo(base.gap)
    expect(base.height).toBeCloseTo(0.65)
    expect(Math.min(...ys)).toBeCloseTo(bottom)
    expect(bottom).toBeCloseTo(-2.25)
    // The rubber top face is the highest rubber (no lip ring): only the cone rises above it, inside the bore.
    for (const p of pts) if (p[1] > baseTopY + 1e-9) expect(p[0]).toBeLessThan(boreR)
  })

  it('is a thin wall of rubber (0.2, half a centimetre) around the foot, under the flange overhang', () => {
    expect(base.radius).toBeCloseTo(FOOT_RADIUS + 0.2)
    expect(base.radius).toBeCloseTo(1.58)
    expect(Math.max(...xs)).toBeCloseTo(base.radius)
    expect(base.radius).toBeLessThan(FLANGE_RADIUS)
    // The rounded edges still leave a flat top ring.
    expect(base.radius - base.edge - boreR).toBeGreaterThan(0.1)
  })

  it('takes the foot in a bore 0.01 wider than it, down to a thin floor the foot stands on', () => {
    expect(base.clearance).toBeCloseTo(0.01)
    expect(hasPoint(pts, boreR, baseTopY)).toBe(true)
    expect(hasPoint(pts, boreR, floorY)).toBe(true)
    expect(base.floor).toBeGreaterThan(0.02)
    expect(base.floor).toBeLessThanOrEqual(0.08)
    // The seated foot (mold.flask = 1) rests on the floor: no gap under it, no overlap with the rubber.
    expect(footBottom).toBeCloseTo(floorY)
    expect(floorY).toBeCloseTo(-2.2)
    expect(boreR).toBeCloseTo(1.39)
  })

  it('lets the descending foot slide into the bore without touching the wall, then shows 0.2 of foot above the rim', () => {
    // The foot tube occupies radii [inner, outer] at every descent height; the rubber above the floor is all outside boreR.
    for (const p of pts) {
      if (p[1] > floorY + 1e-9 && p[0] > base.coneRadius + 1e-9) expect(p[0]).toBeGreaterThanOrEqual(boreR - 1e-9)
    }
    expect(boreR - FOOT_RADIUS).toBeGreaterThan(0.005)
    // The crucible former stays inside the foot's bore.
    expect(base.coneRadius).toBeLessThan(FLASK_INNER_RADIUS)
    // Seated: 0.2 of plain foot shows between the flange underside and the rubber rim.
    expect(MOLD.flask.bottomY - baseTopY).toBeCloseTo(0.2)
    expect(footBottom).toBeLessThan(baseTopY)
  })

  it('has rounded outer edges (no point on the sharp corners)', () => {
    expect(base.edge).toBeGreaterThan(0.015)
    expect(hasPoint(pts, base.radius, baseTopY)).toBe(false)
    expect(hasPoint(pts, base.radius, bottom)).toBe(false)
  })

  it('keeps the crucible-former cone in the middle, from the cup floor up to the trunk bottom, inside the foot', () => {
    expect(pts[pts.length - 1][0]).toBeCloseTo(0)
    expect(pts[pts.length - 1][1]).toBeCloseTo(floorY + base.coneHeight)
    expect(floorY + base.coneHeight).toBeCloseTo(MOLD.trunk.bottomY)
    expect(hasPoint(pts, base.coneRadius, floorY)).toBe(true)
    // The post runs up to the flask bottom; the visible flare above it keeps its old shape (0.22 up to the trunk).
    expect(hasPoint(pts, base.coneRadius, MOLD.flask.bottomY)).toBe(true)
    expect(MOLD.trunk.bottomY - MOLD.flask.bottomY).toBeCloseTo(0.22)
    expect(base.coneRadius).toBeLessThan(FLASK_INNER_RADIUS - 0.3)
  })

  it('drops fully out of frame when hidden', () => {
    expect(base.dropOffset).toBeCloseTo(-(base.height + 3.2 + base.gap))
  })

  it('profile faces outward: bottom down, outer side out, top and floor up, the bore wall toward the axis', () => {
    for (const v of latheVertices(pts)) {
      if (v.r > base.radius - 1e-6) expect(v.nr).toBeGreaterThan(0.5)
      if (Math.abs(v.y - bottom) < 1e-9) expect(v.ny).toBeLessThan(-0.5)
    }
    // Per profile segment: LatheGeometry's outward normal of a segment (dx, dy) is (dy, -dx) in (radius, y).
    const seen = { top: 0, bore: 0, floor: 0 }
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[i + 1]
      const len = Math.hypot(x1 - x0, y1 - y0)
      if (len < 1e-9) continue
      const nr = (y1 - y0) / len
      const ny = -(x1 - x0) / len
      const flatAt = (y: number) => Math.abs(y0 - y) < 1e-9 && Math.abs(y1 - y) < 1e-9
      if (flatAt(baseTopY) && Math.min(x0, x1) >= boreR - 1e-9) {
        expect(ny).toBeGreaterThan(0.99)
        seen.top++
      }
      if (Math.abs(x0 - boreR) < 1e-9 && Math.abs(x1 - boreR) < 1e-9) {
        expect(nr).toBeLessThan(-0.99)
        seen.bore++
      }
      if (flatAt(floorY)) {
        expect(ny).toBeGreaterThan(0.99)
        seen.floor++
      }
    }
    expect(seen).toEqual({ top: 1, bore: 1, floor: 1 })
  })
})

describe('hole pattern', () => {
  const centers = holeCenters()

  it('has about 1.5x the old 24 holes, a bit smaller: 5 per row, 7 staggered rows, 0.32 diameter', () => {
    expect(HOLE_COLUMNS).toBe(5)
    expect(HOLE_ROWS).toBe(7)
    expect(HOLE_RADIUS).toBeCloseTo(0.16)
    expect(centers.length).toBe(HOLE_COLUMNS * HOLE_ROWS)
    expect(centers.length).toBeGreaterThanOrEqual(33)
    expect(centers.length).toBeLessThanOrEqual(38)
  })

  it('starts the holes about one centimetre (0.4) higher above the flange than before', () => {
    expect(HOLE_BAND.bottom).toBeCloseTo(0.82)
    expect(HOLE_BAND.top).toBeCloseTo(0.18)
    const lowest = Math.min(...centers.map((c) => c.y)) - HOLE_RADIUS
    // The old first row's hole edge sat 0.487 above the flask bottom; the holes stay where the author approved them
    // (the flange now sits on the flask bottom with the foot hanging below, so the steel above the neck is wider).
    expect(lowest + H / 2).toBeGreaterThan(0.487 + 0.35)
    expect(lowest + H / 2).toBeLessThan(0.487 + 0.45)
    expect(lowest - (-H / 2 + FLANGE.height + NECK.height)).toBeGreaterThan(0.5)
  })

  it('keeps every hole under the full investment level (each hole gets an investment plug)', () => {
    for (const c of centers) {
      expect(MOLD.flask.bottomY + H / 2 + c.y + HOLE_RADIUS).toBeLessThan(MOLD.investment.topY - 0.05)
    }
  })

  it('puts a hole facing the camera on the first row (azimuth -PI/2) and staggers the next row by half a column', () => {
    expect(flaskHoleDistance(centers[0].y, -Math.PI / 2)).toBeCloseTo(-HOLE_RADIUS)
    expect(flaskHoleDistance(centers[HOLE_COLUMNS].y, -Math.PI / 2 + Math.PI / HOLE_COLUMNS)).toBeCloseTo(-HOLE_RADIUS)
    expect(flaskHoleDistance(centers[HOLE_COLUMNS].y, -Math.PI / 2)).toBeGreaterThan(0)
  })

  it('reports a negative distance inside each hole and zero at its edge, on both wall surfaces', () => {
    for (const c of centers) {
      for (const rho of [FLASK_RADIUS, FLASK_INNER_RADIUS]) {
        expect(flaskHoleDistance(c.y, c.azimuth, rho)).toBeCloseTo(-HOLE_RADIUS)
        expect(flaskHoleDistance(c.y + HOLE_RADIUS, c.azimuth, rho)).toBeCloseTo(0, 5)
        // Sideways: the bore is a straight radial cylinder, so the edge sits at asin(r / rho) on each surface.
        expect(flaskHoleDistance(c.y, c.azimuth + Math.asin(HOLE_RADIUS / rho), rho)).toBeCloseTo(0, 5)
      }
    }
  })

  it('keeps the rim highlight thin next to the hole', () => {
    expect(HOLE_EDGE.edge).toBeLessThan(HOLE_RADIUS / 4)
    const c = centers[0]
    expect(flaskHoleDistance(c.y + HOLE_RADIUS + HOLE_EDGE.edge / 2, c.azimuth)).toBeGreaterThan(0)
    expect(flaskHoleDistance(c.y + HOLE_RADIUS + HOLE_EDGE.edge / 2, c.azimuth)).toBeLessThan(HOLE_EDGE.edge)
  })

  it('leaves at least 0.15 of steel between neighbouring holes (also the half-offset ones) and across the seam', () => {
    const p = (c: { y: number; azimuth: number }) => new THREE.Vector3(R * Math.cos(c.azimuth), c.y, -R * Math.sin(c.azimuth))
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        expect(p(centers[i]).distanceTo(p(centers[j]))).toBeGreaterThan(2 * HOLE_RADIUS + 0.15)
      }
    }
    // Hole diameter about 40% of the same-column pitch (two rows).
    const columnPitch = centers[2 * HOLE_COLUMNS].y - centers[0].y
    expect((2 * HOLE_RADIUS) / columnPitch).toBeGreaterThan(0.3)
    expect((2 * HOLE_RADIUS) / columnPitch).toBeLessThan(0.5)
    // The pattern is continuous across atan's jump at +-PI.
    for (const y of [centers[0].y, centers[HOLE_COLUMNS].y, 0.3]) {
      expect(flaskHoleDistance(y, Math.PI - 1e-6)).toBeCloseTo(flaskHoleDistance(y, -Math.PI + 1e-6), 4)
    }
  })

  it('keeps every hole inside the band, clear of the neck and the top rim', () => {
    for (const c of centers) {
      expect(c.y - HOLE_RADIUS - HOLE_EDGE.edge).toBeGreaterThan(-H / 2 + FLANGE.height + NECK.height + 0.08)
      expect(c.y + HOLE_RADIUS + HOLE_EDGE.edge).toBeLessThan(H / 2 - HOLE_BAND.top / 2)
      expect(c.y + HOLE_RADIUS + HOLE_EDGE.edge).toBeLessThan(SHELL.top - 0.15)
    }
    // Plain steel below the first row and above the last.
    expect(flaskHoleDistance(-H / 2 + 0.01, -Math.PI / 2)).toBeGreaterThan(0.05)
    expect(flaskHoleDistance(H / 2 - 0.01, -Math.PI / 2)).toBeGreaterThan(0.05)
  })
})

describe('bore geometry', () => {
  const g = createBoreGeometry()
  const pos = g.getAttribute('position')
  const nor = g.getAttribute('normal')
  const index = g.getIndex()!
  const centers = holeCenters()
  const perHole = pos.count / centers.length

  it('is one short open tube per hole, cheap', () => {
    expect(pos.count).toBe(centers.length * (BORE_SEGMENTS + 1) * 2)
    expect(index.count / 3).toBe(centers.length * BORE_SEGMENTS * 2)
    expect(index.count / 3).toBeLessThan(2000)
  })

  it('runs through the whole wall: from inside the inner surface to outside the outer surface', () => {
    for (let h = 0; h < centers.length; h++) {
      let lo = Infinity
      let hi = -Infinity
      for (let k = h * perHole; k < (h + 1) * perHole; k++) {
        const r = Math.hypot(pos.getX(k), pos.getZ(k))
        lo = Math.min(lo, r)
        hi = Math.max(hi, r)
      }
      expect(lo).toBeLessThan(FLASK_INNER_RADIUS)
      expect(hi).toBeGreaterThan(FLASK_RADIUS)
      // Ends hug the surfaces (no long stubs sticking out of the wall).
      expect(FLASK_INNER_RADIUS - lo).toBeLessThan(0.025)
      expect(hi - FLASK_RADIUS).toBeLessThan(0.01)
    }
  })

  it('never shows inside the cut (its wall sits on or just outside the hole edge), so no gap shows at the cut', () => {
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k)
      const z = pos.getZ(k)
      const d = flaskHoleDistance(pos.getY(k), Math.atan2(-z, x), Math.hypot(x, z))
      expect(d).toBeGreaterThanOrEqual(-1e-6)
      expect(d).toBeLessThan(0.002)
    }
  })

  it('faces the bore axis (seen from inside the hole) with a matching winding', () => {
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()
    const n = new THREE.Vector3()
    for (let t = 0; t < index.count; t += 3) {
      const [i, j, k] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)]
      a.fromBufferAttribute(pos, i)
      b.fromBufferAttribute(pos, j)
      c.fromBufferAttribute(pos, k)
      const face = b.clone().sub(a).cross(c.clone().sub(a))
      n.fromBufferAttribute(nor, i)
      expect(face.dot(n)).toBeGreaterThan(0)
    }
    // The normal at a vertex points from the wall toward the hole center (on the same height plane offset).
    const c0 = centers[0]
    const axis = new THREE.Vector3(Math.cos(c0.azimuth), 0, -Math.sin(c0.azimuth))
    for (let k = 0; k < perHole; k++) {
      a.fromBufferAttribute(pos, k)
      n.fromBufferAttribute(nor, k)
      const along = a.dot(axis)
      const toAxis = axis.clone().multiplyScalar(along).setY(c0.y).sub(a).normalize()
      expect(n.dot(toAxis)).toBeGreaterThan(0.99)
    }
  })
})

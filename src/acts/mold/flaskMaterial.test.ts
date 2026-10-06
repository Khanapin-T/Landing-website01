import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import {
  BRUSH,
  FLANGE,
  FLASK_RADIUS,
  HOLE_BAND,
  HOLE_COLUMNS,
  HOLE_EDGE,
  HOLE_RADIUS,
  HOLE_ROWS,
  NECK,
  RIM,
  STEEL,
  createFlaskMaterial,
  createSteelMaterial,
  flangeProfile,
  flaskHoleDistance,
  holeCenters,
} from './flaskMaterial'

const H = MOLD.flask.height
const R = MOLD.flask.innerRadius + MOLD.flask.wall

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
    expect(STEEL.color).toBe('#aeb6bf')
    expect(STEEL.roughness).toBeCloseTo(0.34)
    expect(STEEL.envMapIntensity).toBeCloseTo(1.2)
  })

  it('has no ghost alpha, hole outline glow or fresnel rim left', () => {
    for (const side of ['back', 'front'] as const) {
      const shader = compile(createFlaskMaterial(side).material)
      expect(Object.keys(shader.uniforms)).toEqual([])
      for (const dead of ['uGhost', 'uAlpha', 'uOutlineColor', 'uRimColor', 'uRimAlpha', 'diffuseColor.a', 'Fres']) {
        expect(shader.fragmentShader).not.toContain(dead)
      }
    }
  })

  it('injects the hole pattern, the hard cut behind the bore ring and the rim highlight', () => {
    const shader = compile(createFlaskMaterial('front').material)
    expect(shader.vertexShader).toContain('varying vec3 vFlaskLocal;')
    expect(shader.vertexShader).toContain('vFlaskLocal = position;')
    expect(shader.fragmentShader).toContain('float flaskHoleDistance(vec3 p)')
    expect(shader.fragmentShader).toMatch(/if \(flaskHole < -max\(HOLE_BORE_WIDTH, flaskAA\)\) discard;/)
    expect(shader.fragmentShader).toContain(`#define HOLE_BORE_WIDTH ${HOLE_EDGE.bore.toFixed(6)}`)
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
    const edge = at('HOLE_BORE_SHADE, flaskBore')
    expect(discard).toBeLessThan(tint)
    expect(tint).toBeGreaterThan(at('#include <color_fragment>'))
    expect(rough).toBeGreaterThan(at('#include <roughnessmap_fragment>'))
    expect(edge).toBeGreaterThan(at('#include <lights_fragment_end>'))
    expect(edge).toBeLessThan(at('#include <opaque_fragment>'))
  })

  it('keeps one program key for both halves; the flange/rim steel shares the look without the holes', () => {
    const back = createFlaskMaterial('back')
    const front = createFlaskMaterial('front')
    expect(front.material.customProgramCacheKey()).toBe(back.material.customProgramCacheKey())

    const steel = createSteelMaterial()
    expect(steel.side).toBe(THREE.FrontSide)
    expect(steel.transparent).toBe(false)
    expect(steel.color.getHexString()).toBe(STEEL.color.slice(1))
    expect(steel.customProgramCacheKey()).not.toBe(back.material.customProgramCacheKey())
    const fs = compile(steel, true).fragmentShader
    expect(fs).toContain('#define FLASK_NO_HOLES')
    expect(fs).toContain('flaskBrush')
  })
})

describe('flange and rim', () => {
  const pts = flangeProfile()
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])

  it('is a wide flange: outer radius = body + 0.30, plate 0.12 high, with a short neck above it', () => {
    expect(FLANGE.overhang).toBeCloseTo(0.3)
    expect(FLANGE.height).toBeCloseTo(0.12)
    expect(Math.max(...xs)).toBeCloseTo(FLASK_RADIUS + FLANGE.overhang)
    expect(Math.min(...ys)).toBeCloseTo(MOLD.flask.bottomY)
    expect(Math.max(...ys)).toBeCloseTo(MOLD.flask.bottomY + FLANGE.height + NECK.height)
    // The neck is a thin ring around the body, much narrower than the plate.
    expect(NECK.overhang).toBeGreaterThan(0.01)
    expect(NECK.overhang).toBeLessThan(FLANGE.overhang / 4)
    expect(NECK.height).toBeLessThan(FLANGE.height)
  })

  it('has a thick chamfered outer edge (no point sits on the outer corner)', () => {
    const ro = FLASK_RADIUS + FLANGE.overhang
    const y0 = MOLD.flask.bottomY
    const y1 = y0 + FLANGE.height
    const corner = (x: number, y: number) => pts.some((p) => Math.abs(p[0] - x) < 1e-9 && Math.abs(p[1] - y) < 1e-9)
    expect(corner(ro, y0)).toBe(false)
    expect(corner(ro, y1)).toBe(false)
    expect(FLANGE.chamferTop).toBeGreaterThanOrEqual(0.03)
  })

  it('stays inside the rubber base so the base shows a lip around it', () => {
    expect(FLASK_RADIUS + FLANGE.overhang).toBeLessThan(MOLD.base.radius - 0.1)
  })

  it('keeps a thin rolled rim at the top', () => {
    expect(RIM.tube).toBeGreaterThan(0.015)
    expect(RIM.tube).toBeLessThan(0.04)
  })
})

describe('hole pattern', () => {
  const centers = holeCenters()

  it('has HOLE_COLUMNS holes per row and HOLE_ROWS staggered rows', () => {
    expect(centers.length).toBe(HOLE_COLUMNS * HOLE_ROWS)
  })

  it('puts a hole facing the camera on the first row (azimuth -PI/2)', () => {
    expect(flaskHoleDistance(centers[0].y, -Math.PI / 2)).toBeCloseTo(-HOLE_RADIUS)
  })

  it('reports a negative distance inside each hole and the hole radius at its edge', () => {
    for (const c of centers) {
      expect(flaskHoleDistance(c.y, c.azimuth)).toBeCloseTo(-HOLE_RADIUS)
      expect(flaskHoleDistance(c.y + HOLE_RADIUS, c.azimuth)).toBeCloseTo(0, 5)
    }
  })

  it('keeps the bore ring and the rim highlight thin next to the hole', () => {
    expect(HOLE_EDGE.bore).toBeLessThan(HOLE_RADIUS / 4)
    expect(HOLE_EDGE.edge).toBeLessThan(HOLE_RADIUS / 4)
    // Just inside the boundary is the bore, just outside is the rim, both read from the same distance.
    const c = centers[0]
    expect(flaskHoleDistance(c.y + HOLE_RADIUS - HOLE_EDGE.bore / 2, c.azimuth)).toBeLessThan(0)
    expect(flaskHoleDistance(c.y + HOLE_RADIUS - HOLE_EDGE.bore / 2, c.azimuth)).toBeGreaterThan(-HOLE_EDGE.bore)
    expect(flaskHoleDistance(c.y + HOLE_RADIUS + HOLE_EDGE.edge / 2, c.azimuth)).toBeGreaterThan(0)
    expect(flaskHoleDistance(c.y + HOLE_RADIUS + HOLE_EDGE.edge / 2, c.azimuth)).toBeLessThan(HOLE_EDGE.edge)
  })

  it('leaves solid steel between holes (rim highlights never touch) and across the azimuth seam', () => {
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const a = centers[i]
        const b = centers[j]
        const da = Math.abs(((a.azimuth - b.azimuth + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * R
        expect(Math.hypot(da, a.y - b.y)).toBeGreaterThan(2 * (HOLE_RADIUS + HOLE_EDGE.edge) + 0.05)
      }
    }
    // The pattern is continuous across atan's jump at +-PI.
    for (const y of [centers[0].y, centers[HOLE_COLUMNS].y, 0.3]) {
      expect(flaskHoleDistance(y, Math.PI - 1e-6)).toBeCloseTo(flaskHoleDistance(y, -Math.PI + 1e-6), 4)
    }
  })

  it('keeps every hole inside the band, clear of the flange neck and the top rim', () => {
    for (const c of centers) {
      expect(c.y - HOLE_RADIUS - HOLE_EDGE.edge).toBeGreaterThan(-H / 2 + FLANGE.height + NECK.height + 0.05)
      expect(c.y + HOLE_RADIUS + HOLE_EDGE.edge).toBeLessThan(H / 2 - HOLE_BAND.top / 2)
    }
    // Plain steel below the first row and above the last.
    expect(flaskHoleDistance(-H / 2 + 0.01, -Math.PI / 2)).toBeGreaterThan(0.05)
    expect(flaskHoleDistance(H / 2 - 0.01, -Math.PI / 2)).toBeGreaterThan(0.05)
  })
})

import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MOLD } from '../../config/mold'
import { FLASK_INNER_RADIUS, FLASK_RADIUS, HOLE_RADIUS, flaskHoleDistance, holeCenters } from './flaskMaterial'
import {
  INVESTMENT_COLOR,
  INVESTMENT_RADIUS,
  INVESTMENT_RENDER_ORDER,
  LEVEL_OFF,
  PLUG,
  POUR,
  STREAM_GROW,
  createInvestmentMaterial,
  createInvestmentUniforms,
  createPlugGeometry,
  pourPoint,
  pourStrength,
  streamSpan,
  type InvestmentPart,
} from './investmentMaterial'

const PARTS: InvestmentPart[] = ['body', 'surface', 'stream']

function fakeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: [
      '#include <common>',
      'void main() {',
      '#include <beginnormal_vertex>',
      '#include <begin_vertex>',
      '#include <worldpos_vertex>',
      '}',
    ].join('\n'),
    fragmentShader: [
      '#include <common>',
      '#include <clipping_planes_fragment>',
      '#include <color_fragment>',
      '#include <opaque_fragment>',
    ].join('\n'),
  }
}

function compile(material: THREE.Material, shader: ReturnType<typeof fakeShader>) {
  material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
  return shader
}

describe('investment material', () => {
  it('is a standard material (no transmission)', () => {
    for (const part of PARTS) {
      const { material } = createInvestmentMaterial(part)
      expect(material).toBeInstanceOf(THREE.MeshStandardMaterial)
      expect(material).not.toBeInstanceOf(THREE.MeshPhysicalMaterial)
    }
  })

  it('is fully opaque milk-white in every part', () => {
    for (const part of PARTS) {
      const { material } = createInvestmentMaterial(part)
      expect(material.transparent).toBe(false)
      expect(material.opacity).toBe(1)
      expect(material.depthWrite).toBe(true)
      expect(material.color.getHexString()).toBe(new THREE.Color(INVESTMENT_COLOR).getHexString())
    }
    // Milk-white in sRGB: every channel high, warm (red >= blue) but barely tinted.
    const c = new THREE.Color(INVESTMENT_COLOR).getRGB({ r: 0, g: 0, b: 0 }, THREE.SRGBColorSpace)
    expect(Math.min(c.r, c.g, c.b)).toBeGreaterThan(0.88)
    expect(c.r).toBeGreaterThanOrEqual(c.b)
    expect(c.r - c.b).toBeLessThan(0.05)
  })

  it('injects the level discard and the shared uniforms', () => {
    const shared = createInvestmentUniforms()
    const { material, uniforms } = createInvestmentMaterial('body', shared)
    const shader = compile(material, fakeShader())
    expect(shader.uniforms.uLevelY).toBe(shared.uLevelY)
    expect(shader.uniforms.uTime).toBe(shared.uTime)
    expect(shader.uniforms.uBoil).toBe(shared.uBoil)
    expect(shader.uniforms.uPour).toBe(shared.uPour)
    expect(shader.uniforms.uClip).toBe(uniforms.uClip)
    expect(shader.vertexShader).toContain('vInvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;')
    expect(shader.fragmentShader).toContain('uniform float uLevelY;')
    expect(shader.fragmentShader).toContain('if (uClip > 0.5 && vInvWorldY > uLevelY) discard;')
  })

  it('has no transparency code left (no fresnel alpha)', () => {
    const shader = compile(createInvestmentMaterial('body').material, fakeShader())
    expect(shader.fragmentShader).not.toContain('diffuseColor.a')
    expect(shader.fragmentShader).not.toContain('uFresnel')
  })

  it('shares one level between the body and the surface', () => {
    const shared = createInvestmentUniforms()
    const body = createInvestmentMaterial('body', shared)
    const surface = createInvestmentMaterial('surface', shared)
    expect(surface.uniforms.uLevelY).toBe(body.uniforms.uLevelY)
  })

  it('clips the body at the level but not the surface or the stream', () => {
    expect(createInvestmentMaterial('body').uniforms.uClip.value).toBe(1)
    expect(createInvestmentMaterial('surface').uniforms.uClip.value).toBe(0)
    expect(createInvestmentMaterial('stream').uniforms.uClip.value).toBe(0)
  })

  it('finds every anchor in the real three standard shader', () => {
    const { material } = createInvestmentMaterial('surface')
    const shader = compile(material, {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    })
    for (const line of ['uniform float uBoil;', 'float invDisp = 0.0;', 'transformed.y += invDisp;', 'vInvWorldY = (modelMatrix', 'INV_POUR']) {
      expect(shader.vertexShader).toContain(line)
    }
    for (const line of ['uniform float uLevelY;', 'vInvWorldY > uLevelY) discard;', 'uFoamColor', 'invSheen']) {
      expect(shader.fragmentShader).toContain(line)
    }
    // The displacement must come after `transformed` is declared, the normal after `objectNormal`.
    expect(shader.vertexShader.indexOf('transformed.y += invDisp;')).toBeGreaterThan(shader.vertexShader.indexOf('vec3 transformed'))
    expect(shader.vertexShader.indexOf('objectNormal = normalize(')).toBeGreaterThan(shader.vertexShader.indexOf('vec3 objectNormal'))
    // The sheen must be added before the final color write.
    expect(shader.fragmentShader.indexOf('invSheen')).toBeLessThan(shader.fragmentShader.indexOf('#include <opaque_fragment>'))
  })

  it('keeps one program key for every part and state (uniforms only)', () => {
    const keys = PARTS.map((p) => createInvestmentMaterial(p).material.customProgramCacheKey())
    expect(new Set(keys).size).toBe(1)
    const { material, uniforms } = createInvestmentMaterial('surface')
    const key = material.customProgramCacheKey()
    uniforms.uLevelY.value = 0.5
    uniforms.uBoil.value = 1
    uniforms.uPour.value = 1
    expect(material.customProgramCacheKey()).toBe(key)
  })

  it('injects the same source for every part (the program is shared)', () => {
    const [a, ...rest] = PARTS.map((p) => compile(createInvestmentMaterial(p).material, fakeShader()))
    for (const s of rest) {
      expect(s.vertexShader).toBe(a.vertexShader)
      expect(s.fragmentShader).toBe(a.fragmentShader)
    }
  })

  it('starts with the level below the flask bottom', () => {
    expect(LEVEL_OFF).toBeLessThan(MOLD.flask.bottomY)
    expect(createInvestmentUniforms().uLevelY.value).toBe(LEVEL_OFF)
  })

  it('marks only the surface as displaced and only the stream as wobbling', () => {
    const body = createInvestmentMaterial('body')
    expect(body.material.side).toBe(THREE.FrontSide)
    expect(body.uniforms.uSurface.value).toBe(0)
    expect(body.uniforms.uStream.value).toBe(0)
    const surface = createInvestmentMaterial('surface')
    expect(surface.uniforms.uSurface.value).toBe(1)
    expect(surface.uniforms.uStream.value).toBe(0)
    const stream = createInvestmentMaterial('stream')
    expect(stream.uniforms.uStream.value).toBe(1)
    expect(stream.uniforms.uSurface.value).toBe(0)
    expect(INVESTMENT_RENDER_ORDER.surface).toBeGreaterThan(INVESTMENT_RENDER_ORDER.body)
  })
})

describe('investment plugs in the flask holes', () => {
  const g = createPlugGeometry()
  const pos = g.getAttribute('position')
  const nor = g.getAttribute('normal')
  const index = g.getIndex()!
  const centers = holeCenters()
  const perPlug = pos.count / centers.length
  /** Tape radius (Tape.tsx): just outside the steel. */
  const TAPE_R = MOLD.flask.innerRadius + MOLD.flask.wall + 0.012

  /** Vertex k in the frame of its hole: radial distance from the flask axis, offsets (u, v) from the hole axis. */
  const local = (k: number) => {
    const c = centers[Math.floor(k / perPlug)]
    const x = pos.getX(k)
    const z = pos.getZ(k)
    const d = { x: Math.cos(c.azimuth), z: -Math.sin(c.azimuth) }
    const t = { x: Math.sin(c.azimuth), z: Math.cos(c.azimuth) }
    return { along: x * d.x + z * d.z, u: x * t.x + z * t.z, v: pos.getY(k) - c.y, rho: Math.hypot(x, z) }
  }

  it('has one plug per hole, cheap (one draw, a few thousand triangles)', () => {
    expect(Number.isInteger(perPlug)).toBe(true)
    expect(perPlug).toBe(PLUG.verticesPerPlug)
    expect(pos.count).toBe(centers.length * PLUG.verticesPerPlug)
    expect(index.count / 3).toBeLessThan(6000)
  })

  it('is a cylinder of radius HOLE_RADIUS - 0.01 on each hole axis, inside the bore tube', () => {
    expect(PLUG.radius).toBeCloseTo(HOLE_RADIUS - 0.01)
    let rimMax = 0
    for (let k = 0; k < pos.count; k++) {
      const { u, v, rho } = local(k)
      const off = Math.hypot(u, v)
      expect(off).toBeLessThanOrEqual(PLUG.radius + 1e-6)
      rimMax = Math.max(rimMax, off)
      // Distance to the nearest bore wall (the shader's cut): at least 0.01 inside the hole.
      const x = pos.getX(k)
      const z = pos.getZ(k)
      expect(flaskHoleDistance(pos.getY(k), Math.atan2(-z, x), rho)).toBeLessThanOrEqual(PLUG.radius - HOLE_RADIUS + 1e-6)
    }
    expect(rimMax).toBeCloseTo(PLUG.radius, 5)
  })

  it('runs radially from inside the investment body to the outer wall surface, with a low dome under the tape', () => {
    expect(PLUG.bulge).toBeGreaterThan(0)
    expect(PLUG.bulge).toBeLessThanOrEqual(0.008)
    for (let h = 0; h < centers.length; h++) {
      let lo = Infinity
      let hi = -Infinity
      for (let k = h * perPlug; k < (h + 1) * perPlug; k++) {
        const { rho } = local(k)
        lo = Math.min(lo, rho)
        hi = Math.max(hi, rho)
      }
      // Starts in (overlapping) the body, so no gap shows between the body and the plug.
      expect(lo).toBeLessThanOrEqual(INVESTMENT_RADIUS)
      expect(lo).toBeGreaterThan(INVESTMENT_RADIUS - 0.03)
      expect(lo).toBeLessThan(FLASK_INNER_RADIUS)
      // Ends flush with the outer wall, domed at most 0.008 proud, and the tape stays on top of it.
      expect(hi).toBeGreaterThan(FLASK_RADIUS)
      expect(hi).toBeLessThanOrEqual(FLASK_RADIUS + 0.008 + 1e-9)
      expect(hi).toBeCloseTo(FLASK_RADIUS + PLUG.bulge, 5)
      expect(TAPE_R - hi).toBeGreaterThan(0.003)
    }
  })

  it('meets the outer wall surface at its rim (flush, no step at the hole edge) and fills the hole there', () => {
    let rim = 0
    for (let k = 0; k < pos.count; k++) {
      const { u, v, rho } = local(k)
      if (Math.abs(Math.hypot(u, v) - PLUG.radius) > 1e-6) continue
      if (rho < FLASK_INNER_RADIUS) continue
      expect(rho).toBeCloseTo(FLASK_RADIUS, 5)
      rim++
    }
    expect(rim).toBeGreaterThanOrEqual(centers.length * 2 * PLUG.segments)
  })

  it('faces outward: the side away from the hole axis, the cap away from the flask axis, with a matching winding', () => {
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
    for (let k = 0; k < pos.count; k++) {
      n.fromBufferAttribute(nor, k)
      expect(n.length()).toBeCloseTo(1, 5)
      const { rho } = local(k)
      a.fromBufferAttribute(pos, k)
      const outward = new THREE.Vector3(a.x, 0, a.z).normalize()
      // Cap vertices (outside the outer wall or on it, off the rim) face out of the flask.
      if (rho > FLASK_RADIUS + 1e-4) expect(n.dot(outward)).toBeGreaterThan(0.9)
    }
  })
})

describe('pour from the side', () => {
  it('places the stream off the axis, inside the flask, by the azimuth convention', () => {
    const p = pourPoint()
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(POUR.radius)
    expect(p.x).toBeCloseTo(POUR.radius * Math.cos(POUR.azimuth))
    expect(p.z).toBeCloseTo(-POUR.radius * Math.sin(POUR.azimuth))
    expect(POUR.radius).toBeGreaterThan(0.8)
    expect(POUR.radius).toBeLessThan(MOLD.flask.innerRadius - 0.1)
  })

  it('grows the stream from the top and retracts it from the top', () => {
    expect(streamSpan(0)).toEqual({ top: 0, bottom: 0 })
    expect(streamSpan(1)).toEqual({ top: 1, bottom: 1 })
    expect(streamSpan(0.5)).toEqual({ top: 0, bottom: 1 })
    // Growing: the top stays up, the bottom end falls and reaches the surface at STREAM_GROW.
    const g = streamSpan(STREAM_GROW / 2)
    expect(g.top).toBe(0)
    expect(g.bottom).toBeGreaterThan(0)
    expect(g.bottom).toBeLessThan(1)
    expect(streamSpan(STREAM_GROW).bottom).toBe(1)
    // Retracting: the bottom stays on the surface, the top end falls.
    const r = streamSpan(1 - STREAM_GROW / 2)
    expect(r.bottom).toBe(1)
    expect(r.top).toBeGreaterThan(0)
    expect(r.top).toBeLessThan(1)
    expect(streamSpan(1 - STREAM_GROW).top).toBe(0)
  })

  it('never shows the stream at full length in one step and is empty outside the pour', () => {
    let prev = streamSpan(0)
    for (let i = 1; i <= 1000; i++) {
      const s = streamSpan(i / 1000)
      expect(s.top).toBeLessThanOrEqual(s.bottom)
      expect(s.bottom).toBeGreaterThanOrEqual(prev.bottom)
      expect(s.top).toBeGreaterThanOrEqual(prev.top)
      expect(s.bottom - prev.bottom).toBeLessThan(0.1)
      expect(s.top - prev.top).toBeLessThan(0.1)
      prev = s
    }
    for (const f of [-0.5, 0, 1, 1.5]) {
      const s = streamSpan(f)
      expect(s.bottom - s.top).toBe(0)
    }
  })

  it('ripples only while the stream hits the surface', () => {
    expect(pourStrength(0)).toBe(0)
    expect(pourStrength(STREAM_GROW / 2)).toBe(0)
    expect(pourStrength(0.5)).toBe(1)
    expect(pourStrength(1)).toBe(0)
    for (let i = 0; i <= 100; i++) {
      const v = pourStrength(i / 100)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

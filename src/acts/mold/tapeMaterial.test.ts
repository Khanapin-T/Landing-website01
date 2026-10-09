import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { MOLD, TAPE_LENGTH, tapeCenter, tapeLayers } from '../../config/mold'
import {
  TAPE_EDGE_WIDTH,
  TAPE_LAP_LINE_WIDTH,
  TAPE_RENDER_ORDER,
  createTapeMaterial,
  glslFloat,
  tapeLayersGlsl,
} from './tapeMaterial'

const TAU = Math.PI * 2

function fakeShader() {
  return {
    uniforms: {} as Record<string, THREE.IUniform>,
    vertexShader: ['#include <common>', 'void main() {', '#include <begin_vertex>', '}'].join('\n'),
    fragmentShader: [
      '#include <common>',
      'void main() {',
      '#include <clipping_planes_fragment>',
      '#include <color_fragment>',
      '#include <opaque_fragment>',
      '}',
    ].join('\n'),
  }
}

function compile(side: 'back' | 'front', real = false) {
  const handle = createTapeMaterial(side)
  const shader = real
    ? {
        uniforms: {} as Record<string, THREE.IUniform>,
        vertexShader: THREE.ShaderLib.standard.vertexShader,
        fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      }
    : fakeShader()
  handle.material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)
  return { ...handle, shader }
}

describe('tape material', () => {
  it('sets up the two halves as opaque tape that writes depth', () => {
    const back = createTapeMaterial('back').material
    const front = createTapeMaterial('front').material
    expect(back.side).toBe(THREE.BackSide)
    expect(front.side).toBe(THREE.FrontSide)
    for (const m of [back, front]) {
      expect(m.transparent).toBe(false)
      expect(m.depthWrite).toBe(true)
    }
    expect(TAPE_RENDER_ORDER).toEqual({ back: 10, front: 15 })
  })

  it('injects the wrap constants from MOLD.tape and TAPE_LENGTH so they cannot drift', () => {
    const { shader } = compile('front')
    const { width, azimuth0 } = MOLD.tape
    expect(shader.fragmentShader).toContain(`#define TAPE_WIDTH ${glslFloat(width)}`)
    expect(shader.fragmentShader).toContain(`#define TAPE_PASSES ${TAPE_LENGTH}`)
    expect(shader.fragmentShader).toContain(`#define TAPE_AZIMUTH0 ${glslFloat(azimuth0)}`)
    expect(shader.fragmentShader).toContain(`#define TAPE_LENGTH ${glslFloat(TAPE_LENGTH)}`)
    expect(shader.vertexShader).toContain(`#define TAPE_HEIGHT ${glslFloat(MOLD.flask.height)}`)
    expect(glslFloat(7)).toBe('7.0')
    expect(glslFloat(0.325)).toBe('0.325')
  })

  it('injects the layer evaluation, the discard and the lap shading, with no alpha', () => {
    const { shader, uniforms } = compile('front')
    expect(shader.uniforms.uProgress).toBe(uniforms.uProgress)
    expect(shader.uniforms.uEdgeColor).toBe(uniforms.uEdgeColor)
    expect(shader.vertexShader).toContain('vTapeXZ = position.xz;')
    expect(shader.fragmentShader).toContain('uniform float uProgress;')
    expect(shader.fragmentShader).toContain('atan(-vTapeXZ.y, vTapeXZ.x)')
    expect(shader.fragmentShader).toMatch(/if \(tapeN < 0\.5\) discard;/)
    expect(shader.fragmentShader).toContain(`#define TAPE_LAP_LINE_WIDTH ${glslFloat(TAPE_LAP_LINE_WIDTH)}`)
    expect(shader.fragmentShader).not.toContain('TAPE_ALPHA')
    expect(shader.fragmentShader).not.toMatch(/diffuseColor\.a\s*(\*|=)/)
  })

  it('finds every anchor in the real three standard shader, in order', () => {
    for (const side of ['back', 'front'] as const) {
      const { shader } = compile(side, true)
      expect(shader.vertexShader).toContain('varying vec2 vTapeXZ;')
      expect(shader.vertexShader).toContain('vTapeH = position.y / TAPE_HEIGHT + 0.5;')
      const fs = shader.fragmentShader
      const discardAt = fs.indexOf('if (tapeN < 0.5) discard;')
      const alphaAt = fs.indexOf('diffuseColor.rgb *= tapeN > 1.5 ? TAPE_OVERLAP_SHADE : 1.0;')
      const glowAt = fs.indexOf('outgoingLight += uEdgeColor * tapeGlow;')
      expect(fs.indexOf('float tapeEval(')).toBeGreaterThan(-1)
      expect(discardAt).toBeGreaterThan(fs.indexOf('vec4 diffuseColor'))
      expect(alphaAt).toBeGreaterThan(discardAt)
      expect(alphaAt).toBeGreaterThan(-1)
      expect(glowAt).toBeGreaterThan(alphaAt)
      expect(glowAt).toBeLessThan(fs.indexOf('#include <opaque_fragment>'))
    }
  })

  it('keeps one program across progress changes and between the halves', () => {
    const back = createTapeMaterial('back')
    const front = createTapeMaterial('front')
    const key = front.material.customProgramCacheKey()
    front.uniforms.uProgress.value = 0.6
    expect(front.material.customProgramCacheKey()).toBe(key)
    expect(back.material.customProgramCacheKey()).toBe(key)
    expect(front.uniforms.uProgress.value).toBe(0.6)
    expect(back.uniforms.uProgress.value).toBe(0)
  })
})

describe('tape shader mirror', () => {
  it('counts exactly the same layers as tapeLayers everywhere', () => {
    let checked = 0
    for (let h = 0; h <= 1.0001; h += 0.0137) {
      for (let az = -Math.PI; az < Math.PI; az += 0.0731) {
        for (let p = 0; p <= 1.0001; p += 0.0419) {
          const ref = tapeLayers(h, az, p)
          const got = tapeLayersGlsl(h, az, p).layers
          if (got !== ref) throw new Error(`mismatch at h=${h} az=${az} p=${p}: ${got} vs ${ref}`)
          checked++
        }
      }
    }
    expect(checked).toBeGreaterThan(100000)
  })

  it('puts the leading edge at the lay point while the tape is being laid', () => {
    const { azimuth0 } = MOLD.tape
    for (const p of [0.3, 0.5, 0.7]) {
      const front = p * TAPE_LENGTH
      const f = front - Math.floor(front)
      // A point on the strip's center line just behind its end (object-space azimuth a hair before the end).
      const u = front - 0.005
      const fu = u - Math.floor(u)
      const az = azimuth0 + TAU * fu
      const res = tapeLayersGlsl(tapeCenter(u), az, p)
      expect(res.layers).toBeGreaterThanOrEqual(1)
      expect(res.edge).toBeLessThan(TAPE_EDGE_WIDTH)
      // Just past the end on the same turn, nothing new is laid there (no edge glow).
      const ahead = tapeLayersGlsl(tapeCenter(front + 0.005), azimuth0 + TAU * (f + 0.005), p)
      expect(ahead.edge).toBeGreaterThan(TAPE_EDGE_WIDTH)
    }
  })

  it('puts a thin lap line on the later strip only where layers overlap', () => {
    let overlap = 0
    let onLine = 0
    let inside = 0
    for (let h = 0; h <= 1.0001; h += 0.0137) {
      for (let az = -Math.PI; az < Math.PI; az += 0.0731) {
        const r = tapeLayersGlsl(h, az, 1)
        if (r.layers < 2) {
          expect(r.lap).toBe(1e9)
          continue
        }
        overlap++
        // The lap edge is the lower boundary of the topmost strip; lap runs 0..1 over its width.
        expect(r.lap).toBeGreaterThanOrEqual(-1e-9)
        expect(r.lap).toBeLessThanOrEqual(1 + 1e-9)
        if (r.lap < TAPE_LAP_LINE_WIDTH) onLine++
        else inside++
      }
    }
    expect(TAPE_LAP_LINE_WIDTH).toBeLessThan(0.1)
    expect(overlap).toBeGreaterThan(100)
    expect(onLine).toBeGreaterThan(0)
    expect(inside).toBeGreaterThan(onLine)
  })

  it('shows no leading edge before the wrap and once it is done', () => {
    for (let h = 0; h <= 1.0001; h += 0.05) {
      for (let az = -Math.PI; az < Math.PI; az += 0.2) {
        expect(tapeLayersGlsl(h, az, 0).layers).toBe(0)
        expect(tapeLayersGlsl(h, az, 1).edge).toBeGreaterThan(TAPE_EDGE_WIDTH)
      }
    }
  })
})

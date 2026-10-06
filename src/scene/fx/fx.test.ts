import { describe, expect, it } from 'vitest'
import { GradeEffect } from './GradeEffect'
import { LensEffect } from './LensEffect'

describe('GradeEffect', () => {
  it('exposes temperature and vignette uniforms', () => {
    const e = new GradeEffect()
    expect(e.uniforms.get('temperature')!.value).toBe(0)
    expect(e.uniforms.get('vignette')!.value).toBeGreaterThan(0)
  })

  it('clamps temperature to 0..1', () => {
    const e = new GradeEffect()
    e.temperature = 2
    expect(e.uniforms.get('temperature')!.value).toBe(1)
    e.temperature = -1
    expect(e.uniforms.get('temperature')!.value).toBe(0)
  })
})

describe('LensEffect', () => {
  it('exposes edge blur and aberration uniforms', () => {
    const e = new LensEffect({ edgeBlur: 0.5, aberration: 2 })
    expect(e.uniforms.get('edgeBlur')!.value).toBe(0.5)
    expect(e.uniforms.get('aberration')!.value).toBe(2)
  })
})

describe('LensEffect haze', () => {
  it('has a haze strength that starts off and is clamped to 0..1', () => {
    const lens = new LensEffect()
    expect(lens.uniforms.get('haze')!.value).toBe(0)
    lens.haze = 0.4
    expect(lens.uniforms.get('haze')!.value).toBe(0.4)
    lens.haze = 7
    expect(lens.uniforms.get('haze')!.value).toBe(1)
    lens.haze = -1
    expect(lens.uniforms.get('haze')!.value).toBe(0)
  })

  it('advances its clock with the frame time, slower under reduced motion', () => {
    const lens = new LensEffect()
    lens.update({} as never, {} as never, 0.5)
    const t = lens.uniforms.get('time')!.value as number
    expect(t).toBeGreaterThan(0)
    const calm = new LensEffect({ timeScale: 0.15 })
    calm.update({} as never, {} as never, 0.5)
    expect(calm.uniforms.get('time')!.value).toBeCloseTo(t * 0.15, 6)
  })
})

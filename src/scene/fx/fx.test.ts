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

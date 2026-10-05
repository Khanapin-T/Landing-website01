import { describe, expect, it } from 'vitest'
import { FpsWindow } from './fps'

describe('FpsWindow', () => {
  it('reports 0 when empty', () => {
    const w = new FpsWindow()
    expect(w.avg).toBe(0)
    expect(w.low1).toBe(0)
  })

  it('averages steady 60 fps', () => {
    const w = new FpsWindow()
    for (let i = 0; i < 100; i++) w.push(1000 / 60)
    expect(w.avg).toBeCloseTo(60, 1)
  })

  it('exposes a single long frame through the 1% low', () => {
    const w = new FpsWindow()
    for (let i = 0; i < 99; i++) w.push(1000 / 60)
    w.push(100)
    expect(w.low1).toBeCloseTo(10, 1)
  })

  it('ignores tab-switch gaps and invalid samples', () => {
    const w = new FpsWindow()
    w.push(5000)
    w.push(-1)
    w.push(Number.NaN)
    expect(w.avg).toBe(0)
  })

  it('keeps only the last N samples', () => {
    const w = new FpsWindow(10)
    for (let i = 0; i < 10; i++) w.push(100)
    for (let i = 0; i < 10; i++) w.push(1000 / 60)
    expect(w.avg).toBeCloseTo(60, 1)
  })
})

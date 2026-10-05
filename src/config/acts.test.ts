import { describe, expect, it } from 'vitest'
import { ACTS, DEFAULT_ENTRY, TOTAL_SCREENS, actAt, actLocalProgress, actWindows, temperatureAt } from './acts'

describe('acts config', () => {
  it('sums screens to the total', () => {
    expect(TOTAL_SCREENS).toBe(14.5)
  })

  it('builds contiguous windows', () => {
    const w = actWindows()
    expect(w[0]).toMatchObject({ id: 'intro', start: 0, end: 0.5 })
    expect(w[1]).toMatchObject({ id: 'idea', start: 0.5, end: 2.5 })
    expect(w.at(-1)!.end).toBe(TOTAL_SCREENS)
    for (let i = 1; i < w.length; i++) expect(w[i].start).toBe(w[i - 1].end)
  })

  it('lands chapter clicks on the act entry point', () => {
    const w = actWindows()
    const idea = w.find((x) => x.id === 'idea')!
    const print = w.find((x) => x.id === 'print')!
    const mold = w.find((x) => x.id === 'mold')!
    // Idea lands where the edges are drawn and the copy is in, not on its empty first frame.
    expect(idea.entry).toBeCloseTo(1.1)
    // Print lands mid-print (plate up, ring half grown, copy in).
    expect(print.entry).toBeCloseTo(3.1)
    // Acts without an explicit entry land just past their start.
    expect(mold.entry).toBeCloseTo(mold.start + DEFAULT_ENTRY)
    for (const x of w) {
      expect(x.entry).toBeGreaterThan(x.start)
      expect(x.entry).toBeLessThan(x.end)
    }
  })

  it('finds the act for a screen, end-exclusive', () => {
    expect(actAt(0).id).toBe('intro')
    expect(actAt(0.5).id).toBe('idea')
    expect(actAt(2.49).id).toBe('idea')
    expect(actAt(TOTAL_SCREENS).id).toBe('birth')
  })

  it('clamps out-of-range screens (overscroll)', () => {
    expect(actAt(-3).id).toBe('intro')
    expect(actAt(999).id).toBe('birth')
    expect(temperatureAt(-3)).toBe(ACTS[0].temperature)
    expect(temperatureAt(999)).toBe(ACTS.at(-1)!.temperature)
    expect(Number.isNaN(temperatureAt(Number.NaN))).toBe(false)
  })

  it('computes local progress inside a window', () => {
    const idea = actWindows()[1]
    expect(actLocalProgress(0.5, idea)).toBe(0)
    expect(actLocalProgress(1.5, idea)).toBe(0.5)
    expect(actLocalProgress(9, idea)).toBe(1)
    expect(actLocalProgress(-1, idea)).toBe(0)
  })

  it('interpolates temperature linearly inside each act', () => {
    const w = actWindows()
    const fire = w.find((x) => x.id === 'fire')!
    const prev = ACTS.find((a) => a.id === 'mold')!.temperature
    const own = ACTS.find((a) => a.id === 'fire')!.temperature
    expect(temperatureAt(fire.start)).toBeCloseTo(prev)
    expect(temperatureAt((fire.start + fire.end) / 2)).toBeCloseTo((prev + own) / 2)
    expect(temperatureAt(fire.end - 1e-9)).toBeCloseTo(own)
  })
})

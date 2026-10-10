import { describe, expect, it } from 'vitest'
import { WIPE } from '../../config/birth'
import {
  HIDE_ALL,
  eraseClip,
  linkShown,
  ndcToPx,
  revealClip,
  screenLineFromEnds,
  scrimClip,
  wipeLineAt,
  wipePhase,
  wipeStyle,
  type ScreenLine,
  type WipeView,
} from './wipe'

const line = (): ScreenLine => ({ x: 0, y: 0, angle: 0, half: 0 })
const A = 1536 / 730
const W = 1536
const H = 730
/** px x of the polygon's top and bottom inner corners. */
const corners = (clip: string) => {
  const n = clip.match(/-?\d+(\.\d+)?px/g)!.map((v) => parseFloat(v))
  return { top: n[2], bottom: n[4] }
}
const view = (over: Partial<WipeView>): WipeView => ({ phase: 'idle', line: line(), aspect: A, width: W, height: H, wipeX: WIPE.leftX, ...over })

describe('wipe phase', () => {
  it('goes idle -> line -> sweep -> done', () => {
    expect(wipePhase(0, WIPE.leftX)).toBe('idle')
    expect(wipePhase(0.4, WIPE.leftX)).toBe('line')
    expect(wipePhase(1, WIPE.leftX)).toBe('line')
    expect(wipePhase(1, WIPE.leftX + 0.01)).toBe('sweep')
    expect(wipePhase(1, WIPE.rightX)).toBe('done')
  })

  it('starts the sweep at the left page edge and ends it off the right edge', () => {
    expect(WIPE.leftX).toBeGreaterThan(-1)
    expect(WIPE.leftX).toBeLessThan(-0.95)
    expect(WIPE.rightX).toBeGreaterThan(1.03)
    expect(WIPE.half).toBeGreaterThan(1)
  })
})

describe('screen line', () => {
  it('is measured in half-viewport-heights, aspect corrected', () => {
    const l = screenLineFromEnds(0, -0.5, 0.5, 0.5, 2, line())
    expect(l.x).toBeCloseTo(0.5, 9)
    expect(l.y).toBeCloseTo(0, 9)
    expect(l.angle).toBeCloseTo(Math.PI / 4, 9)
    expect(l.half).toBeCloseTo(Math.SQRT2 / 2, 9)
  })

  it('hands over from the projected line exactly and ends upright and full height at the left edge', () => {
    const start = { x: -0.7, y: 0.05, angle: (65 * Math.PI) / 180, half: 0.7 }
    expect(wipeLineAt(start, 0, WIPE.leftX, A, line())).toEqual(start)
    const end = wipeLineAt(start, 1, WIPE.leftX, A, line())
    expect(end.x).toBeCloseTo(WIPE.leftX * A, 9)
    expect(end.y).toBeCloseTo(0, 9)
    expect(end.angle).toBeCloseTo(Math.PI / 2, 9)
    expect(end.half).toBe(WIPE.half)
    // Monotonic on its way: always moving left, turning up and growing.
    let prev = wipeLineAt(start, 0, WIPE.leftX, A, line())
    for (let k = 0.1; k <= 1.0001; k += 0.1) {
      const l = wipeLineAt(start, k, WIPE.leftX, A, line())
      expect(l.x).toBeLessThan(prev.x)
      expect(l.angle).toBeGreaterThan(prev.angle)
      expect(l.half).toBeGreaterThan(prev.half)
      prev = l
    }
  })

  it('sweeps upright at wipeX, continuous with the end of the edge move', () => {
    const start = { x: 0.3, y: 0, angle: 1.1, half: 0.6 }
    const end = wipeLineAt(start, 1, WIPE.leftX, A, line())
    const s = wipeLineAt(start, 1, WIPE.leftX + 1e-6, A, line())
    expect(s.x).toBeCloseTo(end.x, 4)
    expect(s.angle).toBe(Math.PI / 2)
    expect(wipeLineAt(start, 1, 0.5, A, line()).x).toBeCloseTo(0.5 * A, 9)
  })
})

describe('clips', () => {
  it('erases everything right of an upright line at its x', () => {
    const clip = eraseClip({ x: 0, y: 0, angle: Math.PI / 2, half: 1 }, A, W, H)
    expect(clip.startsWith('polygon(-10000px 0px')).toBe(true)
    const c = corners(clip)
    expect(c.top).toBeCloseTo(W / 2, 1)
    expect(c.bottom).toBeCloseTo(W / 2, 1)
  })

  it('follows a tilted line: further right at the top, through the line centre', () => {
    const l = { x: -0.4 * A, y: 0.2, angle: (65 * Math.PI) / 180, half: 0.7 }
    const c = corners(eraseClip(l, A, W, H))
    expect(c.top).toBeGreaterThan(c.bottom)
    const cx = ndcToPx(-0.4, W)
    const cy = ((1 - 0.2) / 2) * H
    // The centre lies on the edge from (top, 0) to (bottom, H).
    expect(c.top + ((c.bottom - c.top) * cy) / H).toBeCloseTo(cx, 0)
    // Screen slope equals the line's: dx/dy = cot(65 deg).
    expect((c.top - c.bottom) / H).toBeCloseTo(1 / Math.tan((65 * Math.PI) / 180), 2)
  })

  it('reveals left of the line and pushes the scrim right of it', () => {
    expect(revealClip(0, W)).toBe(`inset(0px ${W / 2}px 0px 0px)`)
    expect(revealClip(1.2, W)).toBe('inset(0px 0px 0px 0px)')
    expect(scrimClip(0, W)).toBe(`inset(0px 0px 0px ${W / 2}px)`)
    expect(scrimClip(-1.2, W)).toBe('inset(0px 0px 0px 0px)')
  })
})

describe('layer styles', () => {
  it('erase: untouched before the pass, clipped by the line, gone once the sweep starts', () => {
    expect(wipeStyle('erase', view({ phase: 'idle' }))).toEqual({ clip: '', visibility: '' })
    expect(wipeStyle('erase', view({ phase: 'line', line: { x: 0, y: 0, angle: 1.2, half: 1 } })).clip).toMatch(/^polygon/)
    expect(wipeStyle('erase', view({ phase: 'sweep', wipeX: 0 }))).toEqual({ clip: HIDE_ALL, visibility: 'hidden' })
    expect(wipeStyle('erase', view({ phase: 'done', wipeX: WIPE.rightX })).visibility).toBe('hidden')
  })

  it('reveal: hidden until the sweep, left of the line during it, whole after it', () => {
    expect(wipeStyle('reveal', view({ phase: 'idle' }))).toEqual({ clip: HIDE_ALL, visibility: 'hidden' })
    expect(wipeStyle('reveal', view({ phase: 'line' })).visibility).toBe('hidden')
    expect(wipeStyle('reveal', view({ phase: 'sweep', wipeX: 0 }))).toEqual({ clip: revealClip(0, W), visibility: '' })
    expect(wipeStyle('reveal', view({ phase: 'done', wipeX: WIPE.rightX }))).toEqual({ clip: '', visibility: '' })
  })

  it('scrim: as is until the sweep, right of the line during it, gone after it', () => {
    expect(wipeStyle('scrim', view({ phase: 'line' }))).toEqual({ clip: '', visibility: '' })
    expect(wipeStyle('scrim', view({ phase: 'sweep', wipeX: 0 })).clip).toBe(scrimClip(0, W))
    expect(wipeStyle('scrim', view({ phase: 'done', wipeX: WIPE.rightX })).visibility).toBe('hidden')
  })

  it('shows a final link only once the line has passed its right edge', () => {
    expect(linkShown(view({ phase: 'line' }), 0)).toBe(false)
    expect(linkShown(view({ phase: 'sweep', wipeX: 0 }), W / 2 - 1)).toBe(true)
    expect(linkShown(view({ phase: 'sweep', wipeX: 0 }), W / 2 + 1)).toBe(false)
    expect(linkShown(view({ phase: 'done', wipeX: WIPE.rightX }), W)).toBe(true)
  })
})

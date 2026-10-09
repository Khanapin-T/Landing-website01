import { describe, expect, it } from 'vitest'
import { ringBoxCorners } from '../scene/tree/slots'
import { FLIP, FUNNEL } from './fire'
import { CAM, MOLD } from './mold'
import { FLANGE, FLANGE_RADIUS, FLASK_RADIUS } from '../acts/mold/flaskMaterial'
import { CHAMBER, FILL, HOSE, REST_SECONDS, STREAM_TOP_WORLD_Y, TRUNK_END_WORLD_Y, WASHER, chamberProfile, hosePath, washerProfile, fillFrontY, fillProgress, goldFillVisible, goldGlow, streamSpan } from './gold'

describe('vacuum chamber', () => {
  const frameHalf = CAM.tree.z * Math.tan((30 * Math.PI) / 360)
  const frameBottom = CAM.tree.look - frameHalf

  it('is as wide inside as the flask tube, so the flask slides in', () => {
    expect(CHAMBER.innerRadius).toBeGreaterThanOrEqual(FLASK_RADIUS)
    expect(CHAMBER.innerRadius).toBeLessThan(FLASK_RADIUS + 0.05)
  })

  it('is as wide outside as the flange (skirt), like the cup in the photo', () => {
    expect(FLANGE_RADIUS).toBeGreaterThan(FLASK_RADIUS)
    expect(CHAMBER.radius).toBeCloseTo(FLANGE_RADIUS, 9)
  })

  it('stops one rubber washer short of the underside of the flange of the flipped flask', () => {
    const flangeUnderside = 2 * FLIP.pivotY - (MOLD.flask.bottomY + FLANGE.height)
    expect(CHAMBER.topY + WASHER.thickness).toBeCloseTo(flangeUnderside, 9)
  })

  it('has a 5 mm rubber washer (1 unit = 24.8 mm) with the same footprint as the rim, so it is never metal to metal', () => {
    expect(WASHER.thickness).toBeCloseTo(5 / 24.8, 2)
    const p = washerProfile()
    expect(Math.min(...p.map(([r]) => r))).toBe(CHAMBER.innerRadius)
    expect(Math.max(...p.map(([r]) => r))).toBe(CHAMBER.radius)
    expect(Math.min(...p.map(([, y]) => y))).toBe(CHAMBER.topY)
    expect(Math.max(...p.map(([, y]) => y))).toBeCloseTo(CHAMBER.topY + WASHER.thickness, 9)
  })

  it('has a side hose that leaves the wall and runs down out of the frame', () => {
    const p = hosePath()
    expect(p[0][0]).toBeLessThan(CHAMBER.radius)
    expect(p[0][0]).toBeGreaterThan(CHAMBER.innerRadius)
    expect(p[0][1]).toBeLessThan(CHAMBER.topY)
    expect(p[0][1]).toBeGreaterThan(CHAMBER.bottomY)
    expect(p.at(-1)![1]).toBeLessThan(frameBottom - HOSE.radius)
    for (const [x] of p.slice(1)) expect(x).toBeGreaterThan(CHAMBER.radius)
  })

  it('closes below the flipped flask and stays inside the frame', () => {
    const flaskEnd = 2 * FLIP.pivotY - (MOLD.flask.bottomY + MOLD.flask.height)
    expect(CHAMBER.bottomY).toBeLessThan(flaskEnd)
    expect(CHAMBER.bottomY).toBeGreaterThan(frameBottom)
  })

  it('starts fully below the frame', () => {
    expect(CHAMBER.topY + CHAMBER.dropOffset).toBeLessThan(frameBottom)
  })

  it('is a closed cup: outer wall, rim, inner wall, floor', () => {
    const p = chamberProfile()
    expect(p[0]).toEqual([0, CHAMBER.bottomY])
    expect(p.at(-1)).toEqual([0, CHAMBER.bottomY + CHAMBER.floor])
    expect(Math.max(...p.map(([r]) => r))).toBe(CHAMBER.radius)
    expect(Math.max(...p.map(([, y]) => y))).toBe(CHAMBER.topY)
  })
})

describe('fill front (bottom up in the world)', () => {
  it('shows nothing until the fill starts, and during the stream phase', () => {
    expect(fillFrontY(0)).toBe(FILL.off)
    expect(fillFrontY(-1)).toBe(FILL.off)
    expect(fillFrontY(FILL.trail / 2)).toBe(FILL.off)
    expect(fillFrontY(FILL.trail)).toBe(FILL.off)
    expect(FILL.off).toBeGreaterThan(FILL.topY)
  })

  it('then moves monotonically from the world bottom up (local Y falls) from topY to startY and holds', () => {
    expect(fillFrontY(FILL.trail + 1e-6)).toBeCloseTo(FILL.topY, 3)
    expect(fillFrontY(1)).toBeCloseTo(FILL.startY, 9)
    expect(fillProgress(2)).toBe(1)
    let prev = Infinity
    for (let fill = FILL.trail + 0.01; fill <= 1.0001; fill += 0.01) {
      const y = fillFrontY(fill)
      expect(y).toBeLessThan(prev)
      prev = y
    }
    // In the world the front rises.
    const world = (fill: number) => 2 * FLIP.pivotY - fillFrontY(fill)
    expect(world(0.9)).toBeGreaterThan(world(0.5))
  })

  it('fills the lower rings (high local Y) before the trunk and the funnel', () => {
    const arrivesWhenFrontReaches = (y: number) => {
      let fill = FILL.trail + 1e-6
      while (fillFrontY(fill) > y && fill < 1) fill += 0.001
      return fill
    }
    expect(arrivesWhenFrontReaches(1.5)).toBeLessThan(arrivesWhenFrontReaches(MOLD.trunk.topY))
    expect(arrivesWhenFrontReaches(MOLD.trunk.topY)).toBeLessThan(arrivesWhenFrontReaches(FILL.startY + 0.1))
  })

  it('covers every ring corner', () => {
    const top = Math.max(...[0, 1, 2, 3].flatMap((i) => ringBoxCorners(i).map((c) => c.y)))
    expect(FILL.topY).toBeGreaterThanOrEqual(top)
  })

  it('reaches past the funnel mouth at the end', () => {
    expect(FILL.startY).toBeLessThan(MOLD.flask.bottomY)
  })

  it('starts the stream above the frame once the flask is flipped', () => {
    const worldY = 2 * FLIP.pivotY - FILL.streamY
    const frameTop = CAM.tree.look + CAM.tree.z * Math.tan((30 * Math.PI) / 360)
    expect(worldY).toBeGreaterThan(frameTop)
    expect(FILL.streamY).toBeLessThan(FUNNEL.exitY)
    expect(STREAM_TOP_WORLD_Y).toBeCloseTo(worldY, 9)
  })
})

describe('stream span (world Y)', () => {
  it('draws nothing at fill 0', () => {
    const s = streamSpan(0)
    expect(s.top).toBe(s.bottom)
  })

  it('keeps its top above the frame and its tip falls to the trunk end during the trail phase', () => {
    let prev = streamSpan(0).bottom
    for (const fill of [0.05, 0.1, 0.2, 0.29]) {
      const s = streamSpan(fill)
      expect(s.top).toBe(STREAM_TOP_WORLD_Y)
      expect(s.bottom).toBeLessThan(prev)
      expect(s.bottom).toBeGreaterThan(TRUNK_END_WORLD_Y)
      prev = s.bottom
    }
    expect(streamSpan(FILL.trail).bottom).toBeCloseTo(TRUNK_END_WORLD_Y, 9)
    expect(TRUNK_END_WORLD_Y).toBeCloseTo(2 * FLIP.pivotY - MOLD.trunk.topY, 9)
  })

  it('then ends at the trunk end until the front climbs above it, and at the front after', () => {
    expect(streamSpan(0.4).bottom).toBeCloseTo(TRUNK_END_WORLD_Y, 9)
    const high = streamSpan(0.99)
    expect(high.bottom).toBeCloseTo(2 * FLIP.pivotY - fillFrontY(0.99), 9)
    expect(high.bottom).toBeGreaterThan(TRUNK_END_WORLD_Y)
    expect(high.bottom).toBeLessThan(high.top)
    let prev = TRUNK_END_WORLD_Y - 1
    for (let fill = FILL.trail; fill <= 1; fill += 0.01) {
      const b = streamSpan(fill).bottom
      expect(b).toBeGreaterThanOrEqual(prev)
      prev = b
    }
  })
})
describe('goldGlow', () => {
  it('is fully molten at the start and cold gold once cooled', () => {
    expect(goldGlow(0, 0)).toBeCloseTo(1, 9)
    expect(goldGlow(1, 1)).toBe(0)
  })

  it('flashes when the metal has just filled the cavity, then settles', () => {
    expect(goldGlow(1, 0.03)).toBeGreaterThan(1.5)
    expect(goldGlow(1, 0.5)).toBeLessThan(1)
  })

  it('never flashes while still filling', () => {
    expect(goldGlow(0.5, 0)).toBeCloseTo(1, 9)
  })
})

describe('flip-aware visibility gate', () => {
  const on = { fill: 0.5, xray: 1, flip: 1 }

  it('shows the fill only while the flask is fully flipped', () => {
    expect(goldFillVisible(on)).toBe(true)
    expect(goldFillVisible({ ...on, flip: 0.5 })).toBe(false)
  })

  it('hides it without X-ray or before the fill starts, and keeps it when full', () => {
    expect(goldFillVisible({ ...on, xray: 0 })).toBe(false)
    expect(goldFillVisible({ ...on, fill: 0 })).toBe(false)
    expect(goldFillVisible({ ...on, fill: 1 })).toBe(true)
  })
})
describe('rest timer length', () => {
  it('is 10 minutes for the gold rest', () => {
    expect(REST_SECONDS).toBe(600)
  })
})

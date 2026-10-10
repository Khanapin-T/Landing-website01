import { describe, expect, it } from 'vitest'
import { JAR, JAR_FLOOR_Y } from './birth'
import {
  JAR_FOOTPRINT,
  TABLE,
  VESSELS,
  footprintGap,
  vesselContentProfile,
  vesselGlassProfile,
  vesselOuterProfile,
} from './birthTable'

describe('table', () => {
  it('has its top at the jar floor, just under it so nothing z-fights', () => {
    expect(TABLE.topY).toBeLessThanOrEqual(JAR_FLOOR_Y)
    expect(JAR_FLOOR_Y - TABLE.topY).toBeLessThan(0.01)
  })

  it('is wide enough that its ends are far out of the jar view', () => {
    expect(TABLE.halfX).toBeGreaterThan(14)
    expect(TABLE.frontZ).toBeGreaterThan(JAR_FOOTPRINT.z + JAR.radius)
    expect(TABLE.backZ).toBeLessThan(JAR_FOOTPRINT.z - JAR.radius)
  })
})

describe('vessel layout', () => {
  it('has four or five vessels with unique ids', () => {
    expect(VESSELS.length).toBeGreaterThanOrEqual(4)
    expect(VESSELS.length).toBeLessThanOrEqual(5)
    expect(new Set(VESSELS.map((v) => v.id)).size).toBe(VESSELS.length)
  })

  it('never touches the acid jar footprint (so the falling rings are clear)', () => {
    for (const v of VESSELS) expect(footprintGap(v, JAR_FOOTPRINT), v.id).toBeGreaterThan(0.3)
  })

  it('never touches another vessel', () => {
    for (let i = 0; i < VESSELS.length; i++)
      for (let j = i + 1; j < VESSELS.length; j++) expect(footprintGap(VESSELS[i], VESSELS[j]), `${VESSELS[i].id}/${VESSELS[j].id}`).toBeGreaterThan(0.2)
  })

  it('stays behind or beside the acid jar, never in front of it', () => {
    for (const v of VESSELS) expect(v.z, v.id).toBeLessThanOrEqual(JAR_FOOTPRINT.z)
  })

  it('stands inside the table bounds', () => {
    for (const v of VESSELS) {
      expect(v.x - v.radius, v.id).toBeGreaterThan(-TABLE.halfX)
      expect(v.x + v.radius, v.id).toBeLessThan(TABLE.halfX)
      expect(v.z - v.radius, v.id).toBeGreaterThan(TABLE.backZ)
      expect(v.z + v.radius, v.id).toBeLessThan(TABLE.frontZ)
    }
  })

  it('keeps a couple of vessels on the left and most on the right', () => {
    expect(VESSELS.filter((v) => v.x < 0).length).toBeGreaterThanOrEqual(1)
    expect(VESSELS.filter((v) => v.x < 0).length).toBeLessThanOrEqual(2)
    expect(VESSELS.filter((v) => v.x > 0).length).toBeGreaterThanOrEqual(3)
  })

  it('has muted contents: the acid stays the only saturated thing', () => {
    for (const v of VESSELS) if (v.content) expect(v.content.opacity, v.id).toBeLessThanOrEqual(0.4)
  })
})

describe('vessel shapes', () => {
  it('stand on the table: the profile starts on the axis at the base and rises to the full height', () => {
    for (const v of VESSELS) {
      const p = vesselOuterProfile(v)
      expect(p[0], v.id).toEqual([0, 0])
      expect(p.at(-1)![1], v.id).toBeCloseTo(v.height, 6)
      for (let i = 1; i < p.length; i++) expect(p[i][1], v.id).toBeGreaterThanOrEqual(p[i - 1][1])
    }
  })

  it('never reach beyond their footprint radius, and reach it', () => {
    for (const v of VESSELS) {
      const widest = Math.max(...vesselOuterProfile(v).map(([x]) => x))
      expect(widest, v.id).toBeLessThanOrEqual(v.radius + 1e-9)
      expect(widest, v.id).toBeGreaterThan(v.radius - 1e-6)
    }
  })

  it('have a closed glass shell that never dips under the table', () => {
    for (const v of VESSELS) {
      const g = vesselGlassProfile(v)
      expect(g.at(-1)![0], v.id).toBe(0)
      for (const [x, y] of g) {
        expect(y, v.id).toBeGreaterThanOrEqual(0)
        expect(x, v.id).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('hold their contents inside the glass, under the rim', () => {
    for (const v of VESSELS) {
      const c = vesselContentProfile(v)
      if (!v.content) {
        expect(c, v.id).toBeNull()
        continue
      }
      const top = v.content.fill * v.height
      expect(v.content.fill, v.id).toBeLessThan(1)
      const widest = Math.max(...vesselOuterProfile(v).map(([x]) => x))
      for (const [x, y] of c!) {
        expect(y, v.id).toBeLessThanOrEqual(top + 1e-9)
        expect(x, v.id).toBeLessThan(widest)
      }
      expect(c!.at(-1)![0], v.id).toBe(0)
      expect(c!.at(-1)![1], v.id).toBeCloseTo(top, 6)
    }
  })
})

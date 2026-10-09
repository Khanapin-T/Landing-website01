import { BURN, FLIP } from './fire'
import { MOLD } from './mold'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/**
 * The metal fill (Act 5). `story.flask.fill` 0..1. Heights are flask-local Y of the UNFLIPPED flask (the frame the
 * tree was built in); the flask is flipped in Act 5, so this Y rises where the world Y falls. The gold runs down the
 * trunk and fills the mold from the BOTTOM UP in the world, i.e. local y >= front: the first `trail` of the fill is
 * the stream falling (nothing solid yet), then the front moves from `topY` (world bottom, above every ring corner)
 * down to `startY` (just past the funnel mouth, world top). `band` = thickness of the glowing band on the filled side of the
 * front. `off` = front value when nothing is filled (above everything: every fragment is discarded). `streamY` =
 * flask-local Y where the stream starts: above the frame in the flipped world (pinned by gold.test.ts).
 */
export const FILL = {
  startY: MOLD.flask.bottomY - 0.02,
  topY: BURN.topY,
  trail: 0.3,
  band: 0.08,
  off: 1000,
  streamY: -4.2,
} as const

/** 0..1 how far the solid front has travelled for a fill value (0 while the stream is still falling). */
export function fillProgress(fill: number): number {
  return clamp01((fill - FILL.trail) / (1 - FILL.trail))
}

/**
 * Flask-local Y of the solid front: fragments BELOW it (local y < front) are not drawn yet. Nothing is filled until
 * the stream has landed; then the front falls from `topY` to `startY` (= rises from the bottom in the world).
 */
export function fillFrontY(fill: number): number {
  if (fill <= FILL.trail) return FILL.off
  return FILL.topY + (FILL.startY - FILL.topY) * fillProgress(fill)
}

/** World Y of the stream's top: above the frame, on the flask axis. */
export const STREAM_TOP_WORLD_Y = 2 * FLIP.pivotY - FILL.streamY
/** World Y of the far end of the trunk (the stream pours into it, then through the sprues into the rings). */
export const TRUNK_END_WORLD_Y = 2 * FLIP.pivotY - MOLD.trunk.topY

/**
 * The visible molten stream as world Y values (`top` >= `bottom`; top === bottom = nothing to draw). The top stays
 * above the frame. During the trail phase the tip falls from the top down the axis to the trunk's far end; after
 * that the stream ends at the rising front, but never above the trunk end (the gold runs down inside the trunk and
 * the sprues, which are not filled yet).
 */
export function streamSpan(fill: number): { top: number; bottom: number } {
  const top = STREAM_TOP_WORLD_Y
  if (fill <= 0) return { top, bottom: top }
  if (fill < FILL.trail) {
    const k = clamp01(fill / FILL.trail)
    return { top, bottom: top + (TRUNK_END_WORLD_Y - top) * k }
  }
  const frontWorld = 2 * FLIP.pivotY - fillFrontY(fill)
  return { top, bottom: Math.max(frontWorld, TRUNK_END_WORLD_Y) }
}

/**
 * Brightness multiplier of the molten glow (applied to the white-yellow heat color): 1 while pouring, a flash
 * right after the cavity is full (fill ~ 1, cool 0..0.4), then fading to 0 as the gold cools (`story.flask.cool`).
 */
export function goldGlow(fill: number, cool: number): number {
  const molten = 1 - smooth(0, 1, cool)
  const flash = 1.6 * smooth(0.85, 1, fill) * (1 - smooth(0, 0.4, cool))
  return molten + flash
}

/** The fill and the stream are drawn under a fixed flip transform: only valid while the flask is fully flipped. */
export function goldFillVisible(f: { fill: number; xray: number; flip: number }): boolean {
  return f.flip > 0.999 && f.fill > 0.001 && f.xray > 0.001
}

/**
 * The vacuum chamber (Act 5), in world space around the flipped flask: a plain dark iron cup that slides up from
 * below. A little wider than the flask's flange (skirt, radius 1.98), which sits inside its mouth with the rim flush
 * with the flange's outer face (`topY`); the closed bottom sits below the flask's far end. `dropOffset` = start
 * position, fully below the frame. Shapes for the author to correct; no details yet.
 */
export const CHAMBER = {
  radius: 2.12,
  wall: 0.08,
  floor: 0.1,
  topY: 2 * FLIP.pivotY - MOLD.flask.bottomY,
  bottomY: 2 * FLIP.pivotY - (MOLD.flask.bottomY + MOLD.flask.height) - 0.35,
  dropOffset: -7,
} as const

/** Lathe profile (x = radius, y = world height) of the chamber cup: outer wall, rim, inner wall, floor. */
export function chamberProfile(): [number, number][] {
  const { radius: r, wall, floor, topY, bottomY } = CHAMBER
  return [
    [0, bottomY],
    [r, bottomY],
    [r, topY],
    [r - wall, topY],
    [r - wall, bottomY + floor],
    [0, bottomY + floor],
  ]
}

/** The vacuum hose: leaves the chamber's side wall (right, away from the copy) at `exitY`, bends down out of the frame. */
export const HOSE = { radius: 0.11, exitY: CHAMBER.bottomY + 0.9, endY: -5 } as const

/** Hose center line in world space (chamber slid fully on); the first point sits inside the wall so the joint is hidden. */
export function hosePath(): [number, number, number][] {
  const r = CHAMBER.radius
  const y = HOSE.exitY
  return [
    [r - CHAMBER.wall / 2, y, 0],
    [r + 0.5, y, 0],
    [r + 1.0, y - 0.4, 0],
    [r + 1.2, y - 1.6, 0],
    [r + 1.3, HOSE.endY, 0],
  ]
}

/** The rest timer runs 00:00 to 10:00 (a stylization inside the real 5 to 15 minute rest). */
export const REST_SECONDS = 600

export function restClock(rest: number): string {
  const s = Math.round(clamp01(rest) * REST_SECONDS)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

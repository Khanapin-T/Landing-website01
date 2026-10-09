import { CAM, FURNACE_BACK, MOLD } from './mold'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Burnout. `story.flask.burn` 0..1: the front sweeps down the tree from `topY` to `bottomY` while burn goes
 * 0 .. 1 - trail; each point detaches as the front passes it and needs `trail` more burn to flow down the trunk and
 * out through the funnel (so at burn = 1 every point is out). `off` = front value when nothing burns (far above
 * everything: no fragment is discarded). `band` = thickness of the glowing band under the front, world units.
 * `topY` must stay above the highest ring corner (pinned by fire.test.ts).
 */
export const BURN = {
  topY: 1.8,
  bottomY: MOLD.trunk.bottomY - 0.05,
  trail: 0.3,
  off: 1000,
  band: 0.07,
} as const

/** 0..1 how far the front has travelled for a burn value. */
export function frontProgress(burn: number): number {
  return clamp01(burn / (1 - BURN.trail))
}

/** World Y of the burn front: fragments above it are gone. */
export function burnFrontY(burn: number): number {
  if (burn <= 0) return BURN.off
  return BURN.topY + (BURN.bottomY - BURN.topY) * frontProgress(burn)
}

/** Burn value at which the front reaches world height `y` (the moment a point there detaches as a particle). */
export function detachAt(y: number): number {
  return clamp01((BURN.topY - y) / (BURN.topY - BURN.bottomY)) * (1 - BURN.trail)
}

/** World Y where the burnout particles are gone: well under the foot (the foot is MOLD.foot.height long). */
export const FUNNEL = { exitY: MOLD.flask.bottomY - MOLD.foot.height - 0.4 } as const

/** The flask flips about this world Y: the middle of the flask including its foot, so it stays framed. */
export const FLIP = { pivotY: MOLD.flask.bottomY + (MOLD.flask.height - MOLD.foot.height) / 2 } as const

/** Heat the furnace leaves in the flask at the end of Act 4 (Act 5 continues from it). */
export const FIRE_END_HEAT = 0.6

/**
 * Heating coils (after the muffle furnace photos): on each of the four walls of a box tunnel one long spring is laid
 * in a serpentine, three long runs along the depth (from the front opening toward the back, so they converge toward the
 * middle in perspective) joined by U-turns. `zNear` / `zFar` = depth range of the runs (the front opening plane is
 * the flask middle plane so the ceiling and floor clear the flask), `edge` = how far the front opening reaches toward
 * the screen edge (fraction of the distance from the flask axis to that edge), `spacing` = distance between
 * neighbouring runs as a fraction of the wall half extent across the runs. `pitch` = distance along the path per turn
 * of the spring. `centerY` = world Y of the screen center (the camera looks level there).
 */
export const COILS = {
  zNear: FURNACE_BACK,
  zFar: FURNACE_BACK - 9,
  edge: 0.9,
  spacing: 0.55,
  coilRadius: 0.16,
  tubeRadius: 0.04,
  pitch: 0.2,
  stepsPerTurn: 12,
  radialSegments: 8,
  centerY: CAM.tree.look,
} as const

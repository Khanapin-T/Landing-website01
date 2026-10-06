import { MOLD } from '../../config/mold'

/**
 * Lathe profile (x = radius, y = world height) of the funnel the crucible former leaves in the investment: from the
 * flask bottom at the cone radius up to the trunk bottom. Mirrors the cone part of baseProfile() in flaskMaterial.ts.
 */
export function funnelProfile(): [number, number][] {
  const from = MOLD.flask.bottomY
  const top = MOLD.trunk.bottomY
  const rise = top - from
  const { coneRadius } = MOLD.base
  return [
    [coneRadius, from],
    [coneRadius * 0.75, from + rise * 0.24],
    [coneRadius * 0.53, from + rise * 0.55],
    [MOLD.trunk.radius * 1.4, top],
  ]
}

import { stepIndex } from '../../hud/stepIndex'
import { WATER_BEATS } from './beats'

/** Step start screens, in list order (Water, Rest, Tree out). */
export const STEP_STARTS: readonly number[] = [WATER_BEATS.steps.water, WATER_BEATS.steps.rest, WATER_BEATS.steps.treeOut]

export function stepAt(screen: number): number {
  return stepIndex(STEP_STARTS, screen)
}

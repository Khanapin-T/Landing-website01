import { stepIndex } from '../../hud/stepIndex'
import { GOLD_BEATS } from './beats'

/** Step start screens, in list order (Vacuum, Pour, Rest). */
export const STEP_STARTS: readonly number[] = [GOLD_BEATS.steps.vacuum, GOLD_BEATS.steps.pour, GOLD_BEATS.steps.rest]

export function stepAt(screen: number): number {
  return stepIndex(STEP_STARTS, screen)
}

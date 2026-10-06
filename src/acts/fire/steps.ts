import { stepIndex } from '../../hud/stepIndex'
import { FIRE_BEATS } from './beats'

/** Step start screens, in list order (Furnace, Burnout, Flip). */
export const STEP_STARTS: readonly number[] = [FIRE_BEATS.steps.furnace, FIRE_BEATS.steps.burnout, FIRE_BEATS.steps.flip]

export function stepAt(screen: number): number {
  return stepIndex(STEP_STARTS, screen)
}

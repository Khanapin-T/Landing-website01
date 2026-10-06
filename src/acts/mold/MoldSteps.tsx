import { content } from '../../content'
import { StepList } from '../../hud/StepList'
import { STEP_STARTS } from './steps'

/** Process step list of Act 3. */
export function MoldSteps() {
  return <StepList names={content.mold.steps} starts={STEP_STARTS} />
}

import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { StepList, revealStepList } from '../../hud/StepList'
import { FIRE_BEATS } from './beats'
import { STEP_STARTS } from './steps'

const c = content.fire

/** Act 4 copy: heading, caption, step list. */
export function FireHud() {
  return (
    <ActCopy
      label={content.actNames.fire}
      heading={c.heading}
      caption={c.caption}
      copyIn={FIRE_BEATS.copyIn}
      copyOut={FIRE_BEATS.copyOut}
      extendReveal={revealStepList}
    >
      <StepList names={c.steps} starts={STEP_STARTS} />
    </ActCopy>
  )
}

import { content } from '../../content'
import { WATER_REST_SECONDS } from '../../config/water'
import { ActCopy } from '../../hud/ActCopy'
import { RestChip } from '../../hud/RestChip'
import { StepList, revealStepList } from '../../hud/StepList'
import { WATER_BEATS } from './beats'
import { water } from './state'
import { STEP_STARTS } from './steps'

const c = content.water
const readRest = () => water.rest

/** Act 6 copy: heading, caption, step list and the water timer in the column. */
export function WaterHud() {
  return (
    <ActCopy
      label={content.actNames.water}
      heading={c.heading}
      caption={c.caption}
      copyIn={WATER_BEATS.copyIn}
      copyOut={WATER_BEATS.copyOut}
      extendReveal={revealStepList}
    >
      <StepList names={c.steps} starts={STEP_STARTS} />
      <RestChip read={readRest} seconds={WATER_REST_SECONDS} showFrom={WATER_BEATS.steps.rest} showTo={WATER_BEATS.copyOut} />
    </ActCopy>
  )
}

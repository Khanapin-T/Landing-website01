import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { StepList, revealStepList } from '../../hud/StepList'
import { RestChip } from '../../hud/RestChip'
import { VacuumGauge } from '../../hud/VacuumGauge'
import { REST_SECONDS } from '../../config/gold'
import { GOLD_BEATS } from './beats'
import { gold } from './state'
import { STEP_STARTS } from './steps'

const c = content.gold

const readVacuum = () => gold.vacuum
const readRest = () => gold.rest

/** Act 5 copy: heading, caption, step list and the rest chip in the column, the vacuum gauge in the corner. */
export function GoldHud() {
  return (
    <>
      <ActCopy
        label={content.actNames.gold}
        heading={c.heading}
        caption={c.caption}
        copyIn={GOLD_BEATS.copyIn}
        copyOut={GOLD_BEATS.copyOut}
        extendReveal={revealStepList}
      >
        <StepList names={c.steps} starts={STEP_STARTS} />
        <RestChip read={readRest} seconds={REST_SECONDS} showFrom={GOLD_BEATS.steps.rest} showTo={GOLD_BEATS.copyOut} />
      </ActCopy>
      <VacuumGauge read={readVacuum} showFrom={GOLD_BEATS.gaugeIn} showTo={GOLD_BEATS.gaugeOut} />
    </>
  )
}

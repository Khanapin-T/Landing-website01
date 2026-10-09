import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { StepList, revealStepList } from '../../hud/StepList'
import { VacuumGauge } from '../../hud/VacuumGauge'
import { GOLD_BEATS } from './beats'
import { RestChip } from './RestChip'
import { gold } from './state'
import { STEP_STARTS } from './steps'

const c = content.gold

const readVacuum = () => gold.vacuum

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
        <RestChip />
      </ActCopy>
      <VacuumGauge read={readVacuum} showFrom={GOLD_BEATS.gaugeIn} showTo={GOLD_BEATS.gaugeOut} />
    </>
  )
}

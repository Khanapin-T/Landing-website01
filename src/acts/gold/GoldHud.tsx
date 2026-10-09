import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { StepList, revealStepList } from '../../hud/StepList'
import { GOLD_BEATS } from './beats'
import { RestChip } from './RestChip'
import { STEP_STARTS } from './steps'
import { VacuumGauge } from './VacuumGauge'

const c = content.gold

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
      <VacuumGauge />
    </>
  )
}

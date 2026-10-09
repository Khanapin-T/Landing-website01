import { MOLD_REST_SECONDS } from '../../config/mold'
import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { RestChip } from '../../hud/RestChip'
import { revealStepList } from '../../hud/StepList'
import { VacuumGauge } from '../../hud/VacuumGauge'
import { MOLD_BEATS } from './beats'
import { MoldSteps } from './MoldSteps'
import { mold } from './state'

const c = content.mold

/** The needle follows the boil: it drops while the air is pulled out of the investment and returns when it stops. */
const readVacuum = () => mold.boil
const readRest = () => mold.rest

/** Act 3 copy: heading, caption, step list (the list joins the column's reveal as a whole), and the vacuum gauge for the boil. */
export function MoldHud() {
  return (
    <>
      <ActCopy
        label={content.actNames.mold}
        heading={c.heading}
        caption={c.caption}
        copyIn={MOLD_BEATS.copyIn}
        copyOut={MOLD_BEATS.copyOut}
        extendReveal={revealStepList}
      >
        <MoldSteps />
        <RestChip read={readRest} seconds={MOLD_REST_SECONDS} showFrom={MOLD_BEATS.restFrom} showTo={MOLD_BEATS.copyOut} />
      </ActCopy>
      <VacuumGauge read={readVacuum} showFrom={MOLD_BEATS.gaugeIn} showTo={MOLD_BEATS.gaugeOut} />
    </>
  )
}

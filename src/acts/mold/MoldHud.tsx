import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { revealStepList } from '../../hud/StepList'
import { MOLD_BEATS } from './beats'
import { MoldSteps } from './MoldSteps'

const c = content.mold

/** Act 3 copy: heading, caption, step list (the list joins the column's reveal as a whole). */
export function MoldHud() {
  return (
    <ActCopy
      label={content.actNames.mold}
      heading={c.heading}
      caption={c.caption}
      copyIn={MOLD_BEATS.copyIn}
      copyOut={MOLD_BEATS.copyOut}
      extendReveal={revealStepList}
    >
      <MoldSteps />
    </ActCopy>
  )
}

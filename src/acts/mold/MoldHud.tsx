import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { MOLD_BEATS } from './beats'
import { MoldSteps } from './MoldSteps'

const c = content.mold

/** Act 3 copy: heading, caption, step list. */
export function MoldHud() {
  return (
    <ActCopy
      label={content.actNames.mold}
      heading={c.heading}
      caption={c.caption}
      copyIn={MOLD_BEATS.copyIn}
      copyOut={MOLD_BEATS.copyOut}
    >
      <MoldSteps />
    </ActCopy>
  )
}

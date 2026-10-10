import { useRef } from 'react'
import { content } from '../../content'
import { BIRTH_REST_SECONDS } from '../../config/birth'
import { ActCopy } from '../../hud/ActCopy'
import { RestChip } from '../../hud/RestChip'
import { StepList, revealStepList } from '../../hud/StepList'
import { BIRTH_BEATS } from './beats'
import { birth } from './state'
import { STEP_STARTS } from './steps'
import { useWipeClip } from './useWipeClip'

const c = content.birth
const readRest = () => birth.rest

/**
 * Act 7 copy: heading, caption, step list and the acid timer in the column. The wrapper covers the viewport and is
 * clipped by the finale line: everything right of the line is erased as it moves left (useWipeClip 'erase'), all of it
 * once the sweep starts.
 */
export function BirthHud() {
  const layer = useRef<HTMLDivElement>(null)
  useWipeClip(layer, 'erase')
  return (
    <div ref={layer} className="absolute inset-0">
      <ActCopy
        label={content.actNames.birth}
        heading={c.heading}
        caption={c.caption}
        copyIn={BIRTH_BEATS.copyIn}
        copyOut={BIRTH_BEATS.copyOut}
        extendReveal={revealStepList}
      >
        <StepList names={c.steps} starts={STEP_STARTS} />
        <RestChip read={readRest} seconds={BIRTH_REST_SECONDS} showFrom={BIRTH_BEATS.steps.acid} showTo={BIRTH_BEATS.copyOut} label={c.timer} />
      </ActCopy>
    </div>
  )
}

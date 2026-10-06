import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { MOLD_BEATS } from './beats'
import { MoldSteps } from './MoldSteps'

const c = content.mold

/**
 * The step list joins the column's reveal. It is revealed as a whole (the `<ul>`): MoldSteps' own tweens
 * target the items with overwrite, which would kill a reveal tween on them.
 */
function revealSteps(tl: gsap.core.Timeline, root: HTMLElement, reduce: boolean) {
  const list = root.querySelector('[data-steps]')
  if (!list) return
  if (reduce) tl.from(list, { autoAlpha: 0, duration: 0.2 }, 0)
  else tl.from(list, { autoAlpha: 0, y: 12, duration: 0.6, ease: 'power2.out' }, 0.45)
}

/** Act 3 copy: heading, caption, step list. */
export function MoldHud() {
  return (
    <ActCopy
      label={content.actNames.mold}
      heading={c.heading}
      caption={c.caption}
      copyIn={MOLD_BEATS.copyIn}
      copyOut={MOLD_BEATS.copyOut}
      extendReveal={revealSteps}
    >
      <MoldSteps />
    </ActCopy>
  )
}

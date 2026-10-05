import { Fragment } from 'react'
import { gsap } from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { IDEA_BEATS } from './beats'

gsap.registerPlugin(ScrambleTextPlugin)

const c = content.idea

/** Spec list reveal, added after the shared heading and caption steps. */
function revealSpecs(tl: gsap.core.Timeline, root: HTMLElement, reduce: boolean) {
  const labels = Array.from(root.querySelectorAll('[data-label]'))
  const values = Array.from(root.querySelectorAll('[data-value]'))
  if (reduce) {
    tl.from([...labels, ...values], { autoAlpha: 0, duration: 0.2 }, 0)
    return
  }
  tl.from(labels, { autoAlpha: 0, duration: 0.3, stagger: 0.06 }, 0.4).from(values, { autoAlpha: 0, duration: 0.01, stagger: 0.07 }, 0.4)
  // Explicit text, not '{original}': the plugin reads innerHTML, where "<" is "&lt;" and the value got cut.
  values.forEach((v, i) =>
    tl.to(v, { scrambleText: { text: c.specs[i].value, chars: '0123456789.', speed: 0.5 }, duration: 0.9 }, 0.4 + i * 0.07),
  )
}

/** Act 1 copy: heading, caption, spec list. */
export function IdeaHud() {
  return (
    <ActCopy
      label={content.actNames.idea}
      heading={c.heading}
      caption={c.caption}
      copyIn={IDEA_BEATS.copyIn}
      copyOut={IDEA_BEATS.copyOut}
      extendReveal={revealSpecs}
    >
      <dl className="mt-10 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 font-mono text-[12px] uppercase tracking-[0.12em]">
        {c.specs.map((s) => (
          <Fragment key={s.label}>
            <dt data-label className="text-mute">
              {s.label}
            </dt>
            <dd data-value className="m-0 text-line">
              {s.value}
            </dd>
          </Fragment>
        ))}
      </dl>
    </ActCopy>
  )
}

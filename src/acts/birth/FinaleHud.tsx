import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { BIRTH_BEATS } from './beats'

const f = content.finale

/** The links join the column's reveal as a whole, like the step list: hidden until the block comes in. */
function revealLinks(tl: gsap.core.Timeline, root: HTMLElement, reduce: boolean) {
  const list = root.querySelector('[data-links]')
  if (!list) return
  if (reduce) tl.from(list, { autoAlpha: 0, duration: 0.2 }, 0)
  else tl.from(list, { autoAlpha: 0, y: 12, duration: 0.6, ease: 'power2.out' }, 0.45)
}

/** The final block: name, promo line and contact links (placeholders until the author writes them last). */
export function FinaleHud() {
  return (
    <ActCopy label={f.name} heading={f.name} caption={f.promo} copyIn={BIRTH_BEATS.finaleIn} copyOut={20} extendReveal={revealLinks}>
      <ul data-links className="mt-8 flex gap-6 font-mono text-sm uppercase tracking-[0.12em]">
        {f.links.map((l) => (
          <li key={l.label}>
            <a className="pointer-events-auto text-line underline-offset-4 hover:underline focus-visible:underline" href={l.href}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </ActCopy>
  )
}

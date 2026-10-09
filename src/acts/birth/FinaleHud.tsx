import { content } from '../../content'
import { ActCopy } from '../../hud/ActCopy'
import { BIRTH_BEATS } from './beats'

const f = content.finale

/** The final block: name, promo line and contact links (placeholders until the author writes them last). */
export function FinaleHud() {
  return (
    <ActCopy label={f.name} heading={f.name} caption={f.promo} copyIn={BIRTH_BEATS.finaleIn} copyOut={20}>
      <ul className="mt-8 flex gap-6 font-mono text-sm uppercase tracking-[0.12em]">
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

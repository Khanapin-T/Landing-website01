import { useLayoutEffect, useRef } from 'react'
import { content } from '../../content'
import { registerWipeLayer, useWipeClip } from './useWipeClip'

const f = content.finale

/**
 * The final block: name, promo line and the contact links (WhatsApp, email, Instagram). Same column
 * markup and type as ActCopy, but no timed reveal: the sweeping line reveals it (useWipeClip 'reveal': visible only
 * left of the line, each link hidden until the line has passed it). The copy scrim is pushed out with the sweep too,
 * so the page left of the line is pure black.
 */
export function FinaleHud() {
  const layer = useRef<HTMLDivElement>(null)
  useWipeClip(layer, 'reveal')
  useLayoutEffect(() => {
    const scrim = document.querySelector<HTMLElement>('[data-scrim]')
    return scrim ? registerWipeLayer(scrim, 'scrim') : undefined
  }, [])

  return (
    <div ref={layer} className="absolute inset-0">
      <section aria-label={f.name} className="pointer-events-none absolute inset-y-0 left-[7vw] flex w-[min(32vw,480px)] items-center">
        <div>
          <h2 className="text-[clamp(40px,4vw,68px)] font-semibold leading-[0.98] tracking-[-0.01em] text-line" style={{ fontStretch: '125%' }}>
            {f.name}
          </h2>
          <p className="mt-6 max-w-[38ch] text-[17px] leading-relaxed text-line/80">{f.made}</p>
          <p className="mt-4 max-w-[38ch] text-[17px] leading-relaxed text-line/80">{f.promo}</p>
          <ul data-links className="mt-8 flex flex-col gap-3 font-mono text-sm tracking-[0.04em]">
            {f.links.map((l) => (
              <li key={l.label}>
                <a
                  className="pointer-events-auto text-line underline-offset-4 hover:underline focus-visible:underline"
                  href={l.href}
                  {...(l.href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <span className="mr-3 inline-block w-[7.5em] uppercase tracking-[0.12em] text-line/60">{l.label}</span>
                  {l.value}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

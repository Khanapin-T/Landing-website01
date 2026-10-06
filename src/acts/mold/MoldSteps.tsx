import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { content } from '../../content'
import { addCue } from '../../story/cues'
import { story } from '../../story/store'
import { STEP_STARTS, stepAt } from './steps'

gsap.registerPlugin(useGSAP)

const steps = content.mold.steps

/**
 * Process step list of Act 3, in the Act 1 spec-list style. State-based on cues (like the printer chip):
 * `sync()` derives the current step from the scroll position, so a chapter jump lands in the right state.
 * Lives inside Act 3's ActCopy, so the column's fade-out hides it too.
 */
export function MoldSteps() {
  const list = useRef<HTMLUListElement>(null)

  useGSAP(
    (_context, contextSafe) => {
      const items = Array.from(list.current!.querySelectorAll<HTMLElement>('[data-step]'))
      const ticks = items.map((li) => li.querySelector<HTMLElement>('[data-tick]')!)
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const css = getComputedStyle(list.current!)
      const lineColor = css.getPropertyValue('--color-line').trim() || '#dbe6f2'
      const muteColor = css.getPropertyValue('--color-mute').trim() || '#8aa0b8'

      let current = -2 // forces the first sync to write the initial state
      const apply = (i: number, on: boolean, instant: boolean) => {
        const li = items[i]
        const tick = ticks[i]
        const color = on ? lineColor : muteColor
        const scaleX = on ? 1 : 0
        if (instant || reduce) {
          gsap.set(li, { color, overwrite: true })
          gsap.set(tick, { scaleX, transformOrigin: 'left center', overwrite: true })
        } else {
          gsap.to(li, { color, duration: 0.25, overwrite: true })
          gsap.to(tick, { scaleX, duration: 0.35, ease: 'power2.out', overwrite: true })
        }
        if (on) li.setAttribute('aria-current', 'step')
        else li.removeAttribute('aria-current')
      }

      const sync = contextSafe!(() => {
        const next = stepAt(story.screen)
        if (next === current) return
        // Only a move to a neighbouring step animates; the first write and any jump set the final state.
        const instant = current === -2 || Math.abs(next - current) > 1
        for (let i = 0; i < items.length; i++) {
          const was = i === current
          const now = i === next
          if (was !== now || current === -2) apply(i, now, instant)
        }
        current = next
      })

      sync()
      const offs = STEP_STARTS.map((at) => addCue({ at, enter: sync, leaveBack: sync }))

      return () => {
        offs.forEach((off) => off())
        gsap.killTweensOf([...items, ...ticks])
        gsap.set([...items, ...ticks], { clearProps: 'color,transform' })
        items.forEach((li) => li.removeAttribute('aria-current'))
      }
    },
    { scope: list },
  )

  return (
    <ul className="m-0 mt-10 list-none space-y-2 p-0 font-mono text-[12px] uppercase tracking-[0.12em]">
      {steps.map((name) => (
        <li key={name} data-step className="flex items-center gap-3 text-mute">
          <span data-tick aria-hidden="true" className="h-px w-5 origin-left bg-line" />
          {name}
        </li>
      ))}
    </ul>
  )
}

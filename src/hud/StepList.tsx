import { useRef } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { addCue } from '../story/cues'
import { story } from '../story/store'
import { stepIndex } from './stepIndex'

gsap.registerPlugin(useGSAP)

/** Joins the column's reveal as a whole (the `<ul>`): the item tweens below use overwrite and would kill a reveal tween on them. */
export function revealStepList(tl: gsap.core.Timeline, root: HTMLElement, reduce: boolean) {
  const list = root.querySelector('[data-steps]')
  if (!list) return
  if (reduce) tl.from(list, { autoAlpha: 0, duration: 0.2 }, 0)
  else tl.from(list, { autoAlpha: 0, y: 12, duration: 0.6, ease: 'power2.out' }, 0.45)
}

/**
 * Process step list of an act, in the Act 1 spec-list style. State-based on cues (like the printer chip): `sync()`
 * derives the current step from the scroll position, so a chapter jump lands in the right state. Lives inside the
 * act's ActCopy, so the column's fade-out hides it too.
 */
export function StepList({ names, starts }: { names: readonly string[]; starts: readonly number[] }) {
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
        const next = stepIndex(starts, story.screen)
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
      const offs = starts.map((at) => addCue({ at, enter: sync, leaveBack: sync }))

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
    <ul ref={list} data-steps className="m-0 mt-10 list-none space-y-2 p-0 font-mono text-[12px] uppercase tracking-[0.12em]">
      {names.map((name) => (
        <li key={name} data-step className="flex items-center gap-3 text-mute">
          <span data-tick aria-hidden="true" className="h-px w-5 origin-left bg-line" />
          {name}
        </li>
      ))}
    </ul>
  )
}

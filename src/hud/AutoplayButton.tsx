import { useEffect, useRef } from 'react'
import { content } from '../content'
import { useAppState } from '../story/appState'
import { setAutoplay, useAutoplay } from '../story/autoplay'
import { addCue } from '../story/cues'

/** The hint belongs to the first screen: it leaves once the scroll is past the start of the intro. */
const HINT_UNTIL = 0.3

/**
 * Play/Pause for the self-scrolling story, bottom right, with a one-line hint beside it on the first screen. Hidden
 * under the loader. While playing the button sits back at low opacity so it does not draw the eye; hover or keyboard
 * focus brings it forward. Re-renders only on a toggle, never on scroll (the hint is hidden by a cue via a data attribute).
 */
export function AutoplayButton() {
  const { phase } = useAppState()
  const playing = useAutoplay()
  const hint = useRef<HTMLSpanElement>(null)
  const ready = phase === 'ready'

  useEffect(() => {
    if (!ready) return
    const el = hint.current!
    const away = () => el.setAttribute('data-away', '')
    const back = () => el.removeAttribute('data-away')
    return addCue({ at: HINT_UNTIL, enter: away, leaveBack: back })
  }, [ready])

  if (!ready) return null

  const label = playing ? content.autoplay.pause : content.autoplay.play
  return (
    <div className="fixed bottom-[4vh] right-[3vw] z-20 flex items-center gap-4">
      <span
        ref={hint}
        className={`pointer-events-none font-mono text-[11px] uppercase tracking-[0.14em] text-mute transition-opacity duration-500 data-[away]:opacity-0 ${playing ? 'opacity-0' : 'opacity-100'}`}
      >
        {content.autoplay.hint}
      </span>
      <button
        type="button"
        data-autoplay
        aria-pressed={playing}
        onClick={() => setAutoplay(!playing)}
        className={`inline-flex cursor-pointer items-center gap-3 rounded-full border border-line/25 bg-ink/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-line backdrop-blur-sm transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-line ${playing ? 'opacity-40' : 'opacity-90'}`}
      >
        <svg aria-hidden="true" viewBox="0 0 10 10" className="size-2.5 shrink-0 fill-gold">
          {playing ? (
            <>
              <rect x="1" y="0.5" width="3" height="9" />
              <rect x="6" y="0.5" width="3" height="9" />
            </>
          ) : (
            <path d="M1.5 0.5 9 5 1.5 9.5z" />
          )}
        </svg>
        <span>{label}</span>
      </button>
    </div>
  )
}

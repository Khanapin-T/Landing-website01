import { actWindows } from '../config/acts'
import { content } from '../content'
import { useAppState } from '../story/appState'
import { scrollToScreen } from '../story/scrollControl'
import { useCurrentAct } from '../story/store'

const CHAPTERS = actWindows().filter((w) => w.id !== 'intro')

/** Right-edge chapter scale: one tick per act, clickable and keyboard reachable. */
export function ActScale() {
  const current = useCurrentAct()
  const { phase } = useAppState()

  return (
    <nav
      aria-label={content.scale.label}
      inert={phase !== 'ready'}
      className={`fixed right-6 top-1/2 z-20 -translate-y-1/2 transition-opacity duration-700 motion-reduce:transition-none ${phase === 'ready' ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <ul className="flex flex-col items-end gap-4">
        {CHAPTERS.map((w) => {
          const active = w.id === current
          const name = content.actNames[w.id]
          return (
            <li key={w.id}>
              <button
                type="button"
                aria-label={content.scale.goTo(name)}
                aria-current={active ? 'step' : undefined}
                onClick={() => scrollToScreen(w.entry)}
                className="group flex items-center gap-3 py-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-line"
              >
                <span
                  className={`font-mono text-[11px] text-line transition-opacity duration-300 motion-reduce:transition-none ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70'}`}
                >
                  {name}
                </span>
                <span className={`block h-px bg-line transition-all duration-300 motion-reduce:transition-none ${active ? 'w-8 opacity-100' : 'w-4 opacity-40 group-hover:opacity-80'}`} />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

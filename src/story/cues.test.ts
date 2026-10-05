import { beforeEach, describe, expect, it } from 'vitest'
import { addCue, resetCues, updateCues } from './cues'

function recorder() {
  const log: string[] = []
  const cue = (name: string, at: number) => ({ at, enter: () => log.push(`${name}+`), leaveBack: () => log.push(`${name}-`) })
  return { log, cue }
}

describe('cues', () => {
  beforeEach(() => resetCues(0))

  it('fires enter when the scroll passes the cue going down', () => {
    const { log, cue } = recorder()
    addCue(cue('a', 1))
    updateCues(0.5)
    expect(log).toEqual([])
    updateCues(1)
    expect(log).toEqual(['a+'])
    updateCues(1.5)
    expect(log).toEqual(['a+'])
  })

  it('fires leaveBack when the scroll goes back above the cue', () => {
    const { log, cue } = recorder()
    addCue(cue('a', 1))
    updateCues(2)
    updateCues(0.9)
    expect(log).toEqual(['a+', 'a-'])
  })

  it('fires every crossed cue in scroll order on a jump, both directions', () => {
    const { log, cue } = recorder()
    addCue(cue('c', 3))
    addCue(cue('a', 1))
    addCue(cue('b', 2))
    updateCues(5)
    expect(log).toEqual(['a+', 'b+', 'c+'])
    log.length = 0
    updateCues(0)
    expect(log).toEqual(['c-', 'b-', 'a-'])
  })

  it('enters a cue immediately when registered below the current position', () => {
    const { log, cue } = recorder()
    updateCues(2)
    addCue(cue('a', 1))
    expect(log).toEqual(['a+'])
  })

  it('a disposed cue never fires (StrictMode double mount)', () => {
    const { log, cue } = recorder()
    const off = addCue(cue('a', 1))
    off()
    addCue(cue('b', 1))
    updateCues(2)
    expect(log).toEqual(['b+'])
  })
})

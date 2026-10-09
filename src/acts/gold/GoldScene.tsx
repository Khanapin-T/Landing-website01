import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getAppState } from '../../story/appState'
import { master, syncMaster } from '../../story/master'
import { story } from '../../story/store'
import { shouldRender } from '../../story/visibility'
import { GOLD_BEATS } from './beats'
import { GoldFill } from './GoldFill'
import { GoldStream } from './GoldStream'
import { registerGold } from './timeline'
import { VacuumChamber } from './VacuumChamber'

/**
 * Act 5: the solid gold fill and the molten stream inside the act's window; the vacuum chamber outside it (it stays on). The flask itself, its X-ray shell and the
 * cavity outline live in MoldScene (the flask owner) and follow story.flask; the gauge and the rest chip are DOM (GoldHud).
 */
export function GoldScene() {
  useLayoutEffect(() => {
    const off = registerGold(master)
    syncMaster()
    return off
  }, [])

  const root = useRef<Group>(null)
  useFrame(() => {
    if (root.current) {
      root.current.visible = shouldRender(getAppState().phase, story.screen, GOLD_BEATS.windowFrom, GOLD_BEATS.windowTo)
    }
  })

  return (
    <>
      {/* The vacuum rig stays on the flask after the act's window: act 6 takes it off (gold.chamber -> 0). */}
      <VacuumChamber />
      <group ref={root}>
        <GoldFill />
        <GoldStream />
      </group>
    </>
  )
}

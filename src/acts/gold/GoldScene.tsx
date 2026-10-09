import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getAppState } from '../../story/appState'
import { master, syncMaster } from '../../story/master'
import { story } from '../../story/store'
import { shouldRender } from '../../story/visibility'
import { GOLD_BEATS } from './beats'
import { GoldFill } from './GoldFill'
import { PourCloud } from './PourCloud'
import { registerGold } from './timeline'

/**
 * Act 5: the solid gold fill and the pour particles inside the act's window. The flask itself, its X-ray shell and the
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
    <group ref={root}>
      <GoldFill />
      <PourCloud />
    </group>
  )
}

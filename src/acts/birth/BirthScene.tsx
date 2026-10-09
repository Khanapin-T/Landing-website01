import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getAppState } from '../../story/appState'
import { master, syncMaster } from '../../story/master'
import { story } from '../../story/store'
import { shouldRender } from '../../story/visibility'
import { BIRTH_BEATS } from './beats'
import { BirthTree } from './BirthTree'
import { CutRings } from './CutRings'
import { Jar } from './Jar'
import { PolishLine } from './PolishLine'
import { PolishRing } from './PolishRing'
import { registerBirth } from './timeline'

/**
 * Act 7: the empty tree, the cut rings, the acid jar, the hero ring with its polish and reflection, the neon line.
 * The copy column, the acid timer and the final block are DOM (BirthHud, FinaleHud).
 */
export function BirthScene() {
  useLayoutEffect(() => {
    const off = registerBirth(master)
    syncMaster()
    return off
  }, [])

  const root = useRef<Group>(null)
  useFrame(() => {
    if (root.current) root.current.visible = shouldRender(getAppState().phase, story.screen, BIRTH_BEATS.windowFrom, BIRTH_BEATS.windowTo)
  })

  return (
    <group ref={root}>
      <BirthTree />
      <CutRings />
      <PolishRing />
      <Jar />
      <PolishLine />
    </group>
  )
}

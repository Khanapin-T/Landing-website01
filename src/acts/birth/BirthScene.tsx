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
import { Curtain } from './Curtain'
import { FinaleLights } from './FinaleLights'
import { Jar } from './Jar'
import { PolishLine } from './PolishLine'
import { PolishRing } from './PolishRing'
import { Table } from './Table'
import { Vessels } from './Vessels'
import { WipeLine } from './WipeLine'
import { registerBirth } from './timeline'

/**
 * Act 7: the empty tree, the cut rings, the acid jar, the hero ring with its polish and reflection, the neon line, and
 * the finale wipe (WipeLine, the black Curtain behind it, the final lights). The copy column, the acid timer and the
 * final block are DOM (BirthHud, FinaleHud), clipped by the wipe.
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
    <>
      <group ref={root}>
        <Curtain />
        <BirthTree />
        <CutRings />
        <PolishRing />
        <Table />
        <Vessels />
        <Jar />
        {/* WipeLine before PolishLine: it writes wipeView, which the line label reads in the same frame. */}
        <WipeLine />
        <PolishLine />
      </group>
      {/* Outside the toggled group: the light count must never change. */}
      <FinaleLights />
    </>
  )
}

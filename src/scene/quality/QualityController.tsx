import { PerformanceMonitor } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { QUALITY_STEPS, effectiveDpr, initialStep, stepDown, stepUp } from './quality'
import { getQualityIndex, setQualityIndex } from './qualityStore'

/** Steps quality down when fps falls below 45 and back up (never above the device floor) when it recovers. */
export function QualityController() {
  const setDpr = useThree((s) => s.setDpr)

  const apply = (i: number) => {
    setQualityIndex(i)
    setDpr(effectiveDpr(QUALITY_STEPS[i], window.devicePixelRatio))
  }

  return (
    <PerformanceMonitor
      bounds={() => [45, 58]}
      flipflops={4}
      onDecline={() => apply(stepDown(getQualityIndex()))}
      onIncline={() => apply(stepUp(getQualityIndex(), initialStep(window.devicePixelRatio)))}
    />
  )
}

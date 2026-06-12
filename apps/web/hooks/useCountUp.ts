'use client'

import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!start) return
    const startTime = performance.now()

    function easeOutCubic(t: number) {
      return 1 - Math.pow(1 - t, 3)
    }

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.round(easeOutCubic(progress) * target))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration, start])

  return count
}

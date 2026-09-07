import { useEffect } from 'react'
import Lenis from 'lenis'
import { STAGES } from '../data/profile'
import { scroll, useStore } from '../store/useStore'

let lenisInstance: Lenis | null = null

/** Programmatic navigation for the stage rail. */
export function scrollToStage(index: number) {
  const clamped = Math.max(0, Math.min(STAGES.length - 1, index))
  const max = document.documentElement.scrollHeight - window.innerHeight
  const target = (clamped / (STAGES.length - 1)) * max
  if (lenisInstance) lenisInstance.scrollTo(target, { duration: 1.4 })
  else window.scrollTo({ top: target, behavior: 'smooth' })
}

/**
 * Owns smooth scrolling and turns document scroll into the single normalised
 * value everything else reads. Scroll stays locked until the visitor has
 * submitted a prompt, so the opening frame is a deliberate choice, not a
 * thing you fall past.
 */
export function useScrollDriver() {
  const entered = useStore((s) => s.entered)
  const plainMode = useStore((s) => s.plainMode)
  const reducedMotion = useStore((s) => s.reducedMotion)

  useEffect(() => {
    const lenis = new Lenis({
      duration: reducedMotion ? 0.1 : 1.15,
      // gentle exponential ease-out; feels like inertia without the sea-sickness
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
      syncTouch: false,
    })
    lenisInstance = lenis

    const setStageIndex = useStore.getState().setStageIndex
    const lastStage = { value: -1 }

    const onScroll = ({ scroll: y, velocity }: { scroll: number; velocity: number }) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0
      scroll.progress = progress
      scroll.velocity = velocity
      scroll.stageFloat = progress * (STAGES.length - 1)

      // Swap the copy a little after the halfway point, not exactly on it, so
      // the new panel arrives while its shape is already resolving rather than
      // while the cloud is still smoke.
      const active = Math.floor(scroll.stageFloat + 0.32)
      if (active !== lastStage.value) {
        lastStage.value = active
        setStageIndex(active)
      }
    }

    lenis.on('scroll', onScroll)

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      lenisInstance = null
    }
  }, [reducedMotion])

  // Gate the journey behind the prompt — but never lock the plain document,
  // which is the escape hatch and has to scroll like any other page.
  useEffect(() => {
    const lenis = lenisInstance
    if (!lenis) return
    if (entered || plainMode) {
      lenis.start()
      document.body.classList.remove('is-locked')
    } else {
      lenis.scrollTo(0, { immediate: true })
      lenis.stop()
      document.body.classList.add('is-locked')
    }
  }, [entered, plainMode])

  // Pointer position and speed, sampled passively. Speed is what makes the
  // force field feel alive — a still cursor should not be shoving the cloud
  // around, but a fast one should tear a hole in it.
  useEffect(() => {
    let lastX = 0
    let lastY = 0
    let lastT = 0

    const onPointer = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = (e.clientY / window.innerHeight) * 2 - 1
      const now = performance.now()

      if (scroll.pointerActive) {
        const dt = Math.max(now - lastT, 8) / 1000
        const speed = Math.hypot(x - lastX, y - lastY) / dt
        // rise fast, so a flick registers on the very next frame
        scroll.pointerSpeed = Math.max(scroll.pointerSpeed, Math.min(speed, 12))
      }

      scroll.pointerX = x
      scroll.pointerY = y
      scroll.pointerActive = true
      lastX = x
      lastY = y
      lastT = now
    }

    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => window.removeEventListener('pointermove', onPointer)
  }, [])
}

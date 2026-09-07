import { useEffect, useState } from 'react'

/**
 * Types text out at a variable rate, the way a token stream actually lands —
 * a fixed interval reads as a 90s screensaver, not as inference.
 */
export function useTypewriter(text: string, active: boolean, cps = 95) {
  const [shown, setShown] = useState('')

  useEffect(() => {
    if (!active) {
      setShown('')
      return
    }

    let index = 0
    let timer: number

    const step = () => {
      // land 1–4 characters at a time, pausing a little longer after punctuation
      const burst = 1 + Math.floor(Math.random() * 3)
      index = Math.min(text.length, index + burst)
      setShown(text.slice(0, index))
      if (index >= text.length) return

      // Keep the jitter small: it reads as texture, but it is added per step
      // rather than per character, so a large value quietly halves the rate.
      const justTyped = text[index - 1]
      const pause = /[.,;:—]/.test(justTyped) ? 130 : 0
      timer = window.setTimeout(step, (1000 / cps) * burst + pause + Math.random() * 14)
    }

    timer = window.setTimeout(step, 380)
    return () => window.clearTimeout(timer)
  }, [text, active, cps])

  return { shown, done: shown.length >= text.length }
}

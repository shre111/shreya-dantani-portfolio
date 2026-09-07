import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { SHAPE_IDS } from '../lib/shapes'

const LINES = [
  'allocating vector space',
  'building shape atlas',
  'indexing token chips',
  'resolving identity vector',
  'loading retrieval corpus',
  'wiring agent graph',
  'replaying evaluations',
  'projecting globe',
  'warming output head',
]

/**
 * The atlas build takes a beat on first load. Rather than hide it, show it —
 * a portfolio about AI systems may as well admit it is booting one.
 */
export function Boot() {
  const bootProgress = useStore((s) => s.bootProgress)
  const ready = useStore((s) => s.ready)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setHidden(true), 800)
    return () => clearTimeout(t)
  }, [ready])

  if (hidden) return null

  const step = Math.min(LINES.length - 1, Math.round(bootProgress * SHAPE_IDS.length))

  return (
    <div className={`boot${ready ? ' is-done' : ''}`} aria-hidden="true">
      <div>{LINES[step]}…</div>
      <div className="boot-bar">
        <i style={{ transform: `scaleX(${ready ? 1 : bootProgress})` }} />
      </div>
      <div style={{ opacity: 0.5 }}>
        {Math.round((ready ? 1 : bootProgress) * 100)}% · {SHAPE_IDS.length} shapes
      </div>
    </div>
  )
}

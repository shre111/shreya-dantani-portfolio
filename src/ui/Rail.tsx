import { STAGES, STAGE_LABELS } from '../data/profile'
import { scrollToStage } from '../lib/useScrollDriver'
import { useStore } from '../store/useStore'

/** Stage nav. Doubles as a progress readout for the pipeline metaphor. */
export function Rail() {
  const stageIndex = useStore((s) => s.stageIndex)
  const entered = useStore((s) => s.entered)

  if (!entered) return null

  return (
    <nav className="rail" aria-label="Pipeline stages">
      {STAGES.map((stage, i) => (
        <button
          key={stage}
          type="button"
          className={`rail-item${i === stageIndex ? ' is-active' : ''}`}
          aria-current={i === stageIndex ? 'step' : undefined}
          onClick={() => scrollToStage(i)}
        >
          <i>
            {String(i).padStart(2, '0')} {STAGE_LABELS[stage]}
          </i>
        </button>
      ))}
    </nav>
  )
}

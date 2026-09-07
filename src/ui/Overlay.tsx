import { useEffect, useRef } from 'react'
import { STAGES } from '../data/profile'
import { sfx } from '../lib/audio'
import { useStore } from '../store/useStore'
import {
  AgentsPanel,
  EvaluatePanel,
  DeployPanel,
  EmbedPanel,
  GeneratePanel,
  RetrievePanel,
  TokenizePanel,
} from './Panels'
import { PromptGate } from './PromptGate'

const PANELS = [
  PromptGate,
  TokenizePanel,
  EmbedPanel,
  RetrievePanel,
  AgentsPanel,
  EvaluatePanel,
  DeployPanel,
  GeneratePanel,
]

/** Stages whose copy fills the frame and so need a full-bleed scrim. */
const WIDE = new Set([3, 4, 5, 6])
/** The opening frame is the one stage where the cloud outranks the copy. */
const HERO = new Set([0])

/** Roughly how many cards each stage animates in, for the arrival cue. */
const CARD_COUNT = [0, 0, 4, 3, 4, 3, 9, 4]

function scrimClass(i: number) {
  if (WIDE.has(i)) return ' panel--wide'
  if (HERO.has(i)) return ' panel--hero'
  return ''
}

/**
 * All eight panels stay mounted and cross-fade. Mounting is cheap, the text is
 * always in the DOM for crawlers and screen readers, and nothing has to
 * re-measure mid-transition.
 */
export function Overlay() {
  const stageIndex = useStore((s) => s.stageIndex)
  const entered = useStore((s) => s.entered)
  const ready = useStore((s) => s.ready)
  const lastCued = useRef(-1)

  // Arriving at a stage: one low swell, then a tick per card as the panel
  // builds itself. Skipped on the very first stage, which the submit cue owns.
  useEffect(() => {
    if (!entered || stageIndex === lastCued.current) return
    lastCued.current = stageIndex
    sfx.stage(stageIndex)
    sfx.cards(CARD_COUNT[stageIndex] ?? 0)
  }, [stageIndex, entered])

  return (
    <div className="overlay">
      {PANELS.map((Panel, i) => {
        // Before a prompt is submitted only the gate exists. Afterwards the
        // stage index rules — including stage 0, which returns you to the gate
        // so you can ask something else and take the journey again.
        const active = entered ? i === stageIndex : i === 0 && ready
        return (
          <section
            key={STAGES[i]}
            id={`stage-${STAGES[i]}`}
            className={`panel${scrimClass(i)}${active ? ' is-active' : ''}`}
            aria-hidden={!active}
          >
            <Panel />
          </section>
        )
      })}
    </div>
  )
}

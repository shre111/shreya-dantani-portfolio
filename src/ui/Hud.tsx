import { useState } from 'react'
import { identity, STAGE_LABELS, STAGES } from '../data/profile'
import { sfx } from '../lib/audio'
import { useStore } from '../store/useStore'

/** Persistent chrome: who this is, what stage you are in, and the way out. */
export function Hud() {
  const entered = useStore((s) => s.entered)
  const stageIndex = useStore((s) => s.stageIndex)
  const prompt = useStore((s) => s.prompt)
  const setPlainMode = useStore((s) => s.setPlainMode)
  const [sound, setSound] = useState(sfx.enabled)

  const toggleSound = () => {
    const next = !sound
    sfx.setEnabled(next)
    setSound(next)
    if (next) sfx.open()
  }

  return (
    <>
      <div className="hud hud--tl">
        <span className="hud-dot" aria-hidden="true" />
        <span>{identity.name}</span>
        {entered && (
          <span style={{ color: 'var(--accent)' }}>
            / {String(stageIndex).padStart(2, '0')} {STAGE_LABELS[STAGES[stageIndex]]}
          </span>
        )}
      </div>

      <div className="hud hud--tr">
        <button
          type="button"
          className={`hud-btn hud-btn--icon${sound ? ' is-on' : ''}`}
          onClick={toggleSound}
          aria-pressed={sound}
          title={sound ? 'Mute sound' : 'Unmute sound'}
        >
          <span className="eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {sound ? 'Sound on' : 'Muted'}
        </button>
        <button type="button" className="hud-btn" onClick={() => setPlainMode(true)}>
          Read as document
        </button>
      </div>

      {entered && prompt && (
        <div className="hud hud--bl">
          <div className="hud-prompt">
            <b>Prompt</b>
            {prompt}
          </div>
        </div>
      )}
    </>
  )
}

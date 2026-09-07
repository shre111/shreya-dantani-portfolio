import { useEffect, useRef, useState, type FormEvent } from 'react'
import { identity } from '../data/profile'
import { DEFAULT_PROMPTS } from '../lib/tokenize'
import { sfx } from '../lib/audio'
import { scrollToStage } from '../lib/useScrollDriver'
import { useStore } from '../store/useStore'

/**
 * The opening frame. Nothing scrolls until a prompt is submitted — the whole
 * journey downstream is framed as the answer to whatever the visitor typed.
 */
export function PromptGate() {
  const submitPrompt = useStore((s) => s.submitPrompt)
  const ready = useStore((s) => s.ready)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ready) inputRef.current?.focus({ preventScroll: true })
  }, [ready])

  const send = (text: string) => {
    // Browsers will not start audio without a gesture; this is the first one.
    sfx.unlock()
    sfx.submit()
    submitPrompt(text)
    // Hand the visitor straight into the first stage. Deferred by a frame so
    // the effect that unlocks Lenis has run before we ask it to scroll.
    requestAnimationFrame(() => scrollToStage(1))
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(value.trim() || DEFAULT_PROMPTS[0])
  }

  return (
    <div className="gate">
      <div>
        <p className="gate-role">
          {identity.title} · <b>AI &amp; LLM Systems</b>
        </p>
        <h1 className="gate-name">
          Shreya
          <br />
          <em>Dantani</em>
        </h1>
      </div>

      <form className="gate-form" onSubmit={onSubmit}>
        <label className="gate-label" htmlFor="prompt">
          Ask something. Your prompt is the journey.
        </label>
        <div className="gate-input-wrap">
          <input
            id="prompt"
            ref={inputRef}
            className="gate-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="What do you want to know about Shreya?"
            autoComplete="off"
            spellCheck={false}
            maxLength={220}
          />
          <button className="btn" type="submit">
            Run inference
          </button>
        </div>

        <div className="gate-suggestions">
          {DEFAULT_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              className="suggestion"
              onClick={() => send(p)}
              onPointerEnter={() => sfx.tick()}
            >
              {p}
            </button>
          ))}
        </div>
      </form>

      <div className="gate-meta">
        <span>{identity.yearsExperience} years experience</span>
        <span>{identity.location}</span>
        <span>Open to senior AI / full-stack roles</span>
      </div>
    </div>
  )
}

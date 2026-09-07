import { useEffect, useState } from 'react'
import { STAGES } from './data/profile'
import { supportsWebGL } from './lib/quality'
import { useScrollDriver } from './lib/useScrollDriver'
import { Scene } from './scene/Scene'
import { useStore } from './store/useStore'
import { Boot } from './ui/Boot'
import { Hud } from './ui/Hud'
import { Overlay } from './ui/Overlay'
import { PlainDocument } from './ui/PlainDocument'
import { Rail } from './ui/Rail'

export default function App() {
  const plainMode = useStore((s) => s.plainMode)
  const setPlainMode = useStore((s) => s.setPlainMode)
  const entered = useStore((s) => s.entered)
  const ready = useStore((s) => s.ready)
  const [webgl] = useState(supportsWebGL)

  useScrollDriver()

  // The document is a fresh read, not a continuation — start it at the top
  // rather than wherever the journey happened to be.
  useEffect(() => {
    if (plainMode) window.scrollTo({ top: 0, behavior: 'auto' })
  }, [plainMode])

  // Escape hatch that does not need a mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlainMode(!useStore.getState().plainMode)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPlainMode])

  if (!webgl) return <PlainDocument escapable={false} />

  return (
    <>
      <button
        type="button"
        className="skip-link"
        onClick={() => setPlainMode(true)}
      >
        Skip the experience — read as a document
      </button>

      {plainMode ? (
        <PlainDocument />
      ) : (
        <>
          <Scene />
          {/* Gives the document the scroll distance the stage axis is mapped onto. */}
          <div
            className="spacer"
            aria-hidden="true"
            style={{ height: `${STAGES.length * 118}vh` }}
          />
          <Overlay />
          <Rail />
          <Hud />
          <Boot />
          {ready && !entered && (
            <div className="scroll-hint" aria-hidden="true">
              <span />
              Enter a prompt to begin
            </div>
          )}
        </>
      )}
    </>
  )
}

import { create } from 'zustand'
import { STAGES, type Stage } from '../data/profile'
import { detectQuality, prefersReducedMotion, type QualityProfile } from '../lib/quality'
import { tokenize, type Token } from '../lib/tokenize'

/**
 * Per-frame values live here, NOT in React state. Scroll fires far more often
 * than we ever want to re-render, so the 3D scene reads this object directly
 * inside useFrame and only the discrete stage index is pushed into the store.
 */
export const scroll = {
  /** 0..1 across the whole document. */
  progress: 0,
  /** Smoothed progress, driven in the render loop. */
  eased: 0,
  velocity: 0,
  /** Index into STAGES, fractional (3.4 = 40% of the way from stage 3 to 4). */
  stageFloat: 0,
  /** Normalised pointer position, -1..1. */
  pointerX: 0,
  pointerY: 0,
  /** Pointer speed in normalised units per second, decayed each frame. */
  pointerSpeed: 0,
  /** False until the pointer has actually moved, so the field starts at rest. */
  pointerActive: false,
  /** 0 at rest on a stage, 1 at the midpoint of a transition. */
  transit: 0,
}

type State = {
  quality: QualityProfile
  reducedMotion: boolean
  /** 3D mode off — either unsupported, or the visitor opted out. */
  plainMode: boolean

  /** Shape atlas build progress, 0..1. */
  bootProgress: number
  ready: boolean

  /** The visitor has submitted a prompt and the journey has begun. */
  entered: boolean
  prompt: string
  tokens: Token[]

  stageIndex: number
  stage: Stage

  /** Which experience/project card the visitor has expanded, if any. */
  openCard: string | null
  /** Which shipped project the evaluate stage is showing. */
  selectedProject: string

  setQuality: (q: QualityProfile) => void
  setBootProgress: (p: number) => void
  setReady: (r: boolean) => void
  setPlainMode: (p: boolean) => void
  submitPrompt: (value: string) => void
  setStageIndex: (i: number) => void
  setOpenCard: (id: string | null) => void
  setSelectedProject: (id: string) => void
  reset: () => void
}

export const useStore = create<State>((set, get) => ({
  quality: detectQuality(),
  reducedMotion: prefersReducedMotion(),
  plainMode: false,

  bootProgress: 0,
  ready: false,

  entered: false,
  prompt: '',
  tokens: [],

  stageIndex: 0,
  stage: STAGES[0],

  openCard: null,
  selectedProject: 'ai-trader',

  setQuality: (quality) => set({ quality }),
  setBootProgress: (bootProgress) => set({ bootProgress }),
  setReady: (ready) => set({ ready }),
  setPlainMode: (plainMode) => set({ plainMode }),

  submitPrompt: (value) => {
    const prompt = value.trim()
    if (!prompt) return
    set({ prompt, tokens: tokenize(prompt), entered: true })
  },

  setStageIndex: (i) => {
    const clamped = Math.max(0, Math.min(STAGES.length - 1, i))
    if (clamped === get().stageIndex) return
    set({ stageIndex: clamped, stage: STAGES[clamped], openCard: null })
  },

  setOpenCard: (openCard) => set({ openCard }),
  setSelectedProject: (selectedProject) => set({ selectedProject }),

  reset: () => set({ entered: false, prompt: '', tokens: [], stageIndex: 0, stage: STAGES[0] }),
}))

/**
 * A tiny procedural sound engine.
 *
 * Every cue is synthesised from oscillators and filtered noise — no audio files
 * to download, nothing to keep in sync with the build, and the whole thing is
 * about 4kB. The palette is deliberately quiet and short: this is furniture for
 * the interface, not a soundtrack.
 *
 * Browsers refuse to start audio without a gesture, so nothing is created until
 * `unlock()` is called from the prompt submit — which is the first real click
 * anyone makes on the site.
 */

const STORAGE_KEY = 'latent-space:sound'

type Voice = {
  osc: OscillatorNode
  gain: GainNode
}

class Sfx {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private started = false

  /** Muted state survives reloads; sound is on unless the visitor turned it off. */
  enabled = ((): boolean => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== 'off'
    } catch {
      return true
    }
  })()

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (this.started) {
      void this.ctx?.resume()
      return
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return

      this.ctx = new Ctor()

      // A limiter on the end, so raising the cue levels enough to be audible
      // on laptop speakers cannot clip when several land at once.
      const limiter = this.ctx.createDynamicsCompressor()
      limiter.threshold.value = -10
      limiter.knee.value = 6
      limiter.ratio.value = 12
      limiter.attack.value = 0.003
      limiter.release.value = 0.15
      limiter.connect(this.ctx.destination)

      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      this.master.connect(limiter)

      // one second of white noise, reused by every whoosh
      const rate = this.ctx.sampleRate
      const buf = this.ctx.createBuffer(1, rate, rate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      this.noiseBuffer = buf

      this.started = true
      // Safari and iOS hand back a suspended context even from a gesture.
      void this.ctx.resume()
    } catch {
      this.ctx = null
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
    } catch {
      /* private mode — the setting just will not persist */
    }
    if (on) this.unlock()
  }

  /**
   * Scheduling origin, with a look-ahead.
   *
   * `currentTime` reports the last *completed* render quantum, so it sits
   * behind where the audio thread is actually writing. Schedule an envelope at
   * exactly `currentTime` and its events can all be in the past by the time
   * they are processed, leaving the gain pinned at its 0.0001 floor — silence.
   * Long sweeps survive that; short ticks do not. 60ms of look-ahead is
   * imperceptible on an interface sound and makes every cue land.
   *
   * The short cues are also kept above ~50ms for the same reason: anything
   * briefer risks being swallowed whole by one render block.
   */
  private get now() {
    return (this.ctx?.currentTime ?? 0) + 0.09
  }

  /**
   * No check on `ctx.state` here: a context can still be resuming when the
   * first cues are scheduled, and dropping them would silence the very sounds
   * the opening gesture asked for.
   */
  private live(): boolean {
    if (!this.enabled || !this.ctx || !this.master) return false
    // Contexts get suspended by the OS, by tab backgrounding, and by Safari on
    // a whim. Nudge it awake rather than silently dropping the cue.
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return true
  }

  /** One decaying oscillator. `at` is an offset from now, in seconds. */
  private tone(
    type: OscillatorType,
    freq: number,
    opts: { at?: number; dur?: number; gain?: number; to?: number; detune?: number } = {},
  ): Voice | null {
    if (!this.ctx || !this.master) return null
    const t = this.now + (opts.at ?? 0)
    const dur = opts.dur ?? 0.18
    const peak = opts.gain ?? 0.1

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(opts.to, 1), t + dur)
    if (opts.detune) osc.detune.value = opts.detune

    // short attack, exponential tail — a plucked feel rather than a beep
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)

    osc.connect(gain).connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
    return { osc, gain }
  }

  /** Filtered noise, for whooshes and air. */
  private noise(
    opts: { at?: number; dur?: number; gain?: number; from?: number; to?: number; q?: number } = {},
  ) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return
    const t = this.now + (opts.at ?? 0)
    const dur = opts.dur ?? 0.4

    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = opts.q ?? 1.1
    filter.frequency.setValueAtTime(opts.from ?? 300, t)
    filter.frequency.exponentialRampToValueAtTime(Math.max(opts.to ?? 2400, 1), t + dur)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.05, t + dur * 0.28)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)

    src.connect(filter).connect(gain).connect(this.master)
    src.start(t)
    src.stop(t + dur + 0.02)
  }

  // --- the cue palette -----------------------------------------------------

  /** Prompt submitted: the machine spins up. */
  submit() {
    if (!this.live()) return
    this.noise({ dur: 0.75, gain: 0.16, from: 220, to: 3600, q: 0.8 })
    this.tone('sine', 220, { dur: 0.7, gain: 0.3, to: 660 })
    this.tone('triangle', 523.25, { at: 0.32, dur: 0.5, gain: 0.15 })
    this.tone('triangle', 784, { at: 0.42, dur: 0.55, gain: 0.11 })
  }

  /** Arriving at a new stage: a swell under a soft thump. */
  stage(index = 0) {
    if (!this.live()) return
    this.noise({ dur: 0.55, gain: 0.1, from: 300, to: 2100, q: 0.9 })
    this.tone('sine', 196 + index * 6, { dur: 0.5, gain: 0.3 })
    this.tone('sine', 392 + index * 12, { at: 0.04, dur: 0.34, gain: 0.13 })
    this.tone('triangle', 587.33, { at: 0.08, dur: 0.26, gain: 0.06 })
  }

  /** A card landing. Pitch climbs slightly through a group so a list feels sequenced. */
  card(index = 0) {
    if (!this.live()) return
    const base = 880 * Math.pow(2, (index % 6) / 24)
    this.tone('triangle', base, { dur: 0.14, gain: 0.1 })
    this.tone('sine', base * 2, { dur: 0.09, gain: 0.045 })
  }

  /** Fires a whole group of card ticks on one schedule. */
  cards(count: number, opts: { delay?: number; step?: number } = {}) {
    if (!this.live() || count <= 0) return
    const delay = opts.delay ?? 0.13
    const step = opts.step ?? 0.052
    for (let i = 0; i < Math.min(count, 14); i++) {
      const base = 880 * Math.pow(2, (i % 6) / 24)
      this.tone('triangle', base, { at: delay + i * step, dur: 0.14, gain: 0.1 })
      this.tone('sine', base * 2, { at: delay + i * step, dur: 0.09, gain: 0.045 })
    }
  }

  /** A token chip appearing — the smallest sound in the set. */
  token(index = 0) {
    if (!this.live()) return
    this.tone('sine', 1650 + (index % 5) * 90, { dur: 0.07, gain: 0.06 })
  }

  /** Switching project: the particle world is about to reassemble. */
  switchProject() {
    if (!this.live()) return
    this.noise({ dur: 0.7, gain: 0.15, from: 1100, to: 300, q: 1.4 })
    this.tone('sine', 196, { dur: 0.55, gain: 0.3 })
    this.tone('triangle', 392, { at: 0.05, dur: 0.38, gain: 0.14 })
    this.tone('triangle', 587.33, { at: 0.12, dur: 0.42, gain: 0.11 })
    this.tone('triangle', 784, { at: 0.2, dur: 0.4, gain: 0.08 })
  }

  /** Expanding a record. */
  open() {
    if (!this.live()) return
    this.tone('triangle', 520, { dur: 0.3, gain: 0.16, to: 880 })
    this.tone('sine', 1040, { at: 0.03, dur: 0.2, gain: 0.07 })
  }

  /** Collapsing it again. */
  close() {
    if (!this.live()) return
    this.tone('triangle', 760, { dur: 0.26, gain: 0.13, to: 400 })
  }

  /** Hovering something interactive. Barely there on purpose. */
  tick() {
    if (!this.live()) return
    this.tone('sine', 2100, { dur: 0.055, gain: 0.035 })
  }
}

export const sfx = new Sfx()

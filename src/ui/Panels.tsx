import { useEffect, useMemo, useRef } from 'react'
import {
  certifications,
  education,
  experience,
  geography,
  identity,
  interests,
  metrics,
  projects,
  skills,
  type Project,
  type Role,
} from '../data/profile'
import { sfx } from '../lib/audio'
import { rank } from '../lib/relevance'
import { useStore } from '../store/useStore'
import { useTypewriter } from './useTypewriter'

/** Shared card furniture: the corner brackets are drawn in CSS, this is the id. */
function Index({ n }: { n: number }) {
  return <span className="card-index">{String(n).padStart(2, '0')}</span>
}

/* ----------------------------------------------------------- 1 · tokenize --- */

export function TokenizePanel() {
  const tokens = useStore((s) => s.tokens)
  const prompt = useStore((s) => s.prompt)
  const stageIndex = useStore((s) => s.stageIndex)
  const cued = useRef(false)

  // One tiny click per chip, on the same 34ms rhythm the chips animate in on.
  useEffect(() => {
    if (stageIndex !== 1) {
      cued.current = false
      return
    }
    if (cued.current) return
    cued.current = true
    const timers = tokens.slice(0, 22).map((_, i) =>
      window.setTimeout(() => sfx.token(i), 120 + i * 34),
    )
    return () => timers.forEach(window.clearTimeout)
  }, [stageIndex, tokens])

  const chars = prompt.length
  const ratio = tokens.length ? (chars / tokens.length).toFixed(2) : '0'

  return (
    <div>
      <span className="eyebrow">Step 01 — Tokenize</span>
      <h2 className="stage-title">Your prompt, in pieces.</h2>
      <p className="stage-lede">
        Before a model can think about anything you said, it has to break it apart. Sub-word pieces,
        leading spaces preserved, each one mapped to an integer.
      </p>

      <div className="token-grid">
        {tokens.map((t, i) => (
          <span key={`${t.id}-${i}`} className="token" style={{ '--delay': `${i * 34}ms` } as never}>
            {t.label}
            <i>{t.id}</i>
          </span>
        ))}
      </div>

      <dl className="readout">
        <div>
          <dt>tokens</dt>
          <dd>{tokens.length}</dd>
        </div>
        <div>
          <dt>characters</dt>
          <dd>{chars}</dd>
        </div>
        <div>
          <dt>chars / token</dt>
          <dd>{ratio}</dd>
        </div>
        <div>
          <dt>vocab</dt>
          <dd>~50k</dd>
        </div>
      </dl>
    </div>
  )
}

/* -------------------------------------------------------------- 2 · embed --- */

export function EmbedPanel() {
  // Copy is held to the left half so the identity shape owns the right of the
  // frame — it is the one stage where the cloud is a portrait, not a texture.
  return (
    <div className="embed">
      <span className="eyebrow">Step 02 — Embed</span>
      <h2 className="stage-title">Now it means something.</h2>
      <p className="stage-lede" style={{ marginBottom: 16 }}>
        {identity.summary}
      </p>
      <p className="stage-lede">{identity.summaryLong}</p>
      <div className="chip-row">
        {identity.specialisms.map((s) => (
          <span key={s} className="chip">
            {s}
          </span>
        ))}
      </div>

      <div className="metric-row">
        {metrics.map((m) => (
          <div key={m.label} className="metric">
            <b>{m.value}</b>
            <span>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- 3 · retrieve --- */

function roleText(r: Role) {
  return [r.company, r.role, r.meta, r.location, ...r.tags, ...r.bullets].join(' ')
}

export function RetrievePanel() {
  const prompt = useStore((s) => s.prompt)
  const openCard = useStore((s) => s.openCard)
  const setOpenCard = useStore((s) => s.setOpenCard)

  const ranked = useMemo(() => rank(prompt, experience, roleText), [prompt])

  return (
    <div>
      <span className="eyebrow">Step 03 — Retrieve</span>
      <h2 className="stage-title">Top matches from the corpus.</h2>
      <p className="stage-lede">
        Five years of work, scored against what you asked and pulled back nearest-first. Open one to
        read the whole record.
      </p>

      {/* Once a record is open the list can outgrow the viewport, so it scrolls
          on its own. data-lenis-prevent hands the wheel to the browser inside
          it — without that, smooth scroll would carry the whole page instead. */}
      <div
        className={`doc-list${openCard ? ' is-scrollable' : ''}`}
        data-lenis-prevent={openCard ? '' : undefined}
      >
        {ranked.map(({ doc, score }, i) => {
          const isOpen = openCard === doc.id
          return (
            <button
              key={doc.id}
              type="button"
              className={`card doc${isOpen ? ' is-open' : ''}`}
              aria-expanded={isOpen}
              onClick={() => {
                isOpen ? sfx.close() : sfx.open()
                setOpenCard(isOpen ? null : doc.id)
              }}
              onPointerEnter={() => sfx.tick()}
            >
              <div className="doc-score">
                <Index n={i + 1} />
                <em>{score.toFixed(3)}</em>
                <span className="meter">
                  <i style={{ width: `${score * 100}%` }} />
                </span>
                <small>similarity</small>
              </div>

              <div className="doc-main">
                <div className="doc-head">
                  <h3>{doc.role}</h3>
                  <span className="doc-company">{doc.company}</span>
                  <span className="doc-period">{doc.period}</span>
                </div>
                <p className="doc-meta">
                  {doc.meta} · {doc.location}
                </p>

                <div className="reveal">
                  <div>
                    <ul className="bullets">
                      {doc.bullets.map((b, k) => (
                        <li key={k}>{b}</li>
                      ))}
                    </ul>
                    <div className="chip-row">
                      {doc.tags.map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                      {doc.url && (
                        <span className="chip is-link">{doc.url.replace('https://', '')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="expand-hint">{isOpen ? 'Collapse' : 'Open record'}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- 4 · agents --- */

function projectText(p: Project) {
  return [p.name, p.tagline, p.role, ...p.tech, ...p.bullets].join(' ')
}

const AGENT_ROLES = ['orchestrator', 'researcher', 'synthesiser', 'analyst', 'reviewer', 'builder']

export function AgentsPanel() {
  const prompt = useStore((s) => s.prompt)
  const openCard = useStore((s) => s.openCard)
  const setOpenCard = useStore((s) => s.setOpenCard)

  const agentProjects = useMemo(() => projects.filter((p) => p.track === 'agents'), [])
  const ranked = useMemo(() => rank(prompt, agentProjects, projectText), [prompt, agentProjects])

  return (
    <div>
      <span className="eyebrow">Step 04 — Agent swarm</span>
      <h2 className="stage-title">Specialised agents, working the problem.</h2>
      <p className="stage-lede">
        Multi-agent pipelines she has designed and shipped — ingestion, research, synthesis, review —
        with Claude and GPT-4o routed per task.
      </p>

      <div
        className={`agent-grid${openCard ? ' is-scrollable' : ''}`}
        data-lenis-prevent={openCard ? '' : undefined}
      >
        {ranked.map(({ doc }, i) => {
          const isOpen = openCard === doc.id
          return (
            <button
              key={doc.id}
              type="button"
              className={`card agent${isOpen ? ' is-open' : ''}`}
              aria-expanded={isOpen}
              onClick={() => {
                isOpen ? sfx.close() : sfx.open()
                setOpenCard(isOpen ? null : doc.id)
              }}
              onPointerEnter={() => sfx.tick()}
            >
              <span className="agent-id">
                <i className="node-dot" />
                agent_{String(i + 1).padStart(2, '0')} · {AGENT_ROLES[i % AGENT_ROLES.length]}
              </span>
              <h3>{doc.name}</h3>
              <p>{doc.tagline}</p>

              <div className="reveal">
                <div>
                  <ul className="bullets">
                    {doc.bullets.map((b, k) => (
                      <li key={k}>{b}</li>
                    ))}
                  </ul>
                  <div className="chip-row">
                    {doc.tech.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {!isOpen && (
                <div className="chip-row">
                  {doc.tech.slice(0, 4).map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                  {doc.tech.length > 4 && <span className="chip">+{doc.tech.length - 4}</span>}
                </div>
              )}

              <span className="expand-hint">{isOpen ? 'Collapse' : 'Inspect'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- 5 · evaluate --- */

export function EvaluatePanel() {
  const selected = useStore((s) => s.selectedProject)
  const setSelectedProject = useStore((s) => s.setSelectedProject)

  // Every project appears here, each with its own particle world behind it.
  const project = projects.find((p) => p.id === selected) ?? projects[0]
  if (!project) return null

  const pick = (id: string) => {
    if (id === project.id) return
    sfx.switchProject()
    setSelectedProject(id)
  }

  return (
    <div>
      <span className="eyebrow">Step 05 — Evaluate</span>
      <h2 className="stage-title">What actually shipped.</h2>
      <p className="stage-lede">
        Seven projects taken to production. Pick one — the particle field behind rebuilds itself
        into that project&rsquo;s world.
      </p>

      {/* A switcher, not a single hard-coded case study. No one project gets to
          stand in for the whole portfolio. */}
      <div className="switch" role="tablist" aria-label="Shipped projects">
        {projects.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === project.id}
            className={`switch-tab${p.id === project.id ? ' is-active' : ''}`}
            onClick={() => pick(p.id)}
            onPointerEnter={() => sfx.tick()}
          >
            <Index n={i + 1} />
            <b>{p.name}</b>
            <small>{p.kind === 'ai' ? 'AI / ML' : 'Product'}</small>
          </button>
        ))}
      </div>

      <div className="showcase" key={project.id}>
        <div className="card showcase-lead">
          <p className="showcase-headline">{project.headline ?? project.tagline}</p>
          <p className="showcase-role">{project.role}</p>

          {project.stats && (
            <div className="stat-row">
              {project.stats.map((s) => (
                <div key={s.label} className="stat">
                  <b>{s.value}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="chip-row">
            {project.tech.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>

          <div className="link-row">
            {project.repo && (
              <a href={project.repo} target="_blank" rel="noreferrer">
                Repository ↗
              </a>
            )}
            {project.url && (
              <a href={project.url} target="_blank" rel="noreferrer">
                {project.url.replace('https://', '').replace(/\/$/, '')} ↗
              </a>
            )}
          </div>
        </div>

        <ol className="card build-log">
          {project.bullets.map((b, i) => (
            <li key={i} style={{ '--delay': `${i * 60}ms` } as never}>
              <b>{String(i + 1).padStart(2, '0')}</b>
              <span>{b}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- 6 · deploy --- */

export function DeployPanel() {
  return (
    <div>
      <span className="eyebrow">Step 06 — Deploy</span>
      <h2 className="stage-title">The whole stack, in four timezones.</h2>
      <p className="stage-lede">
        Equally at home in a fine-tuning script and a payments integration. Shipped into teams across
        Germany, the UK, the US and Sweden — from Ahmedabad.
      </p>

      {/* Two columns rather than stacked sections — the skill matrix is tall
          enough that a single column runs off the bottom of a laptop screen. */}
      <div className="deploy-layout">
        <div className="deploy-grid">
          {skills.map((g) => (
            <div key={g.id} className="card skill-group">
              <h3>{g.label}</h3>
              <ul>
                {g.items.map((s) => (
                  <li key={s} className="chip">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <aside className="deploy-side">
          <div className="card skill-group">
            <h3>Delivered into</h3>
            <div className="geo-list">
              {geography.map((g) => (
                <div key={g.id} className={`geo${g.home ? ' is-home' : ''}`}>
                  <b>{g.label}</b>
                  <span>{g.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card skill-group">
            <h3>Education &amp; certification</h3>
            <p className="deploy-note">
              <strong>{education.degree}</strong>
              <br />
              {education.school} · {education.period}
            </p>
            <ul className="deploy-certs">
              {certifications.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------- 7 · generate --- */

export function GeneratePanel() {
  const prompt = useStore((s) => s.prompt)
  const stageIndex = useStore((s) => s.stageIndex)
  const active = stageIndex === 7

  const answer = useMemo(() => {
    const q = prompt.trim().replace(/\s+/g, ' ')
    const short = q.length > 72 ? `${q.slice(0, 69)}…` : q
    return `You asked: "${short}" — the short answer is that Shreya has built and shipped this class of system in production, on her own, for real customers. Five years across the full stack, the last of them spent architecting AI products end to end: page generation with routed GPT-4o and Gemini, a fine-tuned model, RAG over ChromaDB and Pinecone, multi-agent pipelines, and a trading platform whose models she trained herself. She is open to senior AI and full-stack roles now.`
  }, [prompt])

  const { shown, done } = useTypewriter(answer, active)

  return (
    <div className="generate">
      <span className="eyebrow">Step 07 — Generate</span>
      <h2 className="stage-title">Output.</h2>

      <p className="answer">
        {shown}
        {!done && <span className="caret" />}
      </p>

      <div className="contact-row">
        <a className="contact-link" href={`mailto:${identity.email}`}>
          <small>Email</small>
          {identity.email}
        </a>
        <a className="contact-link" href={identity.linkedin} target="_blank" rel="noreferrer">
          <small>LinkedIn</small>
          shreya-dantani
        </a>
        <a className="contact-link" href={identity.github} target="_blank" rel="noreferrer">
          <small>GitHub</small>
          shre111
        </a>
        <a className="contact-link" href={`tel:${identity.phone.replace(/\s/g, '')}`}>
          <small>Phone</small>
          {identity.phone}
        </a>
      </div>

      <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: 0 }}>
        Also into {interests.join(', ').toLowerCase()}.
      </p>
    </div>
  )
}

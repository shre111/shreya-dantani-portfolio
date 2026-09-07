import {
  certifications,
  education,
  experience,
  geography,
  identity,
  interests,
  projects,
  skills,
  softSkills,
} from '../data/profile'
import { useStore } from '../store/useStore'

/**
 * Everything the 3D journey says, as an ordinary document.
 *
 * Reachable from the skip link, the "Read as document" button, and served
 * automatically when WebGL is missing. A recruiter with four minutes and a
 * locked-down laptop should never be stuck.
 */
export function PlainDocument({ escapable = true }: { escapable?: boolean }) {
  const setPlainMode = useStore((s) => s.setPlainMode)

  return (
    <main className="plain" id="document">
      {escapable && (
        <div className="hud hud--tr" style={{ position: 'fixed' }}>
          <button type="button" className="hud-btn" onClick={() => setPlainMode(false)}>
            Back to the experience
          </button>
        </div>
      )}

      <h1>{identity.name}</h1>
      <p className="plain-role">
        {identity.title} — {identity.specialisms.join(' · ')}
      </p>

      <div className="plain-contact">
        <a href={`mailto:${identity.email}`}>{identity.email}</a>
        <a href={`tel:${identity.phone.replace(/\s/g, '')}`}>{identity.phone}</a>
        <a href={identity.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href={identity.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <span style={{ color: 'var(--text-faint)' }}>{identity.location}</span>
      </div>

      <h2>Professional summary</h2>
      <p style={{ color: 'var(--text-dim)' }}>{identity.summary}</p>
      <p style={{ color: 'var(--text-dim)' }}>{identity.summaryLong}</p>

      <h2>Experience</h2>
      {experience.map((r) => (
        <article key={r.id}>
          <h3>
            {r.role} — {r.company}
          </h3>
          <p className="plain-sub">
            {r.period} · {r.location} · {r.meta}
            {r.url ? ` · ${r.url.replace('https://', '')}` : ''}
          </p>
          <ul>
            {r.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </article>
      ))}

      <h2>AI / LLM projects</h2>
      {projects
        .filter((p) => p.kind === 'ai')
        .map((p) => (
          <article key={p.id}>
            <h3>
              {p.name} — {p.tagline}
            </h3>
            <p className="plain-sub">
              {p.role}
              {p.repo ? ` · ${p.repo.replace('https://', '')}` : ''}
            </p>
            <p className="plain-sub">Tech: {p.tech.join(', ')}</p>
            <ul>
              {p.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
              {p.stats?.length ? (
                <li>
                  Results: {p.stats.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(' · ')}
                </li>
              ) : null}
            </ul>
          </article>
        ))}

      <h2>Full stack projects</h2>
      {projects
        .filter((p) => p.kind === 'fullstack')
        .map((p) => (
          <article key={p.id}>
            <h3>
              {p.name} — {p.tagline}
            </h3>
            <p className="plain-sub">
              {p.role}
              {p.url ? ` · ${p.url.replace('https://', '')}` : ''}
            </p>
            <p className="plain-sub">Tech: {p.tech.join(', ')}</p>
            <ul>
              {p.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </article>
        ))}

      <h2>Technical skills</h2>
      {skills.map((g) => (
        <p key={g.id} style={{ color: 'var(--text-dim)', fontSize: 14.5 }}>
          <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {g.label}:{' '}
          </strong>
          {g.items.join(', ')}
        </p>
      ))}

      <h2>Delivery footprint</h2>
      <ul>
        {geography.map((g) => (
          <li key={g.id}>
            {g.label} — {g.note}
          </li>
        ))}
      </ul>

      <h2>Education</h2>
      <p className="plain-sub">
        {education.degree} · {education.school} · {education.period}
      </p>

      <h2>Certifications</h2>
      <ul>
        {certifications.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <h2>Beyond the code</h2>
      <p style={{ color: 'var(--text-dim)' }}>{softSkills.join(' · ')}</p>
      <p style={{ color: 'var(--text-dim)' }}>Interests: {interests.join(', ')}</p>
    </main>
  )
}

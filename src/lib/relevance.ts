/**
 * A cheap lexical overlap score, presented as the similarity score a retrieval
 * step would return. It is honest about what it is — real term overlap against
 * the document text — just not a real embedding.
 */

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was',
  'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did', 'can', 'could', 'she',
  'her', 'it', 'that', 'this', 'what', 'how', 'me', 'my', 'you', 'your', 'about', 'show',
  'tell', 'shreya', 'at', 'as', 'by', 'from', 'up', 'out', 'if', 'then', 'so',
])

function terms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
}

/** Loose match so "pipeline" finds "pipelines" and "agent" finds "agents". */
function matches(needle: string, haystack: Set<string>): boolean {
  if (haystack.has(needle)) return true
  if (needle.length < 4) return false
  for (const t of haystack) {
    if (t.length >= 4 && (t.startsWith(needle) || needle.startsWith(t))) return true
  }
  return false
}

/**
 * Scores each document against the prompt and returns them in descending order,
 * with a similarity in a plausible 0.63–0.97 band.
 *
 * The base weight follows source order, so the most recent and senior work wins
 * ties. Query overlap then moves things by up to 0.23 — enough for a pointed
 * question to reorder the list, not enough to bury the headline role.
 */
export function rank<T>(prompt: string, docs: T[], toText: (d: T) => string) {
  const qSet = new Set(terms(prompt))

  const scored = docs.map((doc, i) => {
    const docSet = new Set(terms(toText(doc)))

    let hits = 0
    for (const t of qSet) if (matches(t, docSet)) hits++

    const coverage = qSet.size ? hits / qSet.size : 0
    const base = 0.74 - i * 0.035
    const score = Math.max(0.63, Math.min(0.97, base + coverage * 0.23))

    return { doc, score, hits }
  })

  return scored.sort((a, b) => b.score - a.score)
}

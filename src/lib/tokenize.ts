/**
 * A cosmetic tokenizer. It is not BPE — it just splits the way a BPE tokenizer
 * visibly does (leading spaces kept on the token, long words broken into
 * sub-word pieces) so the tokenize stage reads as authentic to anyone who has
 * seen a tokenizer playground.
 */

export type Token = {
  id: number
  text: string
  /** Display form — leading space rendered as a visible middot. */
  label: string
}

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 99999
}

/** Common English chunks a real merge table would have learned. */
const COMMON = [
  'ing',
  'tion',
  'ment',
  'ness',
  'able',
  'ical',
  'ous',
  'est',
  'ed',
  'er',
  'ly',
  're',
  'un',
  'in',
]

function splitWord(word: string): string[] {
  if (word.length <= 4) return [word]

  for (const suffix of COMMON) {
    if (word.length > suffix.length + 2 && word.toLowerCase().endsWith(suffix)) {
      return [...splitWord(word.slice(0, -suffix.length)), word.slice(-suffix.length)]
    }
  }

  const pieces: string[] = []
  let i = 0
  while (i < word.length) {
    const size = word.length - i <= 5 ? word.length - i : 3 + (hash(word + i) % 2)
    pieces.push(word.slice(i, i + size))
    i += size
  }
  return pieces
}

export function tokenize(input: string, limit = 26): Token[] {
  const text = input.trim().slice(0, 220)
  if (!text) return []

  // keep leading whitespace glued to the following word, like GPT tokenizers
  const chunks = text.match(/\s*[A-Za-z0-9']+|\s*[^\sA-Za-z0-9']+|\s+/g) ?? []

  const tokens: Token[] = []
  for (const chunk of chunks) {
    const lead = chunk.match(/^\s+/)?.[0] ?? ''
    const body = chunk.slice(lead.length)
    if (!body) continue

    const parts = /^[A-Za-z0-9']+$/.test(body) ? splitWord(body) : [body]
    parts.forEach((part, i) => {
      const raw = (i === 0 ? lead : '') + part
      tokens.push({
        id: hash(raw),
        text: raw,
        label: raw.replace(/^\s+/, '·'),
      })
    })
    if (tokens.length >= limit) break
  }

  return tokens.slice(0, limit)
}

export const DEFAULT_PROMPTS = [
  'Tell me what Shreya has actually shipped',
  'Show me the RAG pipeline work',
  'How does the trading agent decide to exit?',
  'Can she own an AI product end to end?',
]

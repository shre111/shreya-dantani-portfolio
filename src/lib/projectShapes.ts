import { SHAPE_INDEX, type ShapeId } from './shapes'

/**
 * Each project gets its own particle world on the evaluate stage, so switching
 * project physically rebuilds the cloud into something that means what the
 * project means.
 *
 * Lives here rather than in profile.ts because shapes.ts already imports
 * `geography` from there — putting the shape id on the project record itself
 * would make that import cycle.
 */
export const PROJECT_SHAPE: Record<string, ShapeId> = {
  'ai-trader': 'candles', // a candlestick chart and its equity curve
  giftlips: 'gifting', // a wrapped gift box with cards orbiting it
  'funnelcockpit-product': 'funnel', // a conversion funnel, blocks mid-drag
  'xgboost-dashboard': 'trees', // three boosted decision trees
  'seed-vc': 'waveform', // a voice, and the rings it radiates
  'research-engine': 'shards', // documents pulled in from a ring
  'agixt-workflows': 'neural', // a graph of collaborating agents
}

/** Falls back to the evaluate stage's own shape for anything unmapped. */
export function shapeIndexForProject(id: string): number {
  const shape = PROJECT_SHAPE[id]
  return shape ? SHAPE_INDEX[shape] : SHAPE_INDEX.candles
}

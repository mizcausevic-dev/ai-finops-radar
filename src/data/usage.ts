import type { UsageEvent } from '../governance/chargeback';
import type { CostPoint } from '../governance/anomaly-detector';
import { computeCost } from '../governance/cost-calculator';

interface Seed {
  user: string;
  department: string;
  project: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  daysAgo: number;
  hour: number;
}

// 7-day rolling window of usage. Engineering is the heavy spender via Opus
// 4.7. Marketing has a one-day spike on May 5 (anomaly target).
const SEEDS: Seed[] = [
  // Engineering — daily heavy load, mixed Opus + Sonnet
  { user: 'alice@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-opus-4.7', inputTokens: 850000, outputTokens: 220000, cachedInputTokens: 320000, daysAgo: 6, hour: 9 },
  { user: 'bob@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-sonnet-4.6', inputTokens: 1200000, outputTokens: 380000, daysAgo: 6, hour: 14 },
  { user: 'alice@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-opus-4.7', inputTokens: 920000, outputTokens: 240000, cachedInputTokens: 350000, daysAgo: 5, hour: 10 },
  { user: 'cara@corp.com', department: 'engineering', project: 'review-agent', modelId: 'gpt-5', inputTokens: 480000, outputTokens: 110000, daysAgo: 5, hour: 16 },
  { user: 'alice@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-opus-4.7', inputTokens: 880000, outputTokens: 230000, cachedInputTokens: 310000, daysAgo: 4, hour: 11 },
  { user: 'bob@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-sonnet-4.6', inputTokens: 1300000, outputTokens: 410000, daysAgo: 4, hour: 15 },
  { user: 'alice@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-opus-4.7', inputTokens: 905000, outputTokens: 235000, cachedInputTokens: 320000, daysAgo: 3, hour: 9 },
  { user: 'cara@corp.com', department: 'engineering', project: 'review-agent', modelId: 'gpt-5', inputTokens: 510000, outputTokens: 120000, daysAgo: 3, hour: 17 },
  { user: 'alice@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-opus-4.7', inputTokens: 940000, outputTokens: 250000, cachedInputTokens: 330000, daysAgo: 2, hour: 10 },
  { user: 'bob@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-sonnet-4.6', inputTokens: 1280000, outputTokens: 400000, daysAgo: 2, hour: 14 },
  { user: 'alice@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-opus-4.7', inputTokens: 950000, outputTokens: 255000, cachedInputTokens: 340000, daysAgo: 1, hour: 11 },
  { user: 'cara@corp.com', department: 'engineering', project: 'review-agent', modelId: 'gpt-5', inputTokens: 530000, outputTokens: 125000, daysAgo: 1, hour: 16 },
  { user: 'alice@corp.com', department: 'engineering', project: 'platform-copilot', modelId: 'claude-opus-4.7', inputTokens: 970000, outputTokens: 260000, cachedInputTokens: 350000, daysAgo: 0, hour: 9 },

  // Data-platform — embeddings + Sonnet for indexing
  { user: 'dan@corp.com', department: 'data-platform', project: 'rag-index', modelId: 'text-embedding-3-large', inputTokens: 8000000, outputTokens: 0, daysAgo: 6, hour: 2 },
  { user: 'dan@corp.com', department: 'data-platform', project: 'rag-index', modelId: 'claude-sonnet-4.6', inputTokens: 800000, outputTokens: 220000, daysAgo: 6, hour: 5 },
  { user: 'dan@corp.com', department: 'data-platform', project: 'rag-index', modelId: 'text-embedding-3-large', inputTokens: 7500000, outputTokens: 0, daysAgo: 5, hour: 2 },
  { user: 'dan@corp.com', department: 'data-platform', project: 'rag-index', modelId: 'text-embedding-3-large', inputTokens: 8200000, outputTokens: 0, daysAgo: 4, hour: 2 },
  { user: 'eli@corp.com', department: 'data-platform', project: 'analytics-agent', modelId: 'gemini-2.5-flash', inputTokens: 2400000, outputTokens: 510000, daysAgo: 4, hour: 14 },
  { user: 'dan@corp.com', department: 'data-platform', project: 'rag-index', modelId: 'text-embedding-3-large', inputTokens: 7900000, outputTokens: 0, daysAgo: 3, hour: 2 },
  { user: 'eli@corp.com', department: 'data-platform', project: 'analytics-agent', modelId: 'gemini-2.5-flash', inputTokens: 2600000, outputTokens: 540000, daysAgo: 3, hour: 14 },
  { user: 'dan@corp.com', department: 'data-platform', project: 'rag-index', modelId: 'text-embedding-3-large', inputTokens: 8100000, outputTokens: 0, daysAgo: 2, hour: 2 },
  { user: 'dan@corp.com', department: 'data-platform', project: 'rag-index', modelId: 'text-embedding-3-large', inputTokens: 8300000, outputTokens: 0, daysAgo: 1, hour: 2 },
  { user: 'eli@corp.com', department: 'data-platform', project: 'analytics-agent', modelId: 'gemini-2.5-flash', inputTokens: 2700000, outputTokens: 550000, daysAgo: 1, hour: 14 },
  { user: 'dan@corp.com', department: 'data-platform', project: 'rag-index', modelId: 'text-embedding-3-large', inputTokens: 8400000, outputTokens: 0, daysAgo: 0, hour: 2 },

  // Product — moderate Sonnet usage for spec drafting
  { user: 'fran@corp.com', department: 'product', project: 'spec-drafter', modelId: 'claude-sonnet-4.6', inputTokens: 320000, outputTokens: 95000, daysAgo: 6, hour: 11 },
  { user: 'fran@corp.com', department: 'product', project: 'spec-drafter', modelId: 'claude-sonnet-4.6', inputTokens: 350000, outputTokens: 105000, daysAgo: 5, hour: 13 },
  { user: 'gina@corp.com', department: 'product', project: 'feedback-synth', modelId: 'gpt-5-mini', inputTokens: 480000, outputTokens: 110000, daysAgo: 4, hour: 10 },
  { user: 'fran@corp.com', department: 'product', project: 'spec-drafter', modelId: 'claude-sonnet-4.6', inputTokens: 340000, outputTokens: 100000, daysAgo: 3, hour: 14 },
  { user: 'gina@corp.com', department: 'product', project: 'feedback-synth', modelId: 'gpt-5-mini', inputTokens: 500000, outputTokens: 115000, daysAgo: 2, hour: 11 },
  { user: 'fran@corp.com', department: 'product', project: 'spec-drafter', modelId: 'claude-sonnet-4.6', inputTokens: 360000, outputTokens: 110000, daysAgo: 1, hour: 12 },
  { user: 'gina@corp.com', department: 'product', project: 'feedback-synth', modelId: 'gpt-5-mini', inputTokens: 510000, outputTokens: 118000, daysAgo: 0, hour: 13 },

  // Support — Haiku for ticket triage (cheap, high volume)
  { user: 'helen@corp.com', department: 'support', project: 'ticket-triage', modelId: 'claude-haiku-4.5', inputTokens: 4500000, outputTokens: 1200000, daysAgo: 6, hour: 8 },
  { user: 'helen@corp.com', department: 'support', project: 'ticket-triage', modelId: 'claude-haiku-4.5', inputTokens: 4700000, outputTokens: 1250000, daysAgo: 5, hour: 8 },
  { user: 'helen@corp.com', department: 'support', project: 'ticket-triage', modelId: 'claude-haiku-4.5', inputTokens: 4400000, outputTokens: 1180000, daysAgo: 4, hour: 8 },
  { user: 'helen@corp.com', department: 'support', project: 'ticket-triage', modelId: 'claude-haiku-4.5', inputTokens: 4600000, outputTokens: 1230000, daysAgo: 3, hour: 8 },
  { user: 'helen@corp.com', department: 'support', project: 'ticket-triage', modelId: 'claude-haiku-4.5', inputTokens: 4550000, outputTokens: 1210000, daysAgo: 2, hour: 8 },
  { user: 'helen@corp.com', department: 'support', project: 'ticket-triage', modelId: 'claude-haiku-4.5', inputTokens: 4650000, outputTokens: 1240000, daysAgo: 1, hour: 8 },
  { user: 'helen@corp.com', department: 'support', project: 'ticket-triage', modelId: 'claude-haiku-4.5', inputTokens: 4720000, outputTokens: 1260000, daysAgo: 0, hour: 8 },

  // Marketing — modest baseline + ANOMALY day (4d ago, mass campaign)
  { user: 'iris@corp.com', department: 'marketing', project: 'copy-gen', modelId: 'gpt-5-mini', inputTokens: 60000, outputTokens: 25000, daysAgo: 6, hour: 10 },
  { user: 'iris@corp.com', department: 'marketing', project: 'copy-gen', modelId: 'gpt-5-mini', inputTokens: 75000, outputTokens: 30000, daysAgo: 5, hour: 11 },
  // ANOMALY: massive campaign batch
  { user: 'iris@corp.com', department: 'marketing', project: 'mass-campaign', modelId: 'gpt-5', inputTokens: 4500000, outputTokens: 1200000, daysAgo: 4, hour: 14 },
  { user: 'jay@corp.com', department: 'marketing', project: 'mass-campaign', modelId: 'gpt-5', inputTokens: 3800000, outputTokens: 950000, daysAgo: 4, hour: 16 },
  // back to baseline
  { user: 'iris@corp.com', department: 'marketing', project: 'copy-gen', modelId: 'gpt-5-mini', inputTokens: 80000, outputTokens: 32000, daysAgo: 3, hour: 11 },
  { user: 'iris@corp.com', department: 'marketing', project: 'copy-gen', modelId: 'gpt-5-mini', inputTokens: 70000, outputTokens: 28000, daysAgo: 2, hour: 12 },
  { user: 'iris@corp.com', department: 'marketing', project: 'copy-gen', modelId: 'gpt-5-mini', inputTokens: 85000, outputTokens: 35000, daysAgo: 1, hour: 11 },
  { user: 'iris@corp.com', department: 'marketing', project: 'copy-gen', modelId: 'gpt-5-mini', inputTokens: 90000, outputTokens: 38000, daysAgo: 0, hour: 10 },

  // Sales — minimal use
  { user: 'kim@corp.com', department: 'sales', project: 'outreach-personalization', modelId: 'claude-haiku-4.5', inputTokens: 220000, outputTokens: 65000, daysAgo: 5, hour: 14 },
  { user: 'kim@corp.com', department: 'sales', project: 'outreach-personalization', modelId: 'claude-haiku-4.5', inputTokens: 240000, outputTokens: 70000, daysAgo: 3, hour: 15 },
  { user: 'kim@corp.com', department: 'sales', project: 'outreach-personalization', modelId: 'claude-haiku-4.5', inputTokens: 260000, outputTokens: 75000, daysAgo: 1, hour: 14 },
];

// Deterministic anchor: events relative to 2026-05-07 (today in this scenario)
const NOW = new Date('2026-05-07T16:00:00Z').getTime();
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const USAGE_EVENTS: UsageEvent[] = SEEDS.map((seed, i) => {
  const ts = new Date(NOW - seed.daysAgo * DAY_MS + (seed.hour - 16) * HOUR_MS);
  const cost = computeCost({
    modelId: seed.modelId,
    inputTokens: seed.inputTokens,
    outputTokens: seed.outputTokens,
    cachedInputTokens: seed.cachedInputTokens,
  });
  return {
    eventId: `evt_${i.toString().padStart(4, '0')}`,
    timestamp: ts.toISOString(),
    user: seed.user,
    department: seed.department,
    project: seed.project,
    modelId: seed.modelId,
    provider: cost.provider,
    inputTokens: seed.inputTokens,
    outputTokens: seed.outputTokens,
    totalCostUsd: cost.totalCostUsd,
  };
});

// Daily cost series for forecasting / anomaly detection
export function dailyCostSeries(events: UsageEvent[] = USAGE_EVENTS): CostPoint[] {
  const byDate = new Map<string, number>();
  for (const e of events) {
    const date = e.timestamp.slice(0, 10);
    byDate.set(date, (byDate.get(date) || 0) + e.totalCostUsd);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, costUsd]) => ({ date, costUsd: Math.round(costUsd * 100) / 100 }));
}

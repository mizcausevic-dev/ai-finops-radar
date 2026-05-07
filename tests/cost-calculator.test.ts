import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCost, compareProviders, findPricing, PRICING_CATALOG } from '../src/governance/cost-calculator';

test('computeCost: opus 4.7 — 1M in / 0.5M out priced correctly', () => {
  const r = computeCost({ modelId: 'claude-opus-4.7', inputTokens: 1_000_000, outputTokens: 500_000 });
  // 1M in @ $15 + 0.5M out @ $75 = $15 + $37.5 = $52.5
  assert.equal(r.totalCostUsd, 52.5);
  assert.equal(r.provider, 'Anthropic');
});

test('computeCost: cached input gets discount rate', () => {
  const r = computeCost({
    modelId: 'claude-opus-4.7',
    inputTokens: 1_000_000,
    outputTokens: 0,
    cachedInputTokens: 800_000,
  });
  // 200K billable @ $15/1M = $3.00; 800K cached @ $1.50/1M = $1.20; total = $4.20
  assert.ok(Math.abs(r.totalCostUsd - 4.2) < 0.01, `got ${r.totalCostUsd}`);
});

test('computeCost: throws on unknown model', () => {
  assert.throws(() => computeCost({ modelId: 'fake-model', inputTokens: 1000, outputTokens: 500 }), /Unknown model/);
});

test('computeCost: zero tokens yields zero cost', () => {
  const r = computeCost({ modelId: 'claude-haiku-4.5', inputTokens: 0, outputTokens: 0 });
  assert.equal(r.totalCostUsd, 0);
  assert.equal(r.effectiveRateUsdPer1k, 0);
});

test('computeCost: effective rate per 1k tokens computed', () => {
  const r = computeCost({ modelId: 'claude-haiku-4.5', inputTokens: 1_000_000, outputTokens: 0 });
  // Haiku is $0.80/1M = $0.0008/1k
  assert.ok(Math.abs(r.effectiveRateUsdPer1k - 0.0008) < 0.00001);
});

test('compareProviders: Haiku beats Opus on cost for same workload', () => {
  const rows = compareProviders({
    inputTokens: 100_000,
    outputTokens: 50_000,
    modelIds: ['claude-opus-4.7', 'claude-haiku-4.5', 'gpt-5'],
  });
  assert.equal(rows[0].modelId, 'claude-haiku-4.5');
  assert.ok(rows[0].totalCostUsd < rows[rows.length - 1].totalCostUsd);
});

test('compareProviders: vsBaselinePct scaled correctly', () => {
  const rows = compareProviders({
    inputTokens: 1_000_000,
    outputTokens: 0,
    modelIds: ['claude-opus-4.7', 'claude-haiku-4.5'],
  });
  // Haiku = $0.80, Opus = $15. Opus is 1775% more
  const opus = rows.find((r) => r.modelId === 'claude-opus-4.7')!;
  assert.ok(opus.vsBaselinePct > 1500);
});

test('compareProviders: empty modelIds list defaults to all non-embedding', () => {
  const rows = compareProviders({ inputTokens: 100_000, outputTokens: 50_000 });
  assert.ok(rows.length >= 10);
  assert.ok(!rows.some((r) => r.tier === 'embedding'));
});

test('findPricing: returns entry by modelId', () => {
  const p = findPricing('gpt-5');
  assert.ok(p);
  assert.equal(p!.provider, 'OpenAI');
});

test('catalog: all entries have valid pricing', () => {
  for (const p of PRICING_CATALOG) {
    assert.ok(p.inputUsdPer1M >= 0);
    assert.ok(p.outputUsdPer1M >= 0);
    assert.ok(p.contextWindow > 0);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBudget } from '../src/governance/budget-tracker';
import { detectAnomalies } from '../src/governance/anomaly-detector';
import { forecastMonthEnd } from '../src/governance/forecaster';
import { rollupChargeback } from '../src/governance/chargeback';

const BUDGET = {
  budgetId: 'b_test',
  scope: 'department' as const,
  scopeName: 'engineering',
  monthlyBudgetUsd: 10000,
  startOfMonth: '2026-05-01',
  rolloverPolicy: 'reset' as const,
};

test('evaluateBudget: healthy at 15% utilization on day 7', () => {
  const r = evaluateBudget(BUDGET, 1500, '2026-05-07T12:00:00Z');
  assert.equal(r.status, 'healthy');
  assert.equal(r.alertLevel, 'none');
  assert.ok(r.utilizationPct < 50);
});

test('evaluateBudget: caution when projected to overrun', () => {
  // Day 7, spent $4500 — projects to $19,800 = 198% of budget
  const r = evaluateBudget(BUDGET, 4500, '2026-05-07T12:00:00Z');
  assert.ok(['caution', 'warning'].includes(r.status));
  assert.ok(r.projectedOverrunUsd > 0);
});

test('evaluateBudget: breached at 100%+', () => {
  const r = evaluateBudget(BUDGET, 11000, '2026-05-15T12:00:00Z');
  assert.equal(r.status, 'breached');
  assert.equal(r.alertLevel, 'critical');
});

test('evaluateBudget: zero budget edge case', () => {
  const zero = { ...BUDGET, monthlyBudgetUsd: 0 };
  const r = evaluateBudget(zero, 100, '2026-05-07T12:00:00Z');
  assert.equal(r.status, 'breached');
});

test('detectAnomalies: flat series produces no anomalies', () => {
  const series = Array.from({ length: 10 }, (_, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, '0')}`,
    costUsd: 100,
  }));
  const r = detectAnomalies(series);
  assert.equal(r.anomaliesFound, 0);
});

test('detectAnomalies: spike detected as anomaly', () => {
  const series = [
    { date: '2026-05-01', costUsd: 100 },
    { date: '2026-05-02', costUsd: 102 },
    { date: '2026-05-03', costUsd: 98 },
    { date: '2026-05-04', costUsd: 101 },
    { date: '2026-05-05', costUsd: 99 },
    { date: '2026-05-06', costUsd: 103 },
    { date: '2026-05-07', costUsd: 100 },
    { date: '2026-05-08', costUsd: 850 }, // huge spike
  ];
  const r = detectAnomalies(series);
  assert.equal(r.anomaliesFound, 1);
  assert.equal(r.anomalies[0].date, '2026-05-08');
  assert.equal(r.anomalies[0].severity, 'critical');
});

test('detectAnomalies: small variation under minDelta is ignored', () => {
  const series = Array.from({ length: 8 }, (_, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, '0')}`,
    costUsd: i === 7 ? 110 : 100, // $10 above baseline; under default $50 min
  }));
  const r = detectAnomalies(series);
  assert.equal(r.anomaliesFound, 0);
});

test('detectAnomalies: insufficient data returns empty', () => {
  const r = detectAnomalies([{ date: '2026-05-01', costUsd: 100 }]);
  assert.equal(r.anomaliesFound, 0);
});

test('forecastMonthEnd: linear regression projects upward trend', () => {
  const series = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, '0')}`,
    costUsd: 100 + i * 50, // 100, 150, 200, ... 400
  }));
  const r = forecastMonthEnd({ series, monthStart: '2026-05-01', asOf: '2026-05-07T12:00:00Z' });
  assert.equal(r.forecastMethod, 'linear-regression');
  assert.ok(r.trendSlopeUsdPerDay > 40);
  // For an upward trend, forecast should exceed simple-mean projection
  assert.ok(r.forecastMonthEndUsd > r.averageDailySpendUsd * r.daysInMonth);
});

test('forecastMonthEnd: insufficient data uses simple-mean', () => {
  const series = [
    { date: '2026-05-01', costUsd: 100 },
    { date: '2026-05-02', costUsd: 110 },
  ];
  const r = forecastMonthEnd({ series, monthStart: '2026-05-01', asOf: '2026-05-02T12:00:00Z' });
  assert.equal(r.forecastMethod, 'simple-mean');
});

test('forecastMonthEnd: confidence interval contains forecast', () => {
  const series = Array.from({ length: 5 }, (_, i) => ({
    date: `2026-05-${String(i + 1).padStart(2, '0')}`,
    costUsd: 200 + Math.sin(i) * 10,
  }));
  const r = forecastMonthEnd({ series, monthStart: '2026-05-01', asOf: '2026-05-05T12:00:00Z' });
  assert.ok(r.confidenceInterval95.low <= r.forecastMonthEndUsd);
  assert.ok(r.confidenceInterval95.high >= r.forecastMonthEndUsd);
});

test('rollupChargeback: aggregates department spend correctly', () => {
  const events = [
    { eventId: 'e1', timestamp: '2026-05-01T10:00:00Z', user: 'a@x', department: 'eng', project: 'p1', modelId: 'claude-opus-4.7', provider: 'Anthropic', inputTokens: 1000, outputTokens: 500, totalCostUsd: 100 },
    { eventId: 'e2', timestamp: '2026-05-01T11:00:00Z', user: 'b@x', department: 'eng', project: 'p1', modelId: 'gpt-5', provider: 'OpenAI', inputTokens: 1000, outputTokens: 500, totalCostUsd: 50 },
    { eventId: 'e3', timestamp: '2026-05-01T12:00:00Z', user: 'c@x', department: 'support', project: 'p2', modelId: 'claude-haiku-4.5', provider: 'Anthropic', inputTokens: 5000, outputTokens: 2000, totalCostUsd: 30 },
  ];
  const r = rollupChargeback(events, '2026-05-01', '2026-05-02');
  assert.equal(r.totalEvents, 3);
  assert.equal(r.totalOrgSpendUsd, 180);
  assert.equal(r.departments.length, 2);
  assert.equal(r.departments[0].department, 'eng');
  assert.equal(r.departments[0].totalCostUsd, 150);
});

test('rollupChargeback: empty events → zero rollup', () => {
  const r = rollupChargeback([], '2026-05-01', '2026-05-02');
  assert.equal(r.totalOrgSpendUsd, 0);
  assert.equal(r.departments.length, 0);
});

test('rollupChargeback: top provider/model/project tracked', () => {
  const events = [
    { eventId: 'e1', timestamp: '2026-05-01T10:00:00Z', user: 'a@x', department: 'eng', project: 'big', modelId: 'claude-opus-4.7', provider: 'Anthropic', inputTokens: 1000, outputTokens: 500, totalCostUsd: 200 },
    { eventId: 'e2', timestamp: '2026-05-01T11:00:00Z', user: 'b@x', department: 'eng', project: 'small', modelId: 'gpt-5', provider: 'OpenAI', inputTokens: 100, outputTokens: 50, totalCostUsd: 5 },
  ];
  const r = rollupChargeback(events, '2026-05-01', '2026-05-02');
  assert.equal(r.departments[0].topProject.project, 'big');
  assert.equal(r.departments[0].topModel.modelId, 'claude-opus-4.7');
  assert.equal(r.departments[0].topProvider.provider, 'Anthropic');
});

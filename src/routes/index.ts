import { Router } from 'express';
import {
  CostInputSchema,
  CompareInputSchema,
  BudgetEvalSchema,
  AnomalyDetectSchema,
  ForecastInputSchema,
  ChargebackSchema,
} from '../schemas/validation-schemas';
import { computeCost, compareProviders, PRICING_CATALOG, findPricing } from '../governance/cost-calculator';
import { evaluateBudget } from '../governance/budget-tracker';
import { detectAnomalies } from '../governance/anomaly-detector';
import { forecastMonthEnd } from '../governance/forecaster';
import { rollupChargeback } from '../governance/chargeback';
import { BUDGETS } from '../data/budgets';
import { USAGE_EVENTS, dailyCostSeries } from '../data/usage';

export const costRouter = Router();

costRouter.post('/compute', (req, res) => {
  const parsed = CostInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues }); return; }
  try { res.json(computeCost(parsed.data)); }
  catch (err) { res.status(404).json({ error: (err as Error).message }); }
});

costRouter.post('/compare', (req, res) => {
  const parsed = CompareInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues }); return; }
  res.json({ rows: compareProviders(parsed.data) });
});

costRouter.get('/catalog', (_req, res) => {
  res.json({ catalogSize: PRICING_CATALOG.length, pricing: PRICING_CATALOG });
});

costRouter.get('/catalog/:modelId', (req, res) => {
  const p = findPricing(req.params.modelId);
  if (!p) { res.status(404).json({ error: `Model ${req.params.modelId} not found.` }); return; }
  res.json(p);
});

export const budgetsRouter = Router();

budgetsRouter.get('/', (_req, res) => {
  res.json({ budgets: BUDGETS });
});

budgetsRouter.post('/evaluate', (req, res) => {
  const parsed = BudgetEvalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues }); return; }
  res.json(evaluateBudget(parsed.data.budget, parsed.data.spentUsd, parsed.data.asOf));
});

export const insightsRouter = Router();

insightsRouter.post('/anomalies', (req, res) => {
  const parsed = AnomalyDetectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues }); return; }
  res.json(detectAnomalies(parsed.data.series, {
    windowSize: parsed.data.windowSize,
    zScoreWarn: parsed.data.zScoreWarn,
    zScoreCritical: parsed.data.zScoreCritical,
    minAbsoluteDeltaUsd: parsed.data.minAbsoluteDeltaUsd,
  }));
});

insightsRouter.post('/forecast', (req, res) => {
  const parsed = ForecastInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues }); return; }
  res.json(forecastMonthEnd(parsed.data));
});

insightsRouter.post('/chargeback', (req, res) => {
  const parsed = ChargebackSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues }); return; }
  res.json(rollupChargeback(parsed.data.events, parsed.data.windowStart, parsed.data.windowEnd));
});

export const dashboardRouter = Router();

dashboardRouter.get('/summary', (_req, res) => {
  const series = dailyCostSeries();
  const totalSpend = series.reduce((s, p) => s + p.costUsd, 0);
  const orgBudget = BUDGETS.find((b) => b.scope === 'org');
  const orgStatus = orgBudget ? evaluateBudget(orgBudget, totalSpend, '2026-05-07T16:00:00Z') : null;

  // Per-department status
  const deptSpend = new Map<string, number>();
  for (const e of USAGE_EVENTS) {
    deptSpend.set(e.department, (deptSpend.get(e.department) || 0) + e.totalCostUsd);
  }
  const deptStatus = BUDGETS
    .filter((b) => b.scope === 'department')
    .map((b) => evaluateBudget(b, deptSpend.get(b.scopeName) || 0, '2026-05-07T16:00:00Z'));

  const anomalies = detectAnomalies(series);
  const forecast = forecastMonthEnd({ series, monthStart: '2026-05-01', asOf: '2026-05-07T16:00:00Z' });
  const chargeback = rollupChargeback(USAGE_EVENTS, '2026-05-01', '2026-05-07T16:00:00Z');

  res.json({
    capturedAt: new Date().toISOString(),
    series,
    org: orgStatus,
    departments: deptStatus,
    anomalies,
    forecast,
    chargeback,
  });
});

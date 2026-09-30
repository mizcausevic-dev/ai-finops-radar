import { z } from 'zod';

export const CostInputSchema = z.object({
  modelId: z.string().min(1).max(100),
  inputTokens: z.number().int().min(0).max(1_000_000_000),
  outputTokens: z.number().int().min(0).max(1_000_000_000),
  cachedInputTokens: z.number().int().min(0).max(1_000_000_000).optional(),
});

export const CompareInputSchema = z.object({
  inputTokens: z.number().int().min(0).max(1_000_000_000),
  outputTokens: z.number().int().min(0).max(1_000_000_000),
  modelIds: z.array(z.string().min(1).max(100)).max(50).optional(),
});

export const BudgetEvalSchema = z.object({
  budget: z.object({
    budgetId: z.string().min(1).max(100),
    scope: z.enum(['org', 'department', 'project']),
    scopeName: z.string().min(1).max(100),
    monthlyBudgetUsd: z.number().min(0).max(1_000_000_000),
    startOfMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rolloverPolicy: z.enum(['reset', 'rollover']),
  }),
  spentUsd: z.number().min(0).max(1_000_000_000),
  asOf: z.string().datetime(),
});

export const SeriesPointSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  costUsd: z.number().min(0).max(1_000_000_000),
});

export const AnomalyDetectSchema = z.object({
  series: z.array(SeriesPointSchema).min(1).max(366),
  windowSize: z.number().int().min(2).optional(),
  zScoreWarn: z.number().min(0).optional(),
  zScoreCritical: z.number().min(0).optional(),
  minAbsoluteDeltaUsd: z.number().min(0).optional(),
});

export const ForecastInputSchema = z.object({
  series: z.array(SeriesPointSchema).min(1).max(31),
  monthStart: z.string().regex(/^\d{4}-\d{2}-01$/),
  asOf: z.string().datetime(),
});

const UsageEventSchema = z.object({
  eventId: z.string().min(1).max(100),
  timestamp: z.string().datetime(),
  user: z.string().min(1).max(200),
  department: z.string().min(1).max(100),
  project: z.string().min(1).max(100),
  modelId: z.string().min(1).max(100),
  provider: z.string().min(1).max(100),
  inputTokens: z.number().int().min(0).max(1_000_000_000),
  outputTokens: z.number().int().min(0).max(1_000_000_000),
  totalCostUsd: z.number().min(0).max(1_000_000_000),
});

export const ChargebackSchema = z.object({
  events: z.array(UsageEventSchema).min(1).max(500),
  windowStart: z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/),
  windowEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/),
});

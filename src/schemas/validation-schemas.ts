import { z } from 'zod';

export const CostInputSchema = z.object({
  modelId: z.string().min(1),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cachedInputTokens: z.number().int().min(0).optional(),
});

export const CompareInputSchema = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  modelIds: z.array(z.string()).optional(),
});

export const BudgetEvalSchema = z.object({
  budget: z.object({
    budgetId: z.string().min(1),
    scope: z.enum(['org', 'department', 'project']),
    scopeName: z.string().min(1),
    monthlyBudgetUsd: z.number().min(0),
    startOfMonth: z.string().min(1),
    rolloverPolicy: z.enum(['reset', 'rollover']),
  }),
  spentUsd: z.number().min(0),
  asOf: z.string().min(1),
});

export const SeriesPointSchema = z.object({
  date: z.string().min(1),
  costUsd: z.number().min(0),
});

export const AnomalyDetectSchema = z.object({
  series: z.array(SeriesPointSchema).min(1),
  windowSize: z.number().int().min(2).optional(),
  zScoreWarn: z.number().min(0).optional(),
  zScoreCritical: z.number().min(0).optional(),
  minAbsoluteDeltaUsd: z.number().min(0).optional(),
});

export const ForecastInputSchema = z.object({
  series: z.array(SeriesPointSchema).min(1),
  monthStart: z.string().min(1),
  asOf: z.string().min(1),
});

const UsageEventSchema = z.object({
  eventId: z.string().min(1),
  timestamp: z.string().min(1),
  user: z.string().min(1),
  department: z.string().min(1),
  project: z.string().min(1),
  modelId: z.string().min(1),
  provider: z.string().min(1),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  totalCostUsd: z.number().min(0),
});

export const ChargebackSchema = z.object({
  events: z.array(UsageEventSchema).min(1),
  windowStart: z.string().min(1),
  windowEnd: z.string().min(1),
});

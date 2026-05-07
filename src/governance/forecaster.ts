// Monthly cost forecasting with confidence intervals. Uses a hybrid
// approach: linear regression for trend + variance-based interval
// estimation. Good enough for "will we hit budget" decisions; not trying
// to compete with proper time-series ML.

import type { CostPoint } from './anomaly-detector';

export interface ForecastInput {
  series: CostPoint[]; // daily cost series for the month-to-date
  monthStart: string;
  asOf: string;
}

export interface ForecastOutput {
  monthStart: string;
  asOf: string;
  daysObserved: number;
  daysInMonth: number;
  daysRemaining: number;
  observedSpendUsd: number;
  averageDailySpendUsd: number;
  trendSlopeUsdPerDay: number;
  forecastMonthEndUsd: number;
  confidenceInterval95: { low: number; high: number };
  forecastMethod: 'linear-regression' | 'simple-mean';
  rationale: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / DAY_MS;
}

function totalDaysInMonth(date: string): number {
  const d = new Date(date);
  return new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0).getUTCDate();
}

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; residualStddev: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, residualStddev: 0 };
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    sumSq += (ys[i] - predicted) ** 2;
  }
  const residualStddev = Math.sqrt(sumSq / Math.max(1, n - 2));
  return { slope, intercept, residualStddev };
}

export function forecastMonthEnd(input: ForecastInput): ForecastOutput {
  const sorted = [...input.series].sort((a, b) => a.date.localeCompare(b.date));
  const daysInMonth = totalDaysInMonth(input.monthStart);
  const daysObserved = sorted.length;
  const daysRemaining = Math.max(0, daysInMonth - daysObserved);
  const observedSpendUsd = sorted.reduce((s, p) => s + p.costUsd, 0);
  const averageDailySpendUsd = daysObserved === 0 ? 0 : observedSpendUsd / daysObserved;

  // Below 4 datapoints → fall back to mean projection only
  if (daysObserved < 4) {
    const forecast = averageDailySpendUsd * daysInMonth;
    return {
      monthStart: input.monthStart,
      asOf: input.asOf,
      daysObserved,
      daysInMonth,
      daysRemaining,
      observedSpendUsd: Math.round(observedSpendUsd * 100) / 100,
      averageDailySpendUsd: Math.round(averageDailySpendUsd * 100) / 100,
      trendSlopeUsdPerDay: 0,
      forecastMonthEndUsd: Math.round(forecast * 100) / 100,
      confidenceInterval95: {
        low: Math.round(forecast * 0.85 * 100) / 100,
        high: Math.round(forecast * 1.15 * 100) / 100,
      },
      forecastMethod: 'simple-mean',
      rationale: 'Insufficient observations for trend; using mean-based projection with 15% interval.',
    };
  }

  // Linear regression on day index
  const xs = sorted.map((_, i) => i + 1);
  const ys = sorted.map((p) => p.costUsd);
  const { slope, intercept, residualStddev } = linearRegression(xs, ys);

  // Project remaining days
  let projectedRemaining = 0;
  for (let i = daysObserved + 1; i <= daysInMonth; i++) {
    projectedRemaining += Math.max(0, slope * i + intercept);
  }
  const forecast = observedSpendUsd + projectedRemaining;

  // 95% CI: ~1.96 sigma per remaining day, summed quadratically
  const intervalHalf = 1.96 * residualStddev * Math.sqrt(daysRemaining);
  const ciLow = Math.max(observedSpendUsd, forecast - intervalHalf);
  const ciHigh = forecast + intervalHalf;

  let rationale: string;
  if (slope > 0.5) {
    rationale = `Upward trend of $${slope.toFixed(2)}/day detected. Forecast assumes trend continues.`;
  } else if (slope < -0.5) {
    rationale = `Downward trend of $${Math.abs(slope).toFixed(2)}/day detected. Forecast assumes trend continues.`;
  } else {
    rationale = `Spend roughly flat. Forecast based on current rate.`;
  }

  return {
    monthStart: input.monthStart,
    asOf: input.asOf,
    daysObserved,
    daysInMonth,
    daysRemaining,
    observedSpendUsd: Math.round(observedSpendUsd * 100) / 100,
    averageDailySpendUsd: Math.round(averageDailySpendUsd * 100) / 100,
    trendSlopeUsdPerDay: Math.round(slope * 100) / 100,
    forecastMonthEndUsd: Math.round(forecast * 100) / 100,
    confidenceInterval95: {
      low: Math.round(ciLow * 100) / 100,
      high: Math.round(ciHigh * 100) / 100,
    },
    forecastMethod: 'linear-regression',
    rationale,
  };
}

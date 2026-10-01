// Illustrative monthly projection for synthetic demo data. The interval uses
// residual spread and is not a calibrated confidence or prediction interval.

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
  illustrativeRangeUsd: { low: number; high: number };
  forecastMethod: 'linear-regression' | 'simple-mean';
  rationale: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function totalDaysInMonth(date: string): number {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
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
  const monthStartMs = Date.parse(input.monthStart);
  const asOfMs = Date.parse(input.asOf);
  if (!Number.isFinite(monthStartMs) || !Number.isFinite(asOfMs) || !input.monthStart.endsWith('-01')) {
    throw new RangeError('monthStart and asOf must be valid UTC dates.');
  }
  const asOfDate = new Date(asOfMs).toISOString().slice(0, 10);
  const daysElapsed = Math.floor((Date.parse(asOfDate) - monthStartMs) / DAY_MS) + 1;
  const daysInMonth = totalDaysInMonth(input.monthStart);
  if (daysElapsed < 1 || daysElapsed > daysInMonth || sorted.length !== daysElapsed) {
    throw new RangeError('series must include one point per day from monthStart through asOf.');
  }
  for (let i = 0; i < sorted.length; i++) {
    const expectedDate = new Date(monthStartMs + i * DAY_MS).toISOString().slice(0, 10);
    if (sorted[i].date !== expectedDate) {
      throw new RangeError('series must include one point per day from monthStart through asOf.');
    }
  }
  const daysObserved = daysElapsed;
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
      illustrativeRangeUsd: {
        low: Math.round(forecast * 0.85 * 100) / 100,
        high: Math.round(forecast * 1.15 * 100) / 100,
      },
      forecastMethod: 'simple-mean',
      rationale: 'Insufficient observations for trend; using mean-based projection with an illustrative 15% range.',
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

  // Heuristic display range. It is not statistically calibrated for coverage.
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
    illustrativeRangeUsd: {
      low: Math.round(ciLow * 100) / 100,
      high: Math.round(ciHigh * 100) / 100,
    },
    forecastMethod: 'linear-regression',
    rationale,
  };
}

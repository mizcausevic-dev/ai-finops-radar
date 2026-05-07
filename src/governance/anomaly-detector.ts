// Daily-cost anomaly detection. Uses rolling-window statistics (mean +
// stddev) to flag spend points that exceed normal variance. Designed for
// daily-grain time series; can be reused with hourly grain by feeding a
// 7d-of-hours window.

export interface CostPoint {
  date: string; // ISO date YYYY-MM-DD
  costUsd: number;
}

export type AnomalySeverity = 'info' | 'warn' | 'critical';

export interface Anomaly {
  date: string;
  costUsd: number;
  expectedUsd: number;
  deltaUsd: number;
  zScore: number;
  pctOverExpected: number;
  severity: AnomalySeverity;
  rationale: string;
}

export interface AnomalyDetectionResult {
  windowSize: number;
  anomaliesFound: number;
  anomalies: Anomaly[];
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[], avg: number): number {
  if (xs.length <= 1) return 0;
  const variance = xs.reduce((s, x) => s + Math.pow(x - avg, 2), 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export interface DetectAnomaliesOptions {
  windowSize?: number;
  zScoreWarn?: number;
  zScoreCritical?: number;
  minAbsoluteDeltaUsd?: number;
}

export function detectAnomalies(series: CostPoint[], options: DetectAnomaliesOptions = {}): AnomalyDetectionResult {
  const windowSize = options.windowSize ?? 7;
  const zScoreWarn = options.zScoreWarn ?? 2;
  const zScoreCritical = options.zScoreCritical ?? 3;
  const minDelta = options.minAbsoluteDeltaUsd ?? 50;

  const anomalies: Anomaly[] = [];

  if (series.length < windowSize + 1) {
    return { windowSize, anomaliesFound: 0, anomalies };
  }

  // Sort by date ascending
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));

  for (let i = windowSize; i < sorted.length; i++) {
    const window = sorted.slice(i - windowSize, i).map((p) => p.costUsd);
    const avg = mean(window);
    const sd = stddev(window, avg);
    const point = sorted[i];
    const delta = point.costUsd - avg;

    // Skip cases where stddev is effectively zero AND the window is uniform
    // (avoids div-by-zero on perfectly flat baselines)
    const z = sd === 0 ? (delta === 0 ? 0 : Infinity) : delta / sd;

    if (Math.abs(delta) < minDelta) continue;
    if (Math.abs(z) < zScoreWarn) continue;

    let severity: AnomalySeverity;
    if (Math.abs(z) >= zScoreCritical || delta >= avg * 2) {
      severity = 'critical';
    } else if (Math.abs(z) >= zScoreWarn) {
      severity = 'warn';
    } else {
      severity = 'info';
    }

    const pctOverExpected = avg === 0 ? 0 : Math.round((delta / avg) * 1000) / 10;

    let rationale: string;
    if (delta > 0) {
      rationale = `Spend $${point.costUsd.toFixed(2)} is ${pctOverExpected.toFixed(1)}% over rolling-${windowSize}d mean of $${avg.toFixed(2)} (z=${z.toFixed(2)}).`;
    } else {
      rationale = `Spend $${point.costUsd.toFixed(2)} is ${Math.abs(pctOverExpected).toFixed(1)}% under rolling mean (z=${z.toFixed(2)}); investigate if workload outage.`;
    }

    anomalies.push({
      date: point.date,
      costUsd: Math.round(point.costUsd * 100) / 100,
      expectedUsd: Math.round(avg * 100) / 100,
      deltaUsd: Math.round(delta * 100) / 100,
      zScore: Number.isFinite(z) ? Math.round(z * 100) / 100 : 99,
      pctOverExpected,
      severity,
      rationale,
    });
  }

  return {
    windowSize,
    anomaliesFound: anomalies.length,
    anomalies,
  };
}

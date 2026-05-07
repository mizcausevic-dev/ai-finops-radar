// Budget tracking with burn-down and tiered threshold alerts. The unit a
// CFO actually wants: "are we on track for our monthly AI spend, and if
// not, which department blew through the threshold first?"

export interface Budget {
  budgetId: string;
  scope: 'org' | 'department' | 'project';
  scopeName: string;
  monthlyBudgetUsd: number;
  startOfMonth: string; // ISO date
  rolloverPolicy: 'reset' | 'rollover';
}

export interface BudgetStatus {
  budgetId: string;
  scopeName: string;
  monthlyBudgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  utilizationPct: number;
  daysElapsed: number;
  daysRemaining: number;
  burnRatePerDay: number;
  projectedMonthEndUsd: number;
  projectedOverrunUsd: number;
  status: 'healthy' | 'caution' | 'warning' | 'breached';
  alertLevel: 'none' | 'info' | 'warn' | 'critical';
  recommendedAction: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  return Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS);
}

function daysInMonth(date: string): number {
  const d = new Date(date);
  return new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0).getUTCDate();
}

export function evaluateBudget(budget: Budget, spentUsd: number, asOf: string): BudgetStatus {
  const daysElapsed = daysBetween(budget.startOfMonth, asOf);
  const totalDays = daysInMonth(budget.startOfMonth);
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  const burnRatePerDay = daysElapsed > 0 ? spentUsd / daysElapsed : 0;
  const projectedMonthEndUsd = burnRatePerDay * totalDays;
  const projectedOverrunUsd = Math.max(0, projectedMonthEndUsd - budget.monthlyBudgetUsd);

  const utilizationPct = budget.monthlyBudgetUsd === 0
    ? (spentUsd > 0 ? 999 : 0)
    : Math.round((spentUsd / budget.monthlyBudgetUsd) * 1000) / 10;
  const remainingUsd = budget.monthlyBudgetUsd - spentUsd;

  // Status bands — combine current util AND projected overrun
  let status: BudgetStatus['status'];
  let alertLevel: BudgetStatus['alertLevel'];
  let recommendedAction: string;

  if (utilizationPct >= 100) {
    status = 'breached';
    alertLevel = 'critical';
    recommendedAction = `Budget breached. Notify finance + scope owner; pause non-essential workloads; request budget revision of $${projectedOverrunUsd.toFixed(2)}.`;
  } else if (utilizationPct >= 90 || projectedMonthEndUsd > budget.monthlyBudgetUsd * 1.15) {
    status = 'warning';
    alertLevel = 'critical';
    recommendedAction = `Projected overrun of $${projectedOverrunUsd.toFixed(2)}. Identify cost-driver workloads; switch to cheaper models for non-critical paths.`;
  } else if (utilizationPct >= 75 || projectedMonthEndUsd > budget.monthlyBudgetUsd) {
    status = 'caution';
    alertLevel = 'warn';
    recommendedAction = `On pace to exceed budget by $${projectedOverrunUsd.toFixed(2)}. Schedule cost review with scope owner this week.`;
  } else {
    status = 'healthy';
    alertLevel = 'none';
    recommendedAction = 'On track. No action required.';
  }

  return {
    budgetId: budget.budgetId,
    scopeName: budget.scopeName,
    monthlyBudgetUsd: budget.monthlyBudgetUsd,
    spentUsd: Math.round(spentUsd * 100) / 100,
    remainingUsd: Math.round(remainingUsd * 100) / 100,
    utilizationPct,
    daysElapsed: Math.round(daysElapsed * 10) / 10,
    daysRemaining: Math.round(daysRemaining * 10) / 10,
    burnRatePerDay: Math.round(burnRatePerDay * 100) / 100,
    projectedMonthEndUsd: Math.round(projectedMonthEndUsd * 100) / 100,
    projectedOverrunUsd: Math.round(projectedOverrunUsd * 100) / 100,
    status,
    alertLevel,
    recommendedAction,
  };
}

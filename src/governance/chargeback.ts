// Department-level chargeback. Aggregates per-call cost into the unit
// that finance actually invoices on: which department spent how much,
// across which providers, on what use cases.

export interface UsageEvent {
  eventId: string;
  timestamp: string;
  user: string;
  department: string;
  project: string;
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
}

export interface DepartmentChargeback {
  department: string;
  totalCostUsd: number;
  totalTokens: number;
  eventCount: number;
  uniqueUsers: number;
  uniqueProviders: number;
  uniqueProjects: number;
  topProvider: { provider: string; costUsd: number };
  topModel: { modelId: string; costUsd: number };
  topProject: { project: string; costUsd: number };
  costPer1kTokens: number;
  share: number; // % of total org spend
}

export interface ChargebackRollup {
  totalOrgSpendUsd: number;
  totalEvents: number;
  windowStart: string;
  windowEnd: string;
  departments: DepartmentChargeback[];
}

function topByValue<T extends Record<string, number>>(map: Map<string, number>, valueKey: string): { [K in keyof T]: T[K] } | { [k: string]: any; costUsd: number } {
  let topName = '';
  let topCost = -1;
  for (const [k, v] of map.entries()) {
    if (v > topCost) {
      topName = k;
      topCost = v;
    }
  }
  return { [valueKey]: topName, costUsd: Math.round(topCost * 100) / 100 } as any;
}

export function rollupChargeback(events: UsageEvent[], windowStart: string, windowEnd: string): ChargebackRollup {
  if (events.length === 0) {
    return { totalOrgSpendUsd: 0, totalEvents: 0, windowStart, windowEnd, departments: [] };
  }

  const totalOrgSpendUsd = events.reduce((s, e) => s + e.totalCostUsd, 0);
  const buckets = new Map<string, {
    department: string;
    totalCostUsd: number;
    totalTokens: number;
    eventCount: number;
    users: Set<string>;
    projects: Set<string>;
    providers: Set<string>;
    providerCosts: Map<string, number>;
    modelCosts: Map<string, number>;
    projectCosts: Map<string, number>;
  }>();

  for (const e of events) {
    const cur = buckets.get(e.department) || {
      department: e.department,
      totalCostUsd: 0,
      totalTokens: 0,
      eventCount: 0,
      users: new Set<string>(),
      projects: new Set<string>(),
      providers: new Set<string>(),
      providerCosts: new Map<string, number>(),
      modelCosts: new Map<string, number>(),
      projectCosts: new Map<string, number>(),
    };
    cur.totalCostUsd += e.totalCostUsd;
    cur.totalTokens += e.inputTokens + e.outputTokens;
    cur.eventCount++;
    cur.users.add(e.user);
    cur.projects.add(e.project);
    cur.providers.add(e.provider);
    cur.providerCosts.set(e.provider, (cur.providerCosts.get(e.provider) || 0) + e.totalCostUsd);
    cur.modelCosts.set(e.modelId, (cur.modelCosts.get(e.modelId) || 0) + e.totalCostUsd);
    cur.projectCosts.set(e.project, (cur.projectCosts.get(e.project) || 0) + e.totalCostUsd);
    buckets.set(e.department, cur);
  }

  const departments: DepartmentChargeback[] = [];
  for (const b of buckets.values()) {
    const topProvider = topByValue(b.providerCosts, 'provider') as { provider: string; costUsd: number };
    const topModel = topByValue(b.modelCosts, 'modelId') as { modelId: string; costUsd: number };
    const topProject = topByValue(b.projectCosts, 'project') as { project: string; costUsd: number };
    const costPer1kTokens = b.totalTokens === 0 ? 0 : Math.round((b.totalCostUsd / b.totalTokens) * 1000 * 100000) / 100000;
    const share = totalOrgSpendUsd === 0 ? 0 : Math.round((b.totalCostUsd / totalOrgSpendUsd) * 1000) / 10;

    departments.push({
      department: b.department,
      totalCostUsd: Math.round(b.totalCostUsd * 100) / 100,
      totalTokens: b.totalTokens,
      eventCount: b.eventCount,
      uniqueUsers: b.users.size,
      uniqueProviders: b.providers.size,
      uniqueProjects: b.projects.size,
      topProvider,
      topModel,
      topProject,
      costPer1kTokens,
      share,
    });
  }

  departments.sort((a, b) => b.totalCostUsd - a.totalCostUsd);

  return {
    totalOrgSpendUsd: Math.round(totalOrgSpendUsd * 100) / 100,
    totalEvents: events.length,
    windowStart,
    windowEnd,
    departments,
  };
}

import type { Budget } from '../governance/budget-tracker';

export const BUDGETS: Budget[] = [
  { budgetId: 'b_org_2026_05', scope: 'org', scopeName: 'Org Total', monthlyBudgetUsd: 50000, startOfMonth: '2026-05-01', rolloverPolicy: 'reset' },
  { budgetId: 'b_eng_2026_05', scope: 'department', scopeName: 'engineering', monthlyBudgetUsd: 18000, startOfMonth: '2026-05-01', rolloverPolicy: 'reset' },
  { budgetId: 'b_data_2026_05', scope: 'department', scopeName: 'data-platform', monthlyBudgetUsd: 12000, startOfMonth: '2026-05-01', rolloverPolicy: 'reset' },
  { budgetId: 'b_product_2026_05', scope: 'department', scopeName: 'product', monthlyBudgetUsd: 8000, startOfMonth: '2026-05-01', rolloverPolicy: 'reset' },
  { budgetId: 'b_support_2026_05', scope: 'department', scopeName: 'support', monthlyBudgetUsd: 6000, startOfMonth: '2026-05-01', rolloverPolicy: 'reset' },
  { budgetId: 'b_marketing_2026_05', scope: 'department', scopeName: 'marketing', monthlyBudgetUsd: 4000, startOfMonth: '2026-05-01', rolloverPolicy: 'reset' },
  { budgetId: 'b_sales_2026_05', scope: 'department', scopeName: 'sales', monthlyBudgetUsd: 2000, startOfMonth: '2026-05-01', rolloverPolicy: 'reset' },
];

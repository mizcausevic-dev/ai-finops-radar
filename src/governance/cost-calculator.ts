// Provider pricing catalog (per 1M tokens, USD). Reflects published list
// pricing as of mid-2026. In production this would be configurable per-org
// (volume discounts, committed-spend deals, regional surcharges).

export interface PriceEntry {
  provider: string;
  modelId: string;
  modelDisplayName: string;
  tier: 'frontier' | 'mainstream' | 'small' | 'embedding';
  inputUsdPer1M: number;
  outputUsdPer1M: number;
  cachedInputUsdPer1M?: number;
  capabilities: string[];
  contextWindow: number;
}

export const PRICING_CATALOG: PriceEntry[] = [
  // Anthropic
  { provider: 'Anthropic', modelId: 'claude-opus-4.7', modelDisplayName: 'Claude Opus 4.7', tier: 'frontier', inputUsdPer1M: 15.0, outputUsdPer1M: 75.0, cachedInputUsdPer1M: 1.50, capabilities: ['chat', 'reasoning', 'vision', 'agent'], contextWindow: 200000 },
  { provider: 'Anthropic', modelId: 'claude-sonnet-4.6', modelDisplayName: 'Claude Sonnet 4.6', tier: 'mainstream', inputUsdPer1M: 3.0, outputUsdPer1M: 15.0, cachedInputUsdPer1M: 0.30, capabilities: ['chat', 'reasoning', 'vision'], contextWindow: 200000 },
  { provider: 'Anthropic', modelId: 'claude-haiku-4.5', modelDisplayName: 'Claude Haiku 4.5', tier: 'small', inputUsdPer1M: 0.80, outputUsdPer1M: 4.0, cachedInputUsdPer1M: 0.08, capabilities: ['chat', 'vision'], contextWindow: 200000 },

  // OpenAI
  { provider: 'OpenAI', modelId: 'gpt-5', modelDisplayName: 'GPT-5', tier: 'frontier', inputUsdPer1M: 12.0, outputUsdPer1M: 48.0, cachedInputUsdPer1M: 1.20, capabilities: ['chat', 'reasoning', 'vision', 'agent'], contextWindow: 256000 },
  { provider: 'OpenAI', modelId: 'gpt-5-mini', modelDisplayName: 'GPT-5 Mini', tier: 'mainstream', inputUsdPer1M: 2.50, outputUsdPer1M: 10.0, capabilities: ['chat', 'reasoning'], contextWindow: 128000 },
  { provider: 'OpenAI', modelId: 'gpt-4o-mini', modelDisplayName: 'GPT-4o Mini', tier: 'small', inputUsdPer1M: 0.15, outputUsdPer1M: 0.60, capabilities: ['chat', 'vision'], contextWindow: 128000 },
  { provider: 'OpenAI', modelId: 'text-embedding-3-large', modelDisplayName: 'Text Embedding 3 Large', tier: 'embedding', inputUsdPer1M: 0.13, outputUsdPer1M: 0.0, capabilities: ['embedding'], contextWindow: 8192 },

  // Google
  { provider: 'Google', modelId: 'gemini-2.5-pro', modelDisplayName: 'Gemini 2.5 Pro', tier: 'frontier', inputUsdPer1M: 7.0, outputUsdPer1M: 28.0, capabilities: ['chat', 'reasoning', 'vision', 'agent'], contextWindow: 1000000 },
  { provider: 'Google', modelId: 'gemini-2.5-flash', modelDisplayName: 'Gemini 2.5 Flash', tier: 'mainstream', inputUsdPer1M: 0.30, outputUsdPer1M: 2.50, capabilities: ['chat', 'vision'], contextWindow: 1000000 },

  // AWS Bedrock
  { provider: 'AWS Bedrock', modelId: 'bedrock-claude-sonnet-4.6', modelDisplayName: 'Claude Sonnet 4.6 (Bedrock)', tier: 'mainstream', inputUsdPer1M: 3.30, outputUsdPer1M: 16.5, capabilities: ['chat', 'reasoning', 'vision'], contextWindow: 200000 },
  { provider: 'AWS Bedrock', modelId: 'bedrock-llama-3.3-70b', modelDisplayName: 'Llama 3.3 70B (Bedrock)', tier: 'mainstream', inputUsdPer1M: 0.72, outputUsdPer1M: 0.72, capabilities: ['chat'], contextWindow: 128000 },

  // Cohere
  { provider: 'Cohere', modelId: 'command-r-plus', modelDisplayName: 'Command R+', tier: 'mainstream', inputUsdPer1M: 2.50, outputUsdPer1M: 10.0, capabilities: ['chat', 'rag'], contextWindow: 128000 },
  { provider: 'Cohere', modelId: 'embed-v4', modelDisplayName: 'Embed v4', tier: 'embedding', inputUsdPer1M: 0.10, outputUsdPer1M: 0.0, capabilities: ['embedding'], contextWindow: 4096 },

  // Mistral
  { provider: 'Mistral', modelId: 'mistral-large-2', modelDisplayName: 'Mistral Large 2', tier: 'mainstream', inputUsdPer1M: 2.0, outputUsdPer1M: 6.0, capabilities: ['chat', 'reasoning'], contextWindow: 128000 },

  // Inference hosts
  { provider: 'Together AI', modelId: 'together-llama-3.3-70b', modelDisplayName: 'Llama 3.3 70B (Together)', tier: 'mainstream', inputUsdPer1M: 0.88, outputUsdPer1M: 0.88, capabilities: ['chat'], contextWindow: 128000 },
  { provider: 'Groq', modelId: 'groq-llama-3.3-70b', modelDisplayName: 'Llama 3.3 70B (Groq)', tier: 'mainstream', inputUsdPer1M: 0.59, outputUsdPer1M: 0.79, capabilities: ['chat'], contextWindow: 128000 },
  { provider: 'Fireworks', modelId: 'fireworks-deepseek-v3', modelDisplayName: 'DeepSeek V3 (Fireworks)', tier: 'mainstream', inputUsdPer1M: 0.90, outputUsdPer1M: 0.90, capabilities: ['chat', 'reasoning'], contextWindow: 128000 },
];

export function findPricing(modelId: string): PriceEntry | undefined {
  return PRICING_CATALOG.find((p) => p.modelId === modelId);
}

export interface CostInput {
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export interface CostBreakdown {
  modelId: string;
  provider: string;
  inputCostUsd: number;
  outputCostUsd: number;
  cachedInputCostUsd: number;
  totalCostUsd: number;
  totalTokens: number;
  effectiveRateUsdPer1k: number;
}

export function computeCost(input: CostInput): CostBreakdown {
  const pricing = findPricing(input.modelId);
  if (!pricing) {
    throw new Error(`Unknown model: ${input.modelId}. Add it to the pricing catalog.`);
  }

  const cachedTokens = input.cachedInputTokens ?? 0;
  const billableInputTokens = Math.max(0, input.inputTokens - cachedTokens);

  const inputCostUsd = (billableInputTokens / 1_000_000) * pricing.inputUsdPer1M;
  const outputCostUsd = (input.outputTokens / 1_000_000) * pricing.outputUsdPer1M;
  const cachedRate = pricing.cachedInputUsdPer1M ?? pricing.inputUsdPer1M;
  const cachedInputCostUsd = (cachedTokens / 1_000_000) * cachedRate;

  const totalCostUsd = inputCostUsd + outputCostUsd + cachedInputCostUsd;
  const totalTokens = input.inputTokens + input.outputTokens;
  const effectiveRateUsdPer1k = totalTokens === 0 ? 0 : (totalCostUsd / totalTokens) * 1000;

  return {
    modelId: input.modelId,
    provider: pricing.provider,
    inputCostUsd: Math.round(inputCostUsd * 1_000_000) / 1_000_000,
    outputCostUsd: Math.round(outputCostUsd * 1_000_000) / 1_000_000,
    cachedInputCostUsd: Math.round(cachedInputCostUsd * 1_000_000) / 1_000_000,
    totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
    totalTokens,
    effectiveRateUsdPer1k: Math.round(effectiveRateUsdPer1k * 100_000) / 100_000,
  };
}

// Multi-provider quick comparison for the same workload
export interface ComparisonRow {
  provider: string;
  modelId: string;
  displayName: string;
  tier: PriceEntry['tier'];
  totalCostUsd: number;
  vsBaselinePct: number;
}

export function compareProviders(input: { inputTokens: number; outputTokens: number; modelIds?: string[] }): ComparisonRow[] {
  const candidates = input.modelIds && input.modelIds.length > 0
    ? PRICING_CATALOG.filter((p) => input.modelIds!.includes(p.modelId))
    : PRICING_CATALOG.filter((p) => p.tier !== 'embedding');

  if (candidates.length === 0) return [];

  const rows = candidates.map((c) => {
    const cost = computeCost({ modelId: c.modelId, inputTokens: input.inputTokens, outputTokens: input.outputTokens });
    return {
      provider: c.provider,
      modelId: c.modelId,
      displayName: c.modelDisplayName,
      tier: c.tier,
      totalCostUsd: cost.totalCostUsd,
      vsBaselinePct: 0,
    };
  });

  // Baseline = lowest cost in the candidate set
  const min = Math.min(...rows.map((r) => r.totalCostUsd));
  for (const r of rows) {
    r.vsBaselinePct = min === 0 ? 0 : Math.round(((r.totalCostUsd - min) / min) * 1000) / 10;
  }

  return rows.sort((a, b) => a.totalCostUsd - b.totalCostUsd);
}

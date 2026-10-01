# Permissioned reconciliation intake

**Status: input contract only.** The application currently runs on synthetic usage and illustrative prices. No provider usage export, invoice, contract rate sheet, live connector, or real reconciliation has been supplied or verified. Do not use its totals for billing, purchasing, or production chargeback.

## Minimum evidence for one local pilot

Provide **one permissioned, redacted usage export and its matching invoice or effective contract rate sheet for the same billing period**. The owner should confirm the provider account or workspace and the right to use the data for this local analysis. Keep originals outside Git, the web preview, and issue or PR attachments.

| Evidence | Required fields | Why |
| --- | --- | --- |
| Usage export | Source/provider, stable account or workspace key, service start and end time with timezone, model/SKU, billable input/output/cached units where applicable, unit definition, currency, and provider-reported cost or line-item reference. | Establish coverage and avoid treating raw tokens as billed units. |
| Invoice | Invoice ID, provider/account, service period, currency, line-item SKU and amount, subtotal, discounts/credits, tax, and total. | Reconcile usage-derived amounts to the actual bill while keeping tax and credits separate. |
| Contract rate sheet, if invoice detail is insufficient | Model/SKU, unit price, currency, effective dates, tier/commitment terms, cache pricing, discounts, and rounding rule. | Explain the amount that should have been charged for that period. |

Do not include prompt or response text, API keys, session tokens, signed URLs, customer names, user email addresses, or unnecessary employee identifiers. Use pseudonymous project/account keys where a grouping key is necessary. If the provider export cannot be redacted without breaking reconciliation, stop and decide a controlled environment and retention period before transfer.

## Matching and fail-closed rules

1. Confirm the usage and billing records refer to the **same provider account, service period, timezone, and currency**. Record any invoice issue date separately from the service period.
2. Preserve raw source rows and their source filenames locally. Normalize model aliases/SKUs through an explicit mapping table; an unknown SKU stays unmatched and cannot receive an illustrative catalog rate.
3. Recompute each supported line with the contract's effective rate and units. Keep cached input, output, committed-use discounts, credits, tax, and currency conversion as separate components. Do not silently substitute the repository's sample price catalog.
4. Compare provider-reported usage cost, recomputed cost, invoice subtotal, and invoice total. Record row counts, unmatched rows, duplicate identifiers, missing days, excluded non-usage charges, and absolute/percentage variance. Define a tolerance from the actual contract and provider rounding rule before evaluating results.
5. If coverage, identity, rate provenance, or variance cannot be explained, label the run **unreconciled**. Do not publish a savings, chargeback, or invoice-accuracy claim.

## Acceptance and custody

The pilot is complete only when an authorized owner approves the redacted input scope, a reproducible local run produces a discrepancy ledger, every billed line is matched or explicitly excluded, and a second reviewer checks material differences. Delete local sensitive source copies on the agreed schedule; retain only a permissioned, minimized evidence packet. No upload, hosted ingest, or external deployment is part of this intake contract.

Until these inputs exist, the current draft PR and API remain **fixture-only**. Its existing sample catalog and heuristic forecasts are demonstrations, not verified provider or contract prices.

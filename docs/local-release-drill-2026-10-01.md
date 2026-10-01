# Local fixture release drill — 2026-10-01

**Disposition:** The loopback synthetic demo's candidate/rollback process swap passed. Production remains blocked. This drill used no provider account, customer usage, invoice, public origin, or production credentials.

## Artifacts and target

- Review branch: `review/2026-09-29-release-readiness`; prior review head: `ba51c3e5649408c676dab734a369e16cf7dd1952`.
- Candidate: the review branch with the local-only runtime boundary change, built with `npm.cmd run build`.
- Prior artifact: `git archive HEAD` of the prior review head extracted to `C:\Users\chaus\Documents\Codex\repos\.finops-drill-2026-10-01\baseline`, installed with its locked dependencies and built independently.
- Target: Node process bound to `127.0.0.1:31945` for the final rehearsal. This was local, not a hosted environment.

## Executed checks

| Check | Result |
| --- | --- |
| Candidate `npm.cmd test` | Exit 0; 42/42 tests passed, including Host/proxy denial, explicit local opt-in, production-start refusal, and invalid-port refusal. |
| Candidate `npm.cmd run build` | Exit 0. |
| Candidate `npm.cmd audit --audit-level=moderate --cache C:/Users/chaus/Documents/Codex/repos/.finops-drill-2026-10-01/npm-cache` | Exit 0; zero reported vulnerabilities. |
| Candidate `npm.cmd audit --omit=dev --audit-level=moderate --cache C:/Users/chaus/Documents/Codex/repos/.finops-drill-2026-10-01/npm-cache` | Exit 0; zero reported vulnerabilities. |
| Candidate `gitleaks dir . --no-banner --redact` | Exit 0; no findings in its reported 162.93 KB directory scan. No known-positive control was run. |
| Candidate `git -c safe.directory=C:/Users/chaus/Documents/Codex/repos/ai-finops-radar diff --check` | Exit 0. |
| Prior artifact `npm.cmd ci --ignore-scripts --cache C:/Users/chaus/Documents/Codex/repos/.finops-drill-2026-10-01/npm-cache --prefer-offline` | Exit 0; 127 packages installed, zero reported vulnerabilities. |
| Prior artifact `npm.cmd run build` | Exit 0. |

The first baseline `npm.cmd ci --ignore-scripts --offline` attempt could not read the default npm cache (`EPERM`). The isolated-cache retry above succeeded. That failed attempt is not counted as an install pass.

## Process swap and rollback observation

1. Started the rebuilt candidate with explicit local-demo opt-in on port 31945. `/health` and `/api/dashboard/summary` returned HTTP 200. Summary reported `dataMode: synthetic-demo`; both responses had `Cache-Control: no-store`. A request with `Host: localhost:31945` and `X-Forwarded-Host: public.example` returned HTTP 403.
2. Stopped candidate PID 30700. Started the archived prior artifact on the same port. The same two routes returned HTTP 200 and the same synthetic data mode. Its responses lacked `no-store`, consistent with the prior source and confirming the old artifact was running.
3. Stopped prior-artifact PID 42056. `Get-NetTCPConnection -LocalPort 31945,31946 -State Listen` returned zero listeners.
4. Started the compiled candidate with `NODE_ENV=development` but no `FINOPS_LOCAL_FIXTURE` opt-in, and again with `NODE_ENV=production`. Each exited 1 with the expected fixture-only refusal before serving.

The baseline is the **previous review commit**, not a proven last-good production artifact. No public endpoint, live identity/tenant control, invoice reconciliation, monitoring, or production rollback was verified. The [permissioned reconciliation intake](reconciliation-intake.md) remains unmet because matching authorized billing evidence is unavailable.

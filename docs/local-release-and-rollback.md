# Local fixture release and rollback

This runbook applies only to the loopback synthetic demo. There is no configured production target, authenticated data ingestion, provider billing source, or approved finance use. Startup requires explicit `NODE_ENV=development` and `FINOPS_LOCAL_FIXTURE=1`; production or missing mode/opt-in refuses startup. Do not expose the API through a reverse proxy or load real usage/invoice data.

## Candidate rehearsal

1. From a clean review branch, record the commit, lockfile, `git status`, and the prior runnable artifact path. Keep that prior artifact intact.
2. Run `npm ci --ignore-scripts`, `npm run build`, and `npm test`. Review dependency/security results and the diff. The built server also reads `dashboard-preview/index.html` and `dashboard-preview/preview.js` at runtime; keep those files with the artifact.
3. With a free local port, run this in a private PowerShell shell:

   ```powershell
   $env:PORT = '3101'
   $env:NODE_ENV = 'development'
   $env:FINOPS_LOCAL_FIXTURE = '1'
   node .\dist\index.js
   ```
4. From the same machine, query `http://127.0.0.1:3101/health` and `http://127.0.0.1:3101/api/dashboard/summary`. Require HTTP 200, `dataMode: synthetic-demo` on the summary, and `Cache-Control: no-store`. A request carrying a non-local Host or any proxy-forwarding header must return HTTP 403. This header check does not make a reverse-proxy deployment safe.
5. Stop the candidate process. Record its port and process ID. Do not leave a background listener running.

## Rollback rehearsal

1. Start the previously saved artifact on the same loopback port with the same local-only configuration. Do not overwrite its files with the candidate build.
2. Require `/health` HTTP 200 and the expected prior fixture behavior. Stop the prior process after the check.
3. If either candidate or prior artifact fails, keep the new release blocked and retain the command output. Restore the known working local artifact before continuing.

The actual deployment target, identity/tenant boundary, input custody, monitoring, backup, and production rollback mechanism must be designed and verified before a production release. [Reconciliation intake](reconciliation-intake.md) names the billing evidence required for any real financial result.

import express from 'express';
import helmet from 'helmet';
import { readFileSync } from 'fs';
import path from 'path';
import { env } from './config/env';
import { isLocalHostHeader } from './config/runtime-boundary';
import { costRouter, budgetsRouter, insightsRouter, dashboardRouter } from './routes/index';

export const app = express();
const startedAt = Date.now();
const previewHtml = readFileSync(path.join(__dirname, '..', 'dashboard-preview', 'index.html'), 'utf8');
const previewScript = readFileSync(path.join(__dirname, '..', 'dashboard-preview', 'preview.js'), 'utf8');

app.use(helmet());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isLocalHostHeader(req.headers.host)) {
    res.status(403).json({ error: 'Local fixture demo only' });
    return;
  }
  next();
});
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-finops-radar',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    nodeEnv: env.nodeEnv,
  });
});

app.get('/preview', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(previewHtml);
});
app.get('/preview.js', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.type('js').send(previewScript);
});

app.use('/api/cost', costRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const type = typeof err === 'object' && err !== null && 'type' in err ? String(err.type) : '';
  if (type === 'entity.too.large') { res.status(413).json({ error: 'Request body too large' }); return; }
  if (type === 'entity.parse.failed') { res.status(400).json({ error: 'Invalid JSON' }); return; }
  res.status(500).json({ error: 'Internal error' });
});

if (require.main === module) {
  app.listen(env.port, '127.0.0.1', () => {
    // eslint-disable-next-line no-console
    console.log(`ai-finops-radar listening on :${env.port}`);
  });
}

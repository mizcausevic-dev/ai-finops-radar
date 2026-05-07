import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { costRouter, budgetsRouter, insightsRouter, dashboardRouter } from './routes/index';

export const app = express();
const startedAt = Date.now();

app.use(helmet());
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json({ limit: '8mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-finops-radar',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    nodeEnv: env.nodeEnv,
  });
});

app.use('/api/cost', costRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });

if (require.main === module) {
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`ai-finops-radar listening on :${env.port}`);
  });
}

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import request from 'supertest';
import { app } from '../src/index';

let server: Server;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
});
after(() => server.close());

test('dashboard summary labels its fixture and reconciles chargeback shares', async () => {
  const response = await request(server).get('/api/dashboard/summary');
  assert.equal(response.status, 200);
  assert.equal(response.body.dataMode, 'synthetic-demo');
  assert.equal(response.body.fixtureAsOf, '2026-05-07T16:00:00Z');
  assert.equal(response.body.chargeback.totalOrgSpendUsd, 560.1);
  const shares = response.body.chargeback.departments.reduce((sum: number, row: { share: number }) => sum + row.share, 0);
  assert.ok(Math.abs(shares - 100) <= 0.2);
  assert.equal(response.body.forecast.illustrativeRangeUsd.low <= response.body.forecast.forecastMonthEndUsd, true);
});

test('preview serves the API-backed synthetic fixture console', async () => {
  const response = await request(server).get('/preview');
  assert.equal(response.status, 200);
  assert.match(response.text, /SYNTHETIC FIXTURE/);
  assert.match(response.text, /\/preview\.js/);
});

test('compute endpoint rejects cached-token overcount', async () => {
  const response = await request(server).post('/api/cost/compute').send({
    modelId: 'claude-haiku-4.5', inputTokens: 10, outputTokens: 0, cachedInputTokens: 11,
  });
  assert.equal(response.status, 400);
});

test('forecast endpoint rejects an incomplete daily series', async () => {
  const response = await request(server).post('/api/insights/forecast').send({
    series: [{ date: '2026-05-01', costUsd: 10 }],
    monthStart: '2026-05-01', asOf: '2026-05-02T12:00:00Z',
  });
  assert.equal(response.status, 400);
});

test('request body limit rejects oversized input', async () => {
  const response = await request(server).post('/api/cost/compute').send({
    modelId: 'claude-haiku-4.5', inputTokens: 1, outputTokens: 1, extra: 'x'.repeat(270_000),
  });
  assert.equal(response.status, 413);
});

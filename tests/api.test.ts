import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { app } from '../src/index';

let server: Server;
let baseUrl: string;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const get = (path: string) => fetch(new URL(path, baseUrl));
const post = (path: string, body: unknown) => fetch(new URL(path, baseUrl), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

test('dashboard summary labels its fixture and reconciles chargeback shares', async () => {
  const response = await get('/api/dashboard/summary');
  assert.equal(response.status, 200);
  const body = await response.json() as {
    dataMode: string;
    fixtureAsOf: string;
    chargeback: { totalOrgSpendUsd: number; departments: { share: number }[] };
    forecast: { illustrativeRangeUsd: { low: number }; forecastMonthEndUsd: number };
  };
  assert.equal(body.dataMode, 'synthetic-demo');
  assert.equal(body.fixtureAsOf, '2026-05-07T16:00:00Z');
  assert.equal(body.chargeback.totalOrgSpendUsd, 560.1);
  const shares = body.chargeback.departments.reduce((sum: number, row: { share: number }) => sum + row.share, 0);
  assert.ok(Math.abs(shares - 100) <= 0.2);
  assert.equal(body.forecast.illustrativeRangeUsd.low <= body.forecast.forecastMonthEndUsd, true);
});

test('preview serves the API-backed synthetic fixture console', async () => {
  const response = await get('/preview');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /SYNTHETIC FIXTURE/);
  assert.match(html, /\/preview\.js/);
});

test('compute endpoint rejects cached-token overcount', async () => {
  const response = await post('/api/cost/compute', {
    modelId: 'claude-haiku-4.5', inputTokens: 10, outputTokens: 0, cachedInputTokens: 11,
  });
  assert.equal(response.status, 400);
});

test('forecast endpoint rejects an incomplete daily series', async () => {
  const response = await post('/api/insights/forecast', {
    series: [{ date: '2026-05-01', costUsd: 10 }],
    monthStart: '2026-05-01', asOf: '2026-05-02T12:00:00Z',
  });
  assert.equal(response.status, 400);
});

test('request body limit rejects oversized input', async () => {
  const response = await post('/api/cost/compute', {
    modelId: 'claude-haiku-4.5', inputTokens: 1, outputTokens: 1, extra: 'x'.repeat(270_000),
  });
  assert.equal(response.status, 413);
});

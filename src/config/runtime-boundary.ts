import type { IncomingHttpHeaders } from 'node:http';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1)(?::([1-9]\d{0,4}))?$/i;
const PROXY_HEADERS = ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'via'] as const;

export function isLocalHostHeader(host: string | undefined): boolean {
  const match = LOCAL_HOST.exec(host ?? '');
  return match !== null && (match[2] === undefined || Number(match[2]) <= 65535);
}

export function hasProxyForwardingHeaders(headers: IncomingHttpHeaders): boolean {
  return PROXY_HEADERS.some((name) => headers[name] !== undefined);
}

export function assertFixtureOnlyRuntime(nodeEnv: string, localFixtureOptIn: string | undefined): void {
  if ((nodeEnv !== 'development' && nodeEnv !== 'test') || localFixtureOptIn !== '1') {
    throw new Error('AI FinOps Radar is fixture-only; set NODE_ENV=development and FINOPS_LOCAL_FIXTURE=1 for a local demo.');
  }
}

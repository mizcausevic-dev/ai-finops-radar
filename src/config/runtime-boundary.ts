const LOCAL_HOST = /^(localhost|127\.0\.0\.1)(?::([1-9]\d{0,4}))?$/i;

export function isLocalHostHeader(host: string | undefined): boolean {
  const match = LOCAL_HOST.exec(host ?? '');
  return match !== null && (match[2] === undefined || Number(match[2]) <= 65535);
}

export function assertFixtureOnlyRuntime(nodeEnv: string): void {
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    throw new Error('AI FinOps Radar is fixture-only and cannot start outside local development or test mode.');
  }
}

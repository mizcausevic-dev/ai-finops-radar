import dotenv from 'dotenv';
import { assertFixtureOnlyRuntime } from './runtime-boundary';
dotenv.config();

const rawPort = process.env.PORT ?? '3000';
if (!/^[1-9]\d{0,4}$/.test(rawPort) || Number(rawPort) > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

export const env = {
  port: Number(rawPort),
  nodeEnv: process.env.NODE_ENV ?? '',
};

assertFixtureOnlyRuntime(env.nodeEnv, process.env.FINOPS_LOCAL_FIXTURE);

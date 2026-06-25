import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import type { ServerConfig } from './config.js';

export interface BuildAppOptions {
  config: ServerConfig;
}

export function buildApp({ config }: BuildAppOptions) {
  const app = Fastify({ logger: config.nodeEnv !== 'test' });

  void app.register(cookie, { secret: config.sessionSecret });
  void app.register(cors, { origin: config.appBaseUrl, credentials: true });

  app.get('/api/health', async () => ({ ok: true }));

  return app;
}

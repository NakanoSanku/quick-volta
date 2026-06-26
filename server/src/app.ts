import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import type { ServerConfig } from './config.js';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { cardsRoutes } from './routes/cards.js';
import { reviewStatsRoutes } from './routes/reviewStats.js';
import { importLocalDataRoutes } from './routes/importLocalData.js';

export interface BuildAppOptions {
  config: ServerConfig;
}

export function buildApp({ config }: BuildAppOptions) {
  const app = Fastify({ logger: config.nodeEnv !== 'test' });

  void app.register(cookie, { secret: config.sessionSecret });
  void app.register(cors, { origin: config.appBaseUrl, credentials: true });
  void app.register(authPlugin);
  void app.register(authRoutes, config);
  void app.register(cardsRoutes);
  void app.register(reviewStatsRoutes);
  void app.register(importLocalDataRoutes);

  app.get('/api/health', async () => ({ ok: true }));

  return app;
}

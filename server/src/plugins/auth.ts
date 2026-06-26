import fp from 'fastify-plugin';
import type { preHandlerAsyncHookHandler } from 'fastify';
import { getSessionUser, SESSION_COOKIE_NAME } from '../auth/session.js';

type AuthUser = Awaited<ReturnType<typeof getSessionUser>>;

export const authPlugin = fp(async (app) => {
  app.decorateRequest('user', null);

  app.addHook('preHandler', async (request) => {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    request.user = await getSessionUser(sessionId);
  });

  app.decorate('requireUser', async (request, reply) => {
    if (!request.user) {
      await reply.status(401).send({ error: 'Authentication required.' });
    }
  });
});

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }

  interface FastifyInstance {
    requireUser: preHandlerAsyncHookHandler;
  }
}

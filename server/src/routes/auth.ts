import type { FastifyInstance } from 'fastify';
import { destroySession, SESSION_COOKIE_NAME } from '../auth/session.js';
import type { ServerConfig } from '../config.js';

function userDto(user: NonNullable<import('fastify').FastifyRequest['user']>) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

export async function authRoutes(app: FastifyInstance, config: ServerConfig) {
  app.get('/api/me', async (request) => {
    if (!request.user) return { authenticated: false, user: null };
    return { authenticated: true, user: userDto(request.user) };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    await destroySession(request.cookies[SESSION_COOKIE_NAME]);
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/google', async (_request, reply) => {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.googleClientId);
    url.searchParams.set('redirect_uri', config.googleCallbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', 'state-implemented-in-task-4');
    return reply.redirect(url.toString());
  });
}

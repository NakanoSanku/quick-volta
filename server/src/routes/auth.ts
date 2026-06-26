import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { createSession, destroySession, SESSION_COOKIE_NAME } from '../auth/session.js';
import { exchangeGoogleCode, fetchGoogleProfile } from '../auth/google.js';
import { prisma } from '../db.js';
import type { ServerConfig } from '../config.js';

const OAUTH_STATE_COOKIE = 'qv_oauth_state';

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
    const state = randomBytes(18).toString('hex');
    reply.setCookie(OAUTH_STATE_COOKIE, state, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      maxAge: 10 * 60,
    });

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.googleClientId);
    url.searchParams.set('redirect_uri', config.googleCallbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    return reply.redirect(url.toString());
  });

  app.get('/api/auth/google/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string };
    const expectedState = request.cookies[OAUTH_STATE_COOKIE];
    reply.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

    if (!query.code || !query.state || !expectedState || query.state !== expectedState) {
      return reply.redirect(`${config.appBaseUrl}?authError=oauth_state`);
    }

    try {
      const tokens = await exchangeGoogleCode({
        code: query.code,
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
        redirectUri: config.googleCallbackUrl,
      });
      const profile = await fetchGoogleProfile({ accessToken: tokens.accessToken });
      const user = await prisma.user.upsert({
        where: { googleSub: profile.googleSub },
        create: {
          googleSub: profile.googleSub,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        },
        update: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
        },
      });
      const session = await createSession(user.id);
      reply.setCookie(SESSION_COOKIE_NAME, session.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: config.nodeEnv === 'production',
        maxAge: 30 * 24 * 60 * 60,
      });
      return reply.redirect(config.appBaseUrl);
    } catch {
      return reply.redirect(`${config.appBaseUrl}?authError=oauth_callback`);
    }
  });
}

export interface GoogleTokens {
  accessToken: string;
  idToken: string;
}

export interface GoogleProfile {
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface FetchOptions {
  fetchImpl?: typeof fetch;
}

export async function exchangeGoogleCode(options: FetchOptions & {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleTokens> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    code: options.code,
    client_id: options.clientId,
    client_secret: options.clientSecret,
    redirect_uri: options.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Google token exchange failed with status ${response.status}.`);
  const data = await response.json() as { access_token?: string; id_token?: string };
  if (!data.access_token || !data.id_token) throw new Error('Google token response was invalid.');
  return { accessToken: data.access_token, idToken: data.id_token };
}

export async function fetchGoogleProfile(options: FetchOptions & { accessToken: string }): Promise<GoogleProfile> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${options.accessToken}` },
  });
  if (!response.ok) throw new Error(`Google profile request failed with status ${response.status}.`);
  const data = await response.json() as { sub?: string; email?: string; name?: string; picture?: string };
  if (!data.sub || !data.email) throw new Error('Google profile response was invalid.');
  return {
    googleSub: data.sub,
    email: data.email,
    name: data.name ?? null,
    avatarUrl: data.picture ?? null,
  };
}

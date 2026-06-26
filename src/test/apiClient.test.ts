import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiJson } from '../services/apiClient';

describe('apiJson', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('does not send a JSON content-type header for requests without a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiJson('/api/auth/logout', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {},
    });
  });

  it('sends a JSON content-type header when a body is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiJson('/api/cards', { method: 'POST', body: JSON.stringify({ term: 'hello' }) });

    expect(fetchMock).toHaveBeenCalledWith('/api/cards', {
      method: 'POST',
      body: JSON.stringify({ term: 'hello' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyLineSignature } from './signature';

describe('verifyLineSignature', () => {
  it('returns true for a valid LINE signature', () => {
    const body = '{"events":[]}';
    const signature = createHmac('sha256', 'secret').update(body).digest('base64');
    expect(verifyLineSignature(body, signature, 'secret')).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    expect(verifyLineSignature('{"events":[]}', 'bad', 'secret')).toBe(false);
  });
});

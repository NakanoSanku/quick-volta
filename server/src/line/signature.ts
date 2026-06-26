import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyLineSignature(rawBody: string, signature: string | undefined, channelSecret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', channelSecret).update(rawBody).digest('base64');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

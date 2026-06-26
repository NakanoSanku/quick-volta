import { describe, expect, it } from 'vitest';
import viteConfig from '../../vite.config.ts?raw';

describe('Vite PWA navigation fallback', () => {
  it('does not let the service worker handle API navigation routes', () => {
    expect(viteConfig).toContain('navigateFallbackDenylist');
    expect(viteConfig).toContain('[/^\\/api\\//]');
  });
});
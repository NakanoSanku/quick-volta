import { describe, expect, it } from 'vitest';
import html from '../../index.html?raw';

describe('index.html referrer policy', () => {
  it('disables referrer headers so Google Translate TTS audio does not return 404', () => {
    const document = new DOMParser().parseFromString(html, 'text/html');

    const referrerMeta = document.querySelector('meta[name="referrer"]');

    expect(referrerMeta?.getAttribute('content')).toBe('no-referrer');
  });
});

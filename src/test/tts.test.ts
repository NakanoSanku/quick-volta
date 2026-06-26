import { describe, expect, it } from 'vitest';
import { buildGoogleTranslateTtsUrl, detectTtsLanguage } from '../services/tts';

describe('TTS helpers', () => {
  it('builds a direct Google Translate TTS URL instead of using corsproxy.io', () => {
    const url = buildGoogleTranslateTtsUrl('hello world', 'en-US');

    expect(url).toMatch(/^https:\/\/translate\.google\.com\/translate_tts\?/);
    expect(url).not.toContain('corsproxy.io');
    expect(url).toContain('tl=en');
    expect(url).toContain('q=hello%20world');
  });

  it('detects text scripts and tags for Thai, Japanese, Chinese, Korean, and English', () => {
    expect(detectTtsLanguage('สวัสดี', [])).toBe('th-TH');
    expect(detectTtsLanguage('hello', ['thai'])).toBe('th-TH');
    expect(detectTtsLanguage('こんにちは', [])).toBe('ja-JP');
    expect(detectTtsLanguage('hello', ['japanese'])).toBe('ja-JP');
    expect(detectTtsLanguage('你好', [])).toBe('zh-CN');
    expect(detectTtsLanguage('hello', ['chinese'])).toBe('zh-CN');
    expect(detectTtsLanguage('안녕하세요', [])).toBe('ko-KR');
    expect(detectTtsLanguage('hello', ['korean'])).toBe('ko-KR');
    expect(detectTtsLanguage('hello', ['english'])).toBe('en-US');
  });
});

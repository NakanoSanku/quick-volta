export function detectTtsLanguage(text: string, tags: string[] = []): string {
  if (/[\u0e00-\u0e7f]/.test(text)) {
    return 'th-TH';
  }

  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
    return 'ja-JP';
  }

  if (/[\u4e00-\u9fa5]/.test(text)) {
    return 'zh-CN';
  }

  if (/[\uac00-\ud7a3]/.test(text)) {
    return 'ko-KR';
  }

  const normalizedTags = tags.map((tag) => tag.toLowerCase());
  if (normalizedTags.some((tag) => tag.includes('thai') || tag === 'th' || tag.includes('ภาษาไทย'))) {
    return 'th-TH';
  }

  if (normalizedTags.some((tag) => tag.includes('jp') || tag.includes('japan') || tag === 'ja' || tag.includes('日本語') || tag.includes('japanese'))) {
    return 'ja-JP';
  }

  if (normalizedTags.some((tag) => tag.includes('chinese') || tag.includes('china') || tag === 'zh' || tag === 'cn' || tag.includes('中文'))) {
    return 'zh-CN';
  }

  if (normalizedTags.some((tag) => tag.includes('korean') || tag.includes('korea') || tag === 'ko' || tag === 'kr' || tag.includes('한국어'))) {
    return 'ko-KR';
  }

  if (normalizedTags.some((tag) => tag.includes('english') || tag === 'en')) {
    return 'en-US';
  }

  return 'en-US';
}

export function buildGoogleTranslateTtsUrl(text: string, langCode: string): string {
  const ttsLang = langCode.split('-')[0] || 'en';
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(ttsLang)}&q=${encodeURIComponent(text)}`;
}

function getVoiceForLang(langCode: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();

  let voice = voices.find((candidate) => candidate.lang.toLowerCase() === langCode.toLowerCase());
  if (voice) return voice;

  const baseLang = langCode.split('-')[0].toLowerCase();
  voice = voices.find((candidate) => candidate.lang.toLowerCase().startsWith(baseLang));
  if (voice) return voice;

  return voices.find((candidate) => (
    candidate.name.toLowerCase().includes(baseLang) || candidate.lang.toLowerCase().includes(baseLang)
  )) || null;
}

export function playTermTts(text: string, tags: string[] = []): void {
  if (!text) return;

  const langCode = detectTtsLanguage(text, tags);

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  let fallbackTriggered = false;
  const playLocalFallback = () => {
    if (fallbackTriggered) return;
    fallbackTriggered = true;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;

      const matchingVoice = getVoiceForLang(langCode);
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const audio = new Audio(buildGoogleTranslateTtsUrl(text, langCode));
  audio.setAttribute('referrerpolicy', 'no-referrer');

  audio.onerror = () => {
    console.warn('Google Translate TTS failed to load, falling back to local speechSynthesis');
    playLocalFallback();
  };

  audio.play().catch((error) => {
    console.warn('Google Translate TTS play call failed, falling back to local speechSynthesis:', error);
    playLocalFallback();
  });
}

// =============================================================================
// MediKiosk — Multilingual support
// =============================================================================
// Architecture:
//  - `makeT(lang)` returns an inline bilingual helper (matches existing pages).
//  - `tr(lang, key)` resolves keys against per-language dictionaries. Adding a
//    future Indian language = add a dictionary entry + speech locale below.
//  - `speak()` / `stopSpeaking()` provide audio prompts via the Web Speech API
//    for low-literacy patients (replaceable by pre-recorded audio URLs later).
// =============================================================================

export type KioskLanguage = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr';

export const SPEECH_LOCALES: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
};

/**
 * Inline bilingual helper. Languages without a dictionary fall back to English.
 */
export function makeT(lang: string) {
  return (en: string, hi: string) => (lang === 'hi' ? hi : en);
}

// Common UI strings. Extend per language as translations become available.
const dictionaries: Record<string, Record<string, string>> = {
  en: {
    continue: 'Continue',
    back: 'Go Back',
    cancel: 'Cancel',
    skip: 'Skip',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    listen: 'Listen',
    stop_audio: 'Stop Audio',
    still_here: "I'm still here",
    idle_title: 'Are you still there?',
    idle_body: 'This kiosk will reset shortly due to inactivity.',
    token_title: 'Your OPD Token',
    token_body: 'Please remember your token and wait for your turn.',
  },
  hi: {
    continue: 'जारी रखें',
    back: 'पीछे जाएं',
    cancel: 'रद्द करें',
    skip: 'छोड़ें',
    confirm: 'पुष्टि करें',
    yes: 'हां',
    no: 'नहीं',
    listen: 'सुनें',
    stop_audio: 'ऑडियो रोकें',
    still_here: 'मैं यहीं हूं',
    idle_title: 'क्या आप अभी भी यहां हैं?',
    idle_body: 'निष्क्रियता के कारण यह कियोस्क जल्द रीसेट हो जाएगा।',
    token_title: 'आपका ओपीडी टोकन',
    token_body: 'कृपया अपना टोकन याद रखें और अपनी बारी की प्रतीक्षा करें।',
  },
};

export function tr(lang: string, key: string): string {
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
}

/**
 * Speak text aloud using the browser's speech synthesis (audio prompt).
 * No-op when the Web Speech API is unavailable.
 */
export function speak(text: string, lang: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEECH_LOCALES[lang] || 'en-IN';
  utterance.rate = 0.9; // Slightly slower for clarity
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

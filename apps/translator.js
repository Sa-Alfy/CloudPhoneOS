import { h, render } from 'https://esm.sh/preact';
import { useState, useEffect, useRef } from 'https://esm.sh/preact/hooks';
import htm from 'https://esm.sh/htm';
import { Toast } from '../core/components.js';
import { setSoftKeys, pushBackHandler, popBackHandler } from '../core/softkeys.js';

const html = htm.bind(h);

export const manifest = {
  id: 'translator',
  name: 'Translator',
  icon: '🌐',
  order: 5,
  description: 'Language translation.',
  version: '1.0',
  keywords: ['language', 'translate', 'bengali', 'english', 'convert'],
  route: 'translator'
};

const PAIRS = {
  'hello': 'হ্যালো',
  'hi': 'হাই',
  'hey': 'আরে',
  'how are you': 'আপনি কেমন আছেন',
  'how are you?': 'আপনি কেমন আছেন',
  'i am fine': 'আমি ভালো আছি',
  'good morning': 'সুপ্রভাত',
  'good night': 'শুভ রাত্রি',
  'thank you': 'ধন্যবাদ',
  'thanks': 'ধন্যবাদ',
  'please': 'অনুগ্রহ করে',
  'what is your name': 'আপনার নাম কী',
  'my name is': 'আমার নাম',
  'where are you': 'আপনি কোথায়',
  'i love you': 'আমি তোমাকে ভালোবাসি',
  'open': 'খুলুন',
  'save': 'সংরক্ষণ',
  'back': 'পেছনে',
  'weather': 'আবহাওয়া',
  'calculator': 'ক্যালকুলেটর',
  'notes': 'নোট',
  'translator': 'অনুবাদক',
  'today': 'আজ',
  'tomorrow': 'আগামীকাল',
  'yes': 'হ্যাঁ',
  'no': 'না',
  'good': 'ভালো',
  'bad': 'খারাপ',
  'food': 'খাবার',
  'water': 'पानी',
  'phone': 'ফোন',
  'message': 'বার্তা',
  'friend': 'বন্ধু',
  'school': 'স্কুল',
  'home': 'বাড়ি'
};

const WORDS_EN_BN = {
  i: 'আমি',
  you: 'তুমি',
  we: 'আমরা',
  they: 'তারা',
  he: 'সে',
  she: 'সে',
  am: 'আছি',
  are: 'আছ',
  is: 'হয়',
  my: 'আমার',
  your: 'তোমার',
  this: 'এটা',
  that: 'ওটা',
  please: 'অনুগ্রহ করে',
  want: 'চাই',
  need: 'দরকার',
  open: 'খুলুন',
  save: 'সংরক্ষণ',
  close: 'বন্ধ',
  good: 'ভালো',
  bad: 'খারাপ',
  today: 'আজ',
  tomorrow: 'আগামীকাল',
  help: 'সাহায্য',
  time: 'সময়',
  date: 'তারিখ',
  weather: 'আবহাওয়া',
  note: 'নোট',
  notes: 'নোট',
  friend: 'বন্ধু',
  school: 'স্কুল',
  money: 'টাকা',
  phone: 'ফোন',
  yes: 'হ্যাঁ',
  no: 'না',
  thank: 'ধন্যবাদ'
};

const WORDS_BN_EN = Object.fromEntries(
  Object.entries(WORDS_EN_BN).map(([en, bn]) => [bn, en])
);

function normalize(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function detectLanguage(text) {
  return /[\u0980-\u09FF]/.test(text) ? 'bn' : 'en';
}

function preserveCase(original, translated) {
  if (!original) return translated;
  if (original === original.toUpperCase()) return translated.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) {
    return translated.charAt(0).toUpperCase() + translated.slice(1);
  }
  return translated;
}

function translateByWords(text, table) {
  return text.replace(/([\u0980-\u09FFA-Za-z']+|[^\u0980-\u09FFA-Za-z']+|\s+)/gu, (token) => {
    if (/^\s+$/.test(token) || !/[\u0980-\u09FFA-Za-z']/.test(token)) return token;
    const key = token.toLowerCase();
    const translated = table[key] || table[token] || token;
    return preserveCase(token, translated);
  });
}

function translateText(text, from, to) {
  const clean = normalize(text);
  if (!clean) return '';

  const actualFrom = from === 'auto' ? detectLanguage(clean) : from;
  if (actualFrom === to) return clean;

  if (
    (actualFrom === 'en' && to === 'bn') ||
    (actualFrom === 'bn' && to === 'en')
  ) {
    const exactMap = actualFrom === 'en' ? PAIRS : Object.fromEntries(Object.entries(PAIRS).map(([en, bn]) => [bn, en]));
    const lower = clean.toLowerCase();
    const phraseKey = lower.replace(/[!?.,]+$/g, '');

    if (exactMap[lower]) return exactMap[lower];
    if (exactMap[phraseKey]) return exactMap[phraseKey];
    if (exactMap[clean]) return exactMap[clean];

    const wordMap = actualFrom === 'en' ? WORDS_EN_BN : WORDS_BN_EN;
    return translateByWords(clean, wordMap);
  }

  return clean;
}

const LANGUAGES = [
  { code: 'en', name: 'English (US/UK)', flag: '🇺🇸' },
  { code: 'bn', name: 'Bangla (Bangladesh)', flag: '🇧🇩' },
  { code: 'es', name: 'Spanish (Spain/LatAm)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (France)', flag: '🇫🇷' },
  { code: 'de', name: 'German (Germany)', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic (Middle East)', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi (India)', flag: '🇮🇳' },
  { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese (Japan)', flag: '🇯🇵' },
  { code: 'ur', name: 'Urdu (Pakistan)', flag: '🇵🇰' },
  { code: 'pt', name: 'Portuguese (Brazil)', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian (Russia)', flag: '🇷🇺' }
];

const QUICK_PHRASES = [
  { text: 'hello', label: 'Hello', src: 'en', dst: 'bn' },
  { text: 'thank you', label: 'Thank you', src: 'en', dst: 'bn' },
  { text: 'how are you', label: 'How are you?', src: 'en', dst: 'bn' },
  { text: 'আমি ভালো আছি', label: 'আমি ভালো আছি', src: 'bn', dst: 'en' },
  { text: 'Hola', label: 'Hola', src: 'es', dst: 'en' },
  { text: 'Bonjour', label: 'Bonjour', src: 'fr', dst: 'en' }
];

function TranslatorApp({ router }) {
  const [srcLang, setSrcLang] = useState('auto');
  const [dstLang, setDstLang] = useState('bn');
  const [inputText, setInputText] = useState('How are you?');
  const [outputText, setOutputText] = useState('');
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async (silent = false) => {
    const text = inputText.trim();
    if (!text) {
      setOutputText('');
      return;
    }
    setTranslating(true);
    try {
      const from = srcLang;
      const to = dstLang;
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      if (data && data[0]) {
        const resultText = data[0].map(part => part[0]).join('');
        setOutputText(resultText);
        if (!silent) Toast('Translated');
        setTranslating(false);
        return;
      }
    } catch (e) {
      console.warn('Online translation failed, falling back to offline:', e);
    }

    const translated = translateText(text, srcLang, dstLang);
    setOutputText(translated);
    if (!silent) Toast('Translated (Offline)');
    setTranslating(false);
  };

  const handleSwap = () => {
    let currentSrc = srcLang;
    if (currentSrc === 'auto') {
      currentSrc = inputText.trim() ? detectLanguage(inputText.trim()) : 'en';
    }
    const nextSrc = dstLang;
    const nextDst = currentSrc;
    setSrcLang(nextSrc);
    setDstLang(nextDst);
    setInputText(outputText || inputText);
    setOutputText('');
    Toast('Swapped');
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setSrcLang('auto');
    setDstLang('bn');
    Toast('Cleared');
  };

  const handlePhrase = (phrase) => {
    setInputText(phrase.text);
    setSrcLang(phrase.src);
    setDstLang(phrase.dst);
    Toast('Phrase loaded');
  };

  // Run initial translation on mount
  useEffect(() => {
    handleTranslate(true);
  }, []);

  // Register back handler on mount so physical RSK reliably goes back to home
  useEffect(() => {
    const handleBack = () => router.back();
    pushBackHandler(handleBack);
    return () => popBackHandler(handleBack);
  }, [router]);

  // Set softkey LABELS when state changes
  useEffect(() => {
    setSoftKeys({
      left: 'Translate',
      center: 'Select',
      right: 'Back',
      onLeft: () => handleTranslate(false),
      onCenter: null,
      onRight: null  // handled by pushBackHandler above
    });
  }, [inputText, srcLang, dstLang, outputText]);

  // Debounced translation as user types
  useEffect(() => {
    const handler = setTimeout(() => {
      handleTranslate(true);
    }, 450);
    return () => clearTimeout(handler);
  }, [inputText, srcLang, dstLang]);

  return html`
    <div class="ck-screen ck-translator-v2">
      <header class="ck-tr-header">
        <div class="ck-tr-header__title">Translator 🌐</div>
        <div class="ck-tr-header__subtitle">
          ${translating ? 'Translating...' : 'Multi-country translation engine'}
        </div>
      </header>

      <main class="ck-tr-content">
        <div class="ck-tr-field">
          <label class="ck-tr-field__label" for="ck-src">From</label>
          <select
            id="ck-src"
            class="ck-select"
            value=${srcLang}
            onChange=${(e) => setSrcLang(e.target.value)}
            data-focusable
          >
            <option value="auto">Auto detect</option>
            ${LANGUAGES.map(
              (l) => html`<option value=${l.code}>${l.flag} ${l.name}</option>`
            )}
          </select>
        </div>

        <div class="ck-tr-field">
          <label class="ck-tr-field__label" for="ck-dst">To</label>
          <select
            id="ck-dst"
            class="ck-select"
            value=${dstLang}
            onChange=${(e) => setDstLang(e.target.value)}
            data-focusable
          >
            ${LANGUAGES.map(
              (l) => html`<option value=${l.code}>${l.flag} ${l.name}</option>`
            )}
          </select>
        </div>

        <div class="ck-tr-field">
          <label class="ck-tr-field__label" for="ck-input">Text</label>
          <textarea
            id="ck-input"
            class="ck-textarea"
            placeholder="Type or paste text here"
            value=${inputText}
            onInput=${(e) => setInputText(e.target.value)}
            data-focusable
          />
        </div>

        <div class="ck-tr-field">
          <label class="ck-tr-field__label" for="ck-output">Translation</label>
          <textarea
            id="ck-output"
            class="ck-textarea"
            readonly
            placeholder="Translation appears here"
            value=${outputText}
            data-focusable
          />
        </div>

        <div class="ck-tr-field">
          <label class="ck-tr-field__label">Quick phrases</label>
          <div class="ck-tr-chips" aria-label="Quick phrases">
            ${QUICK_PHRASES.map(
              (p) => html`
                <button
                  type="button"
                  class="ck-chip"
                  onClick=${() => handlePhrase(p)}
                  data-focusable
                >
                  ${p.label}
                </button>
              `
            )}
          </div>
        </div>

        <div class="ck-tr-actions">
          <button
            type="button"
            class="ck-action"
            onClick=${() => handleTranslate(false)}
            data-focusable
          >
            Translate
          </button>
          <button
            type="button"
            class="ck-action"
            onClick=${handleSwap}
            data-focusable
          >
            Swap
          </button>
          <button
            type="button"
            class="ck-action"
            onClick=${handleClear}
            data-focusable
          >
            Clear
          </button>
          <button
            type="button"
            class="ck-action"
            onClick=${() => router.back()}
            data-focusable
          >
            Back
          </button>
        </div>
      </main>

      <footer class="ck-tr-navbar">
        <span class="ck-tr-navbar__label">LSK: Translate</span>
        <span class="ck-tr-navbar__label">RSK: Back</span>
      </footer>
    </div>
  `;
}

export function renderTranslator({ root, router }) {
  render(html`<${TranslatorApp} router=${router} />`, root);
}

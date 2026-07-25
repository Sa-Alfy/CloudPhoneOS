import { Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';


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
  'water': 'পানি',
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

  const exactMap = actualFrom === 'en' ? PAIRS : Object.fromEntries(Object.entries(PAIRS).map(([en, bn]) => [bn, en]));
  const lower = clean.toLowerCase();
  const phraseKey = lower.replace(/[!?.,]+$/g, '');

  if (exactMap[lower]) return exactMap[lower];
  if (exactMap[phraseKey]) return exactMap[phraseKey];
  if (exactMap[clean]) return exactMap[clean];

  const wordMap = actualFrom === 'en' ? WORDS_EN_BN : WORDS_BN_EN;
  return translateByWords(clean, wordMap);
}

export function renderTranslator({ root }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ck-screen ck-translator';
  wrapper.innerHTML = `
    <section class="ck-panel ck-translator__header">
      <div class="ck-panel__title">Translator</div>
      <div class="ck-panel__subtitle">Offline phrase translator for quick Bangla ⇄ English work</div>
    </section>

    <section class="ck-panel ck-form">
      <div class="ck-field">
        <label class="ck-label" for="ck-src">From</label>
        <select id="ck-src" class="ck-select">
          <option value="auto">Auto detect</option>
          <option value="en">English</option>
          <option value="bn">Bangla</option>
        </select>
      </div>

      <div class="ck-field">
        <label class="ck-label" for="ck-dst">To</label>
        <select id="ck-dst" class="ck-select">
          <option value="bn">Bangla</option>
          <option value="en">English</option>
        </select>
      </div>

      <div class="ck-field">
        <label class="ck-label" for="ck-input">Text</label>
        <textarea id="ck-input" class="ck-textarea ck-textarea--short" rows="5" placeholder="Type or paste text here"></textarea>
      </div>

      <div class="ck-field">
        <label class="ck-label" for="ck-output">Translation</label>
        <textarea id="ck-output" class="ck-textarea ck-textarea--short" rows="5" readonly placeholder="Translation appears here"></textarea>
      </div>

      <div class="ck-chip-row" aria-label="Quick phrases">
        <button type="button" class="ck-chip" data-phrase="hello">Hello</button>
        <button type="button" class="ck-chip" data-phrase="thank you">Thank you</button>
        <button type="button" class="ck-chip" data-phrase="how are you">How are you?</button>
        <button type="button" class="ck-chip" data-phrase="আমি ভালো আছি">আমি ভালো আছি</button>
      </div>

      <div class="ck-actions ck-actions--stacked">
        <button type="button" class="ck-action" data-focusable data-action="translate">Translate</button>
        <button type="button" class="ck-action" data-focusable data-action="swap">Swap</button>
        <button type="button" class="ck-action" data-focusable data-action="clear">Clear</button>
        <button type="button" class="ck-action" data-focusable data-action="back">Back</button>
      </div>
    </section>
  `;

  const src = wrapper.querySelector('#ck-src');
  const dst = wrapper.querySelector('#ck-dst');
  const input = wrapper.querySelector('#ck-input');
  const output = wrapper.querySelector('#ck-output');
  const translateBtn = wrapper.querySelector('[data-action="translate"]');
  const swapBtn = wrapper.querySelector('[data-action="swap"]');
  const clearBtn = wrapper.querySelector('[data-action="clear"]');
  const backBtn = wrapper.querySelector('[data-action="back"]');

  const doTranslate = async (silent = false) => {
    const text = input.value.trim();
    if (!text) {
      output.value = '';
      return;
    }

    try {
      const from = src.value;
      const to = dst.value;
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      if (data && data[0]) {
        output.value = data[0].map(part => part[0]).join('');
        if (!silent) Toast('Translated');
        return;
      }
    } catch (e) {
      console.warn('Online translation failed, falling back to offline:', e);
    }

    const translated = translateText(text, src.value, dst.value);
    output.value = translated;
    if (!silent) Toast('Translated (Offline)');
  };

  const doSwap = () => {
    if (src.value === 'auto') {
      src.value = 'bn';
    }
    const previousSrc = src.value;
    src.value = dst.value;
    dst.value = previousSrc === 'en' ? 'bn' : 'en';
    const sourceText = input.value;
    input.value = output.value || sourceText;
    output.value = '';
    doTranslate(true);
    Toast('Swapped');
  };

  const clearAll = () => {
    input.value = '';
    output.value = '';
    src.value = 'auto';
    dst.value = 'bn';
    Toast('Cleared');
  };

  let debounceTimeout;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => doTranslate(true), 400);
  });
  src.addEventListener('change', () => doTranslate(true));
  dst.addEventListener('change', () => doTranslate(true));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      doTranslate(false);
    }
  });


  setSoftKeys({
    left: 'Translate',
    center: 'Select',
    right: 'Back',
    onLeft: () => doTranslate(false),
    onCenter: null,
    onRight: () => window.dispatchEvent(new Event('ck:back'))
  });

  [translateBtn, swapBtn, clearBtn, backBtn].forEach((button) => {
    button.addEventListener('click', () => {
      switch (button.dataset.action) {
        case 'translate':
          doTranslate(false);
          break;
        case 'swap':
          doSwap();
          break;
        case 'clear':
          clearAll();
          break;
        case 'back':
          window.dispatchEvent(new Event('ck:back'));
          break;
      }
    });
  });

  wrapper.querySelectorAll('[data-phrase]').forEach((button) => {
    button.addEventListener('click', () => {
      const phrase = button.dataset.phrase || '';
      input.value = phrase;
      if (/[\u0980-\u09FF]/.test(phrase)) {
        src.value = 'bn';
        dst.value = 'en';
      } else {
        src.value = 'en';
        dst.value = 'bn';
      }
      doTranslate(false);
      Toast('Phrase loaded');
    });
  });

  root.appendChild(wrapper);
  input.value = 'How are you?';
  doTranslate(true);
}


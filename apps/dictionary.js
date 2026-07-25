import { Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';
import { save, load } from '../core/storage.js';
import { LoadingState, ErrorState, OfflineState, EmptyState } from '../core/components.js';

export const manifest = {
  id: 'dictionary',
  name: 'Dictionary',
  icon: '📖',
  order: 4,
  description: 'Word definitions & phonetics.',
  version: '1.0',
  keywords: ['words', 'definition', 'meaning', 'lexicon', 'vocab'],
  route: 'dictionary'
};


const CACHE_KEY  = 'dict:cache';
const DICT_API   = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

// Minimal offline fallback for when the network is unavailable.
// Covers a small set of common words so the app isn't completely dead offline.
const OFFLINE_FALLBACK = {
  hello:    { pos: 'exclamation', def: 'Used as a greeting.',                example: 'Hello! How are you?' },
  world:    { pos: 'noun',        def: 'The earth and all the people on it.', example: 'She wanted to see the world.' },
  phone:    { pos: 'noun',        def: 'A telephone.',                        example: 'He picked up the phone.' },
  water:    { pos: 'noun',        def: 'A clear liquid essential to life.',   example: 'Drink plenty of water.' },
  time:     { pos: 'noun',        def: 'The indefinite continued progress of events.', example: 'Time flies.' },
  good:     { pos: 'adjective',   def: 'To be desired or approved of.',       example: 'A good book.' },
  bad:      { pos: 'adjective',   def: 'Of poor quality or a low standard.',  example: 'Bad weather.' },
  work:     { pos: 'noun',        def: 'Activity involving effort to achieve a result.', example: 'Hard work pays off.' },
  help:     { pos: 'verb',        def: 'Make it easier to do something.',     example: 'Can you help me?' },
  find:     { pos: 'verb',        def: 'Discover by searching or effort.',    example: 'I need to find my keys.' },
};

async function fetchDefinition(word) {
  const response = await fetch(DICT_API + encodeURIComponent(word.toLowerCase()), {
    headers: { Accept: 'application/json' }
  });
  if (response.status === 404) return null;          // Word not found.
  if (!response.ok) throw new Error(`API error (${response.status})`);
  return response.json();                            // Array of entry objects.
}

function parseEntry(entries) {
  // Pick the first meaning that has a definition.
  for (const entry of entries) {
    for (const meaning of (entry.meanings || [])) {
      const def = meaning.definitions?.[0];
      if (!def) continue;
      return {
        word:      entry.word,
        phonetic:  entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '',
        pos:       meaning.partOfSpeech || '',
        definition: def.definition || '',
        example:   def.example || '',
      };
    }
  }
  return null;
}

function buildResultHTML({ word, phonetic, pos, definition, example }) {
  return `
    <div class="ck-dict-result">
      <div>
        <div class="ck-dict-headword">${word}</div>
        ${phonetic ? `<div class="ck-dict-phonetic">${phonetic}</div>` : ''}
      </div>
      ${pos ? `<div class="ck-dict-pos">${pos}</div>` : ''}
      <div class="ck-dict-definition">${definition}</div>
      ${example ? `<div class="ck-dict-example">"${example}"</div>` : ''}
    </div>
  `;
}

export function renderDictionary({ root, router }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ck-screen';
  wrapper.innerHTML = `
    <section class="ck-panel">
      <div class="ck-panel__title">Dictionary</div>
      <div class="ck-panel__subtitle">English definitions · dictionaryapi.dev</div>
    </section>

    <section class="ck-panel ck-form">
      <div class="ck-field ck-field--inline">
        <label class="ck-label" for="ck-dict-word">Word</label>
        <input id="ck-dict-word" class="ck-input" type="text" placeholder="e.g. serendipity"
               autocomplete="off" spellcheck="false" autocorrect="off" autocapitalize="off">
      </div>
      <div class="ck-actions ck-actions--stacked">
        <button type="button" class="ck-action" data-focusable data-action="search">Look up</button>
        <button type="button" class="ck-action" data-focusable data-action="back">Back</button>
      </div>
    </section>

    <section class="ck-panel ck-dict-panel" id="ck-dict-result-area" aria-live="polite">
      <div id="ck-dict-content"></div>
    </section>
  `;

  const wordInput   = wrapper.querySelector('#ck-dict-word');
  const resultArea  = wrapper.querySelector('#ck-dict-result-area');
  const contentEl   = wrapper.querySelector('#ck-dict-content');

  function showReady() {
    contentEl.innerHTML = `
      <div class="ck-state">
        <div class="ck-state__icon">📖</div>
        <div class="ck-state__message">Type a word and press Look up.</div>
      </div>`;
  }

  function showResult(parsed, { cached = false } = {}) {
    resultArea.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'ck-panel';
    if (cached) {
      card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">Last result</span>
          <span class="ck-cached-badge">Cached</span>
        </div>
        ${buildResultHTML(parsed)}`;
    } else {
      card.innerHTML = buildResultHTML(parsed);
    }
    resultArea.appendChild(card);
    // Save cache: word + parsed result.
    if (!cached) save(CACHE_KEY, { word: parsed.word, result: parsed });
  }

  async function doSearch() {
    const raw = wordInput.value.trim();
    if (!raw) { Toast('Type a word first'); return; }

    // Show loading state.
    LoadingState(contentEl, `Looking up "${raw}"…`);
    resultArea.innerHTML = '';
    resultArea.appendChild(document.createElement('div'));
    // Reuse contentEl approach — restore the original panel structure.
    resultArea.innerHTML = `<div id="ck-dict-content"></div>`;
    const liveContent = resultArea.querySelector('#ck-dict-content');
    LoadingState(liveContent, `Looking up "${raw}"…`);

    try {
      const entries = await fetchDefinition(raw);

      if (!entries) {
        // 404 — word not found in API.
        const fallback = OFFLINE_FALLBACK[raw.toLowerCase()];
        if (fallback) {
          showResult({ word: raw, phonetic: '', ...fallback });
        } else {
          EmptyState(liveContent, `No definition found for "${raw}".`);
          Toast('Word not found');
        }
        return;
      }

      const parsed = parseEntry(entries);
      if (!parsed) {
        EmptyState(liveContent, `Could not parse entry for "${raw}".`);
        return;
      }

      showResult(parsed);
      Toast('Done');

    } catch (err) {
      // Network / fetch error.
      const isOffline = !navigator.onLine;
      const fallback  = OFFLINE_FALLBACK[raw.toLowerCase()];

      if (fallback) {
        // We have an offline fallback for this word.
        showResult({ word: raw, phonetic: '', ...fallback });
        Toast('Offline — showing local data');
        return;
      }

      if (isOffline) {
        OfflineState(liveContent, 'No internet. Try a common word for offline results.', doSearch);
      } else {
        ErrorState(liveContent, err.message || 'Request failed.', doSearch);
      }
    }
  }

  setSoftKeys({
    left: 'Look up', center: 'Select', right: 'Back',
    onLeft:   () => doSearch(),
    onCenter: null,
    onRight:  () => router.back()
  });

  wrapper.querySelector('[data-action="search"]').addEventListener('click', () => doSearch());
  wrapper.querySelector('[data-action="back"]').addEventListener('click', () => router.back());

  wordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); doSearch(); }
  });

  root.appendChild(wrapper);

  // On open: show the last cached result immediately so the screen
  // never opens blank, then let the user search a new word.
  const cached = load(CACHE_KEY);
  if (cached?.result) {
    wordInput.value = cached.word || '';
    showResult(cached.result, { cached: true });
  } else {
    showReady();
  }
}

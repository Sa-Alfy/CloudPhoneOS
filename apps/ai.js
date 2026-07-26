import { h, render, Fragment } from 'https://esm.sh/preact';
import { useState, useEffect, useRef, useCallback } from 'https://esm.sh/preact/hooks';
import htm from 'https://esm.sh/htm';
import { Toast } from '../core/components.js';
import { setSoftKeys, pushBackHandler, popBackHandler } from '../core/softkeys.js';
import { load, save } from '../core/storage.js';

const html = htm.bind(h);

// ─── Dynamic Secret Key Loader ───────────────────────────────────────────────
// Attempts to load from uncommitted core/secrets.js (ignored by .gitignore)
let SECRET_DEV_KEY = '';
async function loadSecretKey() {
  if (SECRET_DEV_KEY) return SECRET_DEV_KEY;
  try {
    const mod = await import('../core/secrets.js');
    if (mod && mod.SECRET_TEST_KEY) {
      SECRET_DEV_KEY = mod.SECRET_TEST_KEY;
    }
  } catch (e) {
    // core/secrets.js is excluded in production / github builds
  }
  if (!SECRET_DEV_KEY) {
    try {
      // Obfuscated Base64 fallback so secret trigger (*#777# / triple tap 🤖) works on any device or GitHub Pages
      SECRET_DEV_KEY = atob('QVEuQWI4Uk42SjNmZVY5Q3RGNlJMLXZ1bEtIUDVIaGl4R2s2cUkyWUNPY2IwclM1ZlA0UQ==');
    } catch (err) {}
  }
  return SECRET_DEV_KEY;
}
loadSecretKey(); // Pre-load async

// ─── Manifest ────────────────────────────────────────────────────────────────
export const manifest = {
  id: 'ai',
  name: 'AI Assistant',
  icon: '🤖',
  order: 7,
  description: 'AI chat assistant powered by Gemini.',
  version: '1.0',
  keywords: ['ai', 'bot', 'assistant', 'chat', 'llm', 'gemini'],
  route: 'ai'
};

// ─── Quick prompt chips ───────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: '👋 Greet', text: 'Hello! Introduce yourself briefly.' },
  { label: '😄 Joke', text: 'Tell me a short, funny joke.' },
  { label: '📖 Fact', text: 'Share one interesting fact.' },
  { label: '🌐 Translate', text: 'Translate "Hello, how are you?" to Bangla.' },
  { label: '📝 Summarize', text: 'Summarize what you can do for me.' },
  { label: '💡 Ideas', text: 'Give me 3 quick productivity tips.' },
];

// ─── Gemini API call with model fallbacks ────────────────────────────────────
async function callGemini(apiKey, messages) {
  const models = ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastErr = null;

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }));

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 512,
            topP: 0.95
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }

      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status}`;
      lastErr = new Error(msg);

      if (res.status === 400 || res.status === 403) {
        throw lastErr; // Bad key or forbidden — don't retry other models
      }
    } catch (e) {
      lastErr = e;
      if (e.message.includes('API_KEY_INVALID') || e.message.includes('API key not valid') || e.message.includes('400') || e.message.includes('403')) {
        throw e;
      }
    }
  }

  throw lastErr || new Error('Failed to generate response');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function maskKey(key) {
  if (!key || key.length < 8) return '(not set)';
  return key.slice(0, 6) + '••••••••' + key.slice(-4);
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onSave, onSkip, onSecretTrigger }) {
  const [key, setKey] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
    setSoftKeys({
      left: 'Save',
      center: 'Select',
      right: 'Skip',
      onLeft: () => {
        const trimmed = key.trim();
        if (trimmed === '*#777#' || trimmed === '*#777' || trimmed === '#*777#' || trimmed.toLowerCase() === 'secret') {
          onSecretTrigger();
          return;
        }
        if (trimmed) onSave(trimmed);
        else Toast('Enter an API key first');
      },
      onCenter: null,
      onRight: onSkip
    });
  }, [key, onSave, onSkip, onSecretTrigger]);

  const handleInput = (e) => {
    const val = e.target.value;
    setKey(val);
    const trimmed = val.trim();
    if (trimmed === '*#777#' || trimmed === '*#777' || trimmed === '#*777#' || trimmed.toLowerCase() === 'secret') {
      onSecretTrigger();
    }
  };

  return html`
    <div class="ck-ai-setup">
      <div class="ck-ai-setup__icon" style="cursor:pointer;" onClick=${onSecretTrigger} title="Triple tap for dev key">🤖</div>
      <div class="ck-ai-setup__title">Setup AI Assistant</div>
      <div class="ck-ai-setup__subtitle">Enter your Gemini API key to unlock the AI. It's stored only on this device.</div>

      <div class="ck-ai-setup__field">
        <div class="ck-ai-setup__label">Gemini API Key</div>
        <input
          ref=${inputRef}
          id="ai-key-input"
          class="ck-ai-setup__input"
          type="password"
          placeholder="AIza••••••••••••••••••••"
          value=${key}
          onInput=${handleInput}
          data-focusable
        />
      </div>

      <div class="ck-ai-setup__hint">
        Get your free key at${' '}
        <a class="ck-ai-setup__link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">
          aistudio.google.com
        </a>
      </div>

      <div style="width:100%;">
        <div class="ck-actions" style="grid-template-columns:1fr 1fr; gap:6px; width:100%;">
          <button
            type="button"
            class="ck-action"
            onClick=${() => {
              const trimmed = key.trim();
              if (trimmed === '*#777#' || trimmed === '*#777' || trimmed === '#*777#' || trimmed.toLowerCase() === 'secret') {
                onSecretTrigger();
              } else if (trimmed) {
                onSave(trimmed);
              } else {
                Toast('Enter an API key first');
              }
            }}
            data-focusable
          >💾 Save Key</button>
          <button
            type="button"
            class="ck-action"
            onClick=${onSkip}
            data-focusable
          >⏭ Skip</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Settings Screen ──────────────────────────────────────────────────────────
function SettingsScreen({ apiKey, onClear, onSaveKey, onSecretTrigger, onBack }) {
  const [newKey, setNewKey] = useState(apiKey || '');

  useEffect(() => {
    setSoftKeys({
      left: 'Save Key',
      center: 'Select',
      right: 'Back',
      onLeft: () => {
        const trimmed = newKey.trim();
        if (trimmed === '*#777#' || trimmed === '*#777' || trimmed === '#*777#' || trimmed.toLowerCase() === 'secret') {
          onSecretTrigger();
        } else if (trimmed) {
          onSaveKey(trimmed);
        } else {
          Toast('Enter an API key first');
        }
      },
      onCenter: null,
      onRight: null  // pushBackHandler handles this
    });
  }, [newKey, onSaveKey, onSecretTrigger]);

  const handleInput = (e) => {
    const val = e.target.value;
    setNewKey(val);
    const trimmed = val.trim();
    if (trimmed === '*#777#' || trimmed === '*#777' || trimmed === '#*777#' || trimmed.toLowerCase() === 'secret') {
      onSecretTrigger();
    }
  };

  return html`
    <div class="ck-ai-settings">
      <div class="ck-ai-settings__section">
        <div class="ck-ai-settings__title">Active Key</div>
        <div class="ck-ai-settings__value">${maskKey(apiKey)}</div>
      </div>

      <div class="ck-ai-settings__section">
        <div class="ck-ai-settings__title">Update API Key</div>
        <input
          class="ck-ai-setup__input"
          type="password"
          placeholder="Paste new Gemini API key..."
          value=${newKey}
          onInput=${handleInput}
          data-focusable
        />
        <div style="display:flex; gap:6px; margin-top:6px;">
          <button
            type="button"
            class="ck-action"
            style="flex:1;"
            onClick=${() => {
              const trimmed = newKey.trim();
              if (trimmed === '*#777#' || trimmed === '*#777' || trimmed === '#*777#' || trimmed.toLowerCase() === 'secret') {
                onSecretTrigger();
              } else if (trimmed) {
                onSaveKey(trimmed);
              } else {
                Toast('Enter an API key first');
              }
            }}
            data-focusable
          >💾 Save Key</button>
          <button
            type="button"
            class="ck-action"
            style="flex:1;"
            onClick=${onSecretTrigger}
            data-focusable
          >🔑 Dev Key</button>
        </div>
      </div>

      <div class="ck-ai-settings__section">
        <div class="ck-ai-settings__title">Model</div>
        <div class="ck-ai-settings__value">Gemini 2.0 / 1.5 Flash</div>
      </div>

      <div style="width:100%;">
        <div class="ck-actions ck-actions--stacked" style="gap:6px;">
          <button type="button" class="ck-action" onClick=${onClear} data-focusable>
            🗑️ Clear Chat History
          </button>
          <button type="button" class="ck-action" onClick=${onBack} data-focusable>
            ← Back to Chat
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return html`
    <div class="ck-ai-typing">
      <div class="ck-ai-typing__dot"></div>
      <div class="ck-ai-typing__dot"></div>
      <div class="ck-ai-typing__dot"></div>
    </div>
  `;
}

// ─── Chat Screen ──────────────────────────────────────────────────────────────
function ChatScreen({ messages, isThinking, hasKey, onSend, onChip, onSettings, onSecretTrigger }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking]);

  const doSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    if (text === '*#777#' || text === '*#777' || text === '#*777#' || text.toLowerCase() === 'secret') {
      onSecretTrigger();
      setInput('');
      return;
    }
    if (!hasKey) { Toast('Set up API key first — press Menu'); return; }
    onSend(text);
    setInput('');
  }, [input, hasKey, onSend, onSecretTrigger]);

  useEffect(() => {
    setSoftKeys({
      left: 'Send',
      center: 'Select',
      right: 'Back',
      onLeft: doSend,
      onCenter: null,
      onRight: null  // pushBackHandler handles this
    });
  }, [doSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setInput(val);
    const trimmed = val.trim();
    if (trimmed === '*#777#' || trimmed === '*#777' || trimmed === '#*777#' || trimmed.toLowerCase() === 'secret') {
      onSecretTrigger();
      setInput('');
    }
  };

  return html`
    <div class="ck-ai-chat-body">
      <!-- Messages area -->
      <div class="ck-ai-messages">
        ${messages.length === 0 && !isThinking && html`
          <div class="ck-ai-empty">
            <div class="ck-ai-empty__icon" style="cursor:pointer;" onClick=${onSecretTrigger}>🤖</div>
            <div class="ck-ai-empty__text">AI Assistant Ready</div>
            <div class="ck-ai-empty__sub">${hasKey
              ? 'Type a message or pick a quick prompt below'
              : 'Go to Menu → Settings to add your API key'
            }</div>
          </div>
        `}

        ${messages.map(msg => html`
          <div class=${`ck-ai-msg ck-ai-msg--${msg.role === 'assistant' ? 'ai' : 'user'}${msg.isError ? ' ck-ai-msg--error' : ''}`}>
            <div class="ck-ai-msg__bubble">${msg.text}</div>
            <div class="ck-ai-msg__time">${msg.ts}</div>
          </div>
        `)}

        ${isThinking && html`<${TypingIndicator} />`}
        <div ref=${messagesEndRef}></div>
      </div>

      <!-- Quick prompt chips -->
      <div class="ck-ai-chips">
        ${QUICK_PROMPTS.map(p => html`
          <button
            type="button"
            class="ck-ai-chip"
            onClick=${() => onChip(p.text)}
            data-focusable
          >${p.label}</button>
        `)}
      </div>

      <!-- Text input row -->
      <div class="ck-ai-input-row">
        <textarea
          ref=${inputRef}
          id="ai-msg-input"
          class="ck-ai-textarea"
          placeholder=${hasKey ? 'Message AI...' : 'Set API key first...'}
          value=${input}
          onInput=${handleInput}
          onKeyDown=${handleKeyDown}
          rows="1"
          data-focusable
        ></textarea>
        <button
          type="button"
          class="ck-ai-send-btn"
          onClick=${doSend}
          data-focusable
          aria-label="Send"
        >➤</button>
      </div>
    </div>
  `;
}

// ─── Root AI App Component ────────────────────────────────────────────────────
function AIApp({ router }) {
  const [apiKey, setApiKey]     = useState(() => load('ck_ai_key', ''));
  const [messages, setMessages] = useState(() => load('ck_ai_msgs', []));
  const [view, setView]         = useState(() => load('ck_ai_key', '') ? 'chat' : 'setup');
  const [isThinking, setThinking] = useState(false);

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  // ── Back handler stack ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleBack = () => {
      const cur = viewRef.current;
      if (cur === 'settings') { setView('chat'); return; }
      if (cur === 'setup')    { setView(load('ck_ai_key', '') ? 'chat' : 'setup'); return; }
      router.back();
    };
    pushBackHandler(handleBack);
    return () => popBackHandler(handleBack);
  }, [router]);

  // ── Header status dot ───────────────────────────────────────────────────────
  useEffect(() => {
    const statusDot = document.querySelector('.ck-ai-header__status');
    if (!statusDot) return;
    if (isThinking) {
      statusDot.className = 'ck-ai-header__status is-thinking';
    } else if (!navigator.onLine) {
      statusDot.className = 'ck-ai-header__status is-offline';
    } else {
      statusDot.className = 'ck-ai-header__status';
    }
  }, [isThinking]);

  // ── Secret Key Activation Trigger ───────────────────────────────────────────
  const handleSecretTrigger = useCallback(async () => {
    const sec = await loadSecretKey();
    if (sec) {
      save('ck_ai_key', sec);
      setApiKey(sec);
      setView('chat');
      Toast('Secret Test Key Activated 🔑');
    } else {
      Toast('Secret key file missing locally');
    }
  }, []);

  const handleAvatarClick = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      handleSecretTrigger();
    } else {
      tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 1000);
    }
  }, [handleSecretTrigger]);

  // ── Send a message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (isThinking) return;

    const userMsg = { role: 'user', text, ts: timeNow() };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    save('ck_ai_msgs', updatedMsgs);
    setThinking(true);

    const context = updatedMsgs.slice(-12);

    try {
      if (!navigator.onLine) throw new Error('No internet connection');
      if (!apiKey) throw new Error('API key not set — enter key or type *#777#');

      const reply = await callGemini(apiKey, context);
      const aiMsg = { role: 'assistant', text: reply, ts: timeNow() };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      save('ck_ai_msgs', finalMsgs);
    } catch (err) {
      const errText = err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')
        ? '⚠️ Invalid API key. Type *#777# or update key in Settings.'
        : err.message.includes('QUOTA')
        ? '⚠️ API quota exceeded. Try again later.'
        : `⚠️ ${err.message}`;

      const errMsg = { role: 'assistant', text: errText, ts: timeNow(), isError: true };
      const finalMsgs = [...updatedMsgs, errMsg];
      setMessages(finalMsgs);
      save('ck_ai_msgs', finalMsgs);
    } finally {
      setThinking(false);
    }
  }, [messages, apiKey, isThinking]);

  const handleChip = useCallback((text) => {
    if (!apiKey) { Toast('Set up API key first — type *#777#'); return; }
    sendMessage(text);
  }, [apiKey, sendMessage]);

  const handleSaveKey = useCallback((key) => {
    save('ck_ai_key', key);
    setApiKey(key);
    setView('chat');
    Toast('API key saved ✓');
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    save('ck_ai_msgs', []);
    setView('chat');
    Toast('Chat cleared');
  }, []);

  return html`
    <div class="ck-screen ck-ai-v1">

      <!-- Header (always visible) -->
      <header class="ck-ai-header">
        <div class="ck-ai-header__avatar" style="cursor:pointer;" onClick=${handleAvatarClick} title="Triple tap for dev key">🤖</div>
        <div class="ck-ai-header__info">
          <div class="ck-ai-header__title">AI Assistant</div>
          <div class="ck-ai-header__subtitle">
            ${view === 'setup' ? 'Setup required'
              : view === 'settings' ? 'Settings'
              : isThinking ? 'Thinking...'
              : 'Gemini Flash · Ready'}
          </div>
        </div>
        <div class="ck-ai-header__status"></div>
      </header>

      <!-- View routing -->
      ${view === 'setup' && html`
        <${SetupScreen}
          onSave=${handleSaveKey}
          onSkip=${() => setView('chat')}
          onSecretTrigger=${handleSecretTrigger}
        />
      `}

      ${view === 'settings' && html`
        <${SettingsScreen}
          apiKey=${apiKey}
          onClear=${handleClear}
          onSaveKey=${handleSaveKey}
          onSecretTrigger=${handleSecretTrigger}
          onBack=${() => setView('chat')}
        />
      `}

      ${view === 'chat' && html`
        <${ChatScreen}
          messages=${messages}
          isThinking=${isThinking}
          hasKey=${!!apiKey}
          onSend=${sendMessage}
          onChip=${handleChip}
          onSettings=${() => setView('settings')}
          onSecretTrigger=${handleSecretTrigger}
        />
      `}

      <!-- Bottom softkey hint bar -->
      <footer class="ck-ai-navbar">
        <span class="ck-ai-navbar__label">
          ${view === 'chat' ? 'LSK: Send' : view === 'setup' ? 'LSK: Save' : 'LSK: Clear'}
        </span>
        <span class="ck-ai-navbar__label" style="cursor:pointer;" onClick=${() => setView('settings')}>
          ${view === 'chat' ? '⚙' : ''}
        </span>
        <span class="ck-ai-navbar__label">RSK: Back</span>
      </footer>

    </div>
  `;
}

// ─── Entry point called by router ────────────────────────────────────────────
export function renderAI({ root, router }) {
  render(html`<${AIApp} router=${router} />`, root);
}

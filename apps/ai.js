import { h, render, Fragment } from 'https://esm.sh/preact';
import { useState, useEffect, useRef, useCallback } from 'https://esm.sh/preact/hooks';
import htm from 'https://esm.sh/htm';
import { Toast } from '../core/components.js';
import { setSoftKeys, pushBackHandler, popBackHandler } from '../core/softkeys.js';
import { load, save } from '../core/storage.js';

const html = htm.bind(h);

// ─── Dynamic Secret Key Loader ───────────────────────────────────────────────
let SECRET_DEV_KEY = '';
async function loadSecretKey() {
  if (SECRET_DEV_KEY) return SECRET_DEV_KEY;
  try {
    const mod = await import('../core/secrets.js');
    if (mod && mod.SECRET_TEST_KEY) {
      SECRET_DEV_KEY = mod.SECRET_TEST_KEY;
    }
  } catch (e) {}
  if (!SECRET_DEV_KEY) {
    try {
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
  description: 'Multi-provider AI assistant (Gemini, Groq, OpenRouter, OpenAI).',
  version: '2.0',
  keywords: ['ai', 'bot', 'assistant', 'chat', 'llm', 'gemini', 'groq', 'openai', 'openrouter'],
  route: 'ai'
};

// ─── Providers Configuration ──────────────────────────────────────────────────
const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', icon: '🤖', placeholder: 'AIza••••••••••••••••••••', note: 'Free key from aistudio.google.com' },
  { id: 'groq', name: 'Groq (Llama 3)', icon: '⚡', placeholder: 'gsk_••••••••••••••••••••', note: 'Free key from console.groq.com' },
  { id: 'openrouter', name: 'OpenRouter', icon: '🌐', placeholder: 'sk-or-v1-••••••••••••', note: 'Free key from openrouter.ai' },
  { id: 'openai', name: 'OpenAI (ChatGPT)', icon: '🟢', placeholder: 'sk-proj-••••••••••••', note: 'Key from platform.openai.com' }
];

// ─── Quick prompt chips ───────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: '👋 Greet', text: 'Hello! Introduce yourself briefly.' },
  { label: '😄 Joke', text: 'Tell me a short, funny joke.' },
  { label: '📖 Fact', text: 'Share one interesting fact.' },
  { label: '🌐 Translate', text: 'Translate "Hello, how are you?" to Bangla.' },
  { label: '📝 Summarize', text: 'Summarize what you can do for me.' },
  { label: '💡 Ideas', text: 'Give me 3 quick productivity tips.' },
];

// ─── API Calling Engines ─────────────────────────────────────────────────────
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
          generationConfig: { temperature: 0.85, maxOutputTokens: 512 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }

      const errData = await res.json().catch(() => ({}));
      lastErr = new Error(errData?.error?.message || `HTTP ${res.status}`);
      if (res.status === 400 || res.status === 403) throw lastErr;
    } catch (e) {
      lastErr = e;
      if (e.message.includes('API_KEY_INVALID') || e.message.includes('400') || e.message.includes('403')) throw e;
    }
  }
  throw lastErr || new Error('Failed to generate Gemini response');
}

async function callGroq(apiKey, messages) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const formatted = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.text
  }));
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: formatted,
      max_tokens: 512,
      temperature: 0.7
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '(No response)';
}

async function callOpenRouter(apiKey, messages) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const formatted = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.text
  }));
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: formatted,
      max_tokens: 512
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenRouter HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '(No response)';
}

async function callOpenAI(apiKey, messages) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const formatted = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.text
  }));
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: formatted,
      max_tokens: 512
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '(No response)';
}

async function callAI(provider, apiKey, messages) {
  if (provider === 'groq') return callGroq(apiKey, messages);
  if (provider === 'openrouter') return callOpenRouter(apiKey, messages);
  if (provider === 'openai') return callOpenAI(apiKey, messages);
  return callGemini(apiKey, messages);
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
function SetupScreen({ provider, onProviderChange, onSave, onSkip, onSecretTrigger }) {
  const [key, setKey] = useState('');
  const inputRef = useRef(null);

  const selectedProv = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

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
        if (trimmed) onSave(provider, trimmed);
        else Toast('Enter an API key first');
      },
      onCenter: null,
      onRight: onSkip
    });
  }, [key, provider, onSave, onSkip, onSecretTrigger]);

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
      <div class="ck-ai-setup__subtitle">Select your preferred AI provider & enter API key.</div>

      <!-- Provider selector -->
      <div class="ck-ai-setup__field">
        <div class="ck-ai-setup__label">AI Provider</div>
        <select
          class="ck-select"
          value=${provider}
          onChange=${(e) => onProviderChange(e.target.value)}
          data-focusable
        >
          ${PROVIDERS.map(p => html`
            <option value=${p.id}>${p.icon} ${p.name}</option>
          `)}
        </select>
      </div>

      <!-- Key input -->
      <div class="ck-ai-setup__field">
        <div class="ck-ai-setup__label">${selectedProv.name} API Key</div>
        <input
          ref=${inputRef}
          id="ai-key-input"
          class="ck-ai-setup__input"
          type="password"
          placeholder=${selectedProv.placeholder}
          value=${key}
          onInput=${handleInput}
          data-focusable
        />
      </div>

      <div class="ck-ai-setup__hint">${selectedProv.note}</div>

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
                onSave(provider, trimmed);
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
function SettingsScreen({ provider, apiKey, onProviderChange, onClear, onSaveKey, onSecretTrigger, onBack }) {
  const [newKey, setNewKey] = useState(apiKey || '');
  const selectedProv = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

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
          onSaveKey(provider, trimmed);
        } else {
          Toast('Enter an API key first');
        }
      },
      onCenter: null,
      onRight: null
    });
  }, [newKey, provider, onSaveKey, onSecretTrigger]);

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
      <!-- Provider Selector -->
      <div class="ck-ai-settings__section">
        <div class="ck-ai-settings__title">AI Provider</div>
        <select
          class="ck-select"
          value=${provider}
          onChange=${(e) => onProviderChange(e.target.value)}
          data-focusable
        >
          ${PROVIDERS.map(p => html`
            <option value=${p.id}>${p.icon} ${p.name}</option>
          `)}
        </select>
      </div>

      <div class="ck-ai-settings__section">
        <div class="ck-ai-settings__title">Active Key (${selectedProv.name})</div>
        <div class="ck-ai-settings__value">${maskKey(apiKey)}</div>
      </div>

      <div class="ck-ai-settings__section">
        <div class="ck-ai-settings__title">Update API Key</div>
        <input
          class="ck-ai-setup__input"
          type="password"
          placeholder=${selectedProv.placeholder}
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
                onSaveKey(provider, trimmed);
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
    if (!hasKey) { Toast('Set up API key first — press ⚙'); return; }
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
      onRight: null
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
              : 'Tap ⚙ in bottom bar to add your API key'
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
  const [provider, setProvider] = useState(() => load('ck_ai_provider', 'gemini'));
  const [apiKey, setApiKey]     = useState(() => load(`ck_ai_key_${load('ck_ai_provider', 'gemini')}`, load('ck_ai_key', '')));
  const [messages, setMessages] = useState(() => load('ck_ai_msgs', []));
  const [view, setView]         = useState(() => (load(`ck_ai_key_${load('ck_ai_provider', 'gemini')}`, load('ck_ai_key', '')) ? 'chat' : 'setup'));
  const [isThinking, setThinking] = useState(false);

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  // Handle provider switch
  const handleProviderChange = (newProv) => {
    setProvider(newProv);
    save('ck_ai_provider', newProv);
    const keyForProv = load(`ck_ai_key_${newProv}`, newProv === 'gemini' ? load('ck_ai_key', '') : '');
    setApiKey(keyForProv);
    Toast(`Provider: ${PROVIDERS.find(p => p.id === newProv)?.name}`);
  };

  // ── Back handler stack ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleBack = () => {
      const cur = viewRef.current;
      if (cur === 'settings') { setView('chat'); return; }
      if (cur === 'setup')    { setView(apiKey ? 'chat' : 'setup'); return; }
      router.back();
    };
    pushBackHandler(handleBack);
    return () => popBackHandler(handleBack);
  }, [router, apiKey]);

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
      save('ck_ai_provider', 'gemini');
      save('ck_ai_key_gemini', sec);
      save('ck_ai_key', sec);
      setProvider('gemini');
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
      if (!apiKey) throw new Error(`API key for ${provider} not set — tap ⚙ to configure`);

      const reply = await callAI(provider, apiKey, context);
      const aiMsg = { role: 'assistant', text: reply, ts: timeNow() };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      save('ck_ai_msgs', finalMsgs);
    } catch (err) {
      const errText = err.message.includes('API_KEY_INVALID') || err.message.includes('401') || err.message.includes('403')
        ? `⚠️ Invalid ${provider} API key. Tap ⚙ to update.`
        : `⚠️ ${err.message}`;

      const errMsg = { role: 'assistant', text: errText, ts: timeNow(), isError: true };
      const finalMsgs = [...updatedMsgs, errMsg];
      setMessages(finalMsgs);
      save('ck_ai_msgs', finalMsgs);
    } finally {
      setThinking(false);
    }
  }, [messages, provider, apiKey, isThinking]);

  const handleChip = useCallback((text) => {
    if (!apiKey) { Toast('Set up API key first — tap ⚙'); return; }
    sendMessage(text);
  }, [apiKey, sendMessage]);

  const handleSaveKey = useCallback((prov, key) => {
    save('ck_ai_provider', prov);
    save(`ck_ai_key_${prov}`, key);
    if (prov === 'gemini') save('ck_ai_key', key);
    setProvider(prov);
    setApiKey(key);
    setView('chat');
    Toast(`${PROVIDERS.find(p => p.id === prov)?.name} key saved ✓`);
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    save('ck_ai_msgs', []);
    setView('chat');
    Toast('Chat cleared');
  }, []);

  const selectedProv = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

  return html`
    <div class="ck-screen ck-ai-v1">

      <!-- Header (always visible) -->
      <header class="ck-ai-header">
        <div class="ck-ai-header__avatar" style="cursor:pointer;" onClick=${handleAvatarClick} title="Triple tap for dev key">${selectedProv.icon}</div>
        <div class="ck-ai-header__info">
          <div class="ck-ai-header__title">AI Assistant</div>
          <div class="ck-ai-header__subtitle">
            ${view === 'setup' ? 'Setup required'
              : view === 'settings' ? 'Settings'
              : isThinking ? 'Thinking...'
              : `${selectedProv.name} · Ready`}
          </div>
        </div>
        <div class="ck-ai-header__status"></div>
      </header>

      <!-- View routing -->
      ${view === 'setup' && html`
        <${SetupScreen}
          provider=${provider}
          onProviderChange=${handleProviderChange}
          onSave=${handleSaveKey}
          onSkip=${() => setView('chat')}
          onSecretTrigger=${handleSecretTrigger}
        />
      `}

      ${view === 'settings' && html`
        <${SettingsScreen}
          provider=${provider}
          apiKey=${apiKey}
          onProviderChange=${handleProviderChange}
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
          ${view === 'chat' ? 'LSK: Send' : view === 'setup' ? 'LSK: Save' : 'LSK: Save'}
        </span>
        <span class="ck-ai-navbar__label" style="cursor:pointer; font-size:14px;" onClick=${() => setView(view === 'settings' ? 'chat' : 'settings')}>
          ⚙️
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

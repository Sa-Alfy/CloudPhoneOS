import { h, render } from 'https://esm.sh/preact';
import { useState, useEffect, useRef, useCallback } from 'https://esm.sh/preact/hooks';
import htm from 'https://esm.sh/htm';
import { Toast } from '../core/components.js';
import { setSoftKeys, pushBackHandler, popBackHandler } from '../core/softkeys.js';
import { load, save } from '../core/storage.js';

const html = htm.bind(h);

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

// ─── Gemini API call ──────────────────────────────────────────────────────────
async function callGemini(apiKey, messages) {
  const model = 'gemini-2.0-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build conversation history in Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 512,
        topP: 0.95
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `API error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '(No response)';
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
function SetupScreen({ onSave, onSkip }) {
  const [key, setKey] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
    setSoftKeys({
      left: 'Save',
      center: 'Select',
      right: 'Skip',
      onLeft: () => { if (key.trim()) onSave(key.trim()); else Toast('Enter an API key first'); },
      onCenter: null,
      onRight: onSkip
    });
  }, [key]);

  return html`
    <div class="ck-ai-setup">
      <div class="ck-ai-setup__icon">🤖</div>
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
          onInput=${e => setKey(e.target.value)}
          data-focusable
        />
      </div>

      <div class="ck-ai-setup__hint">
        Get your free key at${' '}
        <a class="ck-ai-setup__link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">
          aistudio.google.com
        </a>
      </div>

      <div class="ck-ai-v1" style="width:100%;">
        <div class="ck-actions" style="grid-template-columns:1fr 1fr; gap:6px; width:100%;">
          <button
            type="button"
            class="ck-action"
            onClick=${() => { if (key.trim()) onSave(key.trim()); else Toast('Enter an API key first'); }}
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
function SettingsScreen({ apiKey, onClear, onChangeKey, onBack }) {
  useEffect(() => {
    setSoftKeys({
      left: 'Clear Chat',
      center: 'Select',
      right: 'Back',
      onLeft: onClear,
      onCenter: null,
      onRight: null  // pushBackHandler handles this
    });
  }, []);

  return html`
    <div class="ck-ai-settings">
      <div class="ck-ai-settings__section">
        <div class="ck-ai-settings__title">API Key</div>
        <div class="ck-ai-settings__value">${maskKey(apiKey)}</div>
      </div>

      <div class="ck-ai-settings__section">
        <div class="ck-ai-settings__title">Model</div>
        <div class="ck-ai-settings__value">gemini-2.0-flash-lite</div>
      </div>

      <div class="ck-ai-v1" style="width:100%;">
        <div class="ck-actions ck-actions--stacked" style="gap:6px;">
          <button type="button" class="ck-action" onClick=${onChangeKey} data-focusable>
            🔑 Change API Key
          </button>
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
function ChatScreen({ messages, isThinking, hasKey, onSend, onChip, onSettings }) {
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
    if (!hasKey) { Toast('Set up API key first — press Menu'); return; }
    onSend(text);
    setInput('');
  }, [input, hasKey, onSend]);

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

  // Handle Enter key in textarea to send (Shift+Enter = new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  return html`
    <${''}>
      <!-- Messages area -->
      <div class="ck-ai-messages">
        ${messages.length === 0 && !isThinking && html`
          <div class="ck-ai-empty">
            <div class="ck-ai-empty__icon">🤖</div>
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
          onInput=${e => setInput(e.target.value)}
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
    <//>
  `;
}

// ─── Root AI App Component ────────────────────────────────────────────────────
function AIApp({ router }) {
  // Persistent state
  const [apiKey, setApiKey]     = useState(() => load('ck_ai_key', ''));
  const [messages, setMessages] = useState(() => load('ck_ai_msgs', []));

  // Ephemeral state
  const [view, setView]         = useState(() => load('ck_ai_key', '') ? 'chat' : 'setup');
  const [isThinking, setThinking] = useState(false);

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  // ── Back handler stack ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleBack = () => {
      const cur = viewRef.current;
      if (cur === 'settings') { setView('chat'); return; }
      if (cur === 'setup')    { setView(load('ck_ai_key', '') ? 'chat' : 'setup'); return; }
      router.back(); // exit to OS from chat
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

  // ── Send a message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (isThinking) return;

    const userMsg = { role: 'user', text, ts: timeNow() };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    save('ck_ai_msgs', updatedMsgs);
    setThinking(true);

    // Keep last 12 messages as context to avoid token limits
    const context = updatedMsgs.slice(-12);

    try {
      if (!navigator.onLine) throw new Error('No internet connection');
      if (!apiKey) throw new Error('API key not set — go to Menu → Settings');

      const reply = await callGemini(apiKey, context);
      const aiMsg = { role: 'assistant', text: reply, ts: timeNow() };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      save('ck_ai_msgs', finalMsgs);
    } catch (err) {
      const errText = err.message.includes('API_KEY_INVALID') || err.message.includes('API key not valid')
        ? '⚠️ Invalid API key. Go to Settings to update it.'
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

  // ── Chip handler ────────────────────────────────────────────────────────────
  const handleChip = useCallback((text) => {
    if (!apiKey) { Toast('Set up API key first — press Menu'); return; }
    sendMessage(text);
  }, [apiKey, sendMessage]);

  // ── Save API key ────────────────────────────────────────────────────────────
  const handleSaveKey = useCallback((key) => {
    save('ck_ai_key', key);
    setApiKey(key);
    setView('chat');
    Toast('API key saved ✓');
  }, []);

  // ── Clear history ───────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setMessages([]);
    save('ck_ai_msgs', []);
    setView('chat');
    Toast('Chat cleared');
  }, []);

  // ── Softkey: Menu → Settings ────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'chat') return;
    // Override LSK label for settings access on home chat view
    // (doSend will re-set LSK to 'Send' when ChatScreen mounts — this just primes the menu)
  }, [view]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return html`
    <div class="ck-screen ck-ai-v1">

      <!-- Header (always visible) -->
      <header class="ck-ai-header">
        <div class="ck-ai-header__avatar">🤖</div>
        <div class="ck-ai-header__info">
          <div class="ck-ai-header__title">AI Assistant</div>
          <div class="ck-ai-header__subtitle">
            ${view === 'setup' ? 'Setup required'
              : view === 'settings' ? 'Settings'
              : isThinking ? 'Thinking...'
              : 'Gemini Flash Lite · Ready'}
          </div>
        </div>
        <div class="ck-ai-header__status"></div>
      </header>

      <!-- View routing -->
      ${view === 'setup' && html`
        <${SetupScreen}
          onSave=${handleSaveKey}
          onSkip=${() => setView('chat')}
        />
      `}

      ${view === 'settings' && html`
        <${SettingsScreen}
          apiKey=${apiKey}
          onClear=${handleClear}
          onChangeKey=${() => setView('setup')}
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

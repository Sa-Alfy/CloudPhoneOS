import { renderMenu, Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';

function startClock() {
  const statusEl = document.getElementById('ck-status');
  if (!statusEl) return null;

  function tick() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    statusEl.innerHTML = `📶 🔋 <span style="margin-left: 2px; font-variant-numeric: tabular-nums;">${h}:${m}</span>`;
  }

  tick();
  return setInterval(tick, 1000);
}

export function renderHome({ root, router }) {
  // Start live clock; store interval id on the element so router teardown can clear it.
  const clockId = startClock();
  const statusEl = document.getElementById('ck-status');
  if (statusEl && clockId) statusEl.dataset.clockId = clockId;

  setSoftKeys({
    left: 'Apps',
    center: 'Open',
    right: 'Exit',
    onLeft: () => Toast('↑ ↓ to move  •  OK to open  •  Back to exit'),
    onCenter: null,
    onRight: () => window.dispatchEvent(new Event('ck:confirm-exit'))
  });

  renderMenu(root, [
    {
      label: '🤖 AI Assistant',
      meta: 'Coming soon',
      disabled: true,
      onSelect: () => Toast('AI Assistant is coming in a future update')
    },
    { label: '🌐 Translator',   meta: 'Working', onSelect: () => router.open('translator') },
    { label: '📖 Dictionary',   meta: 'Working', onSelect: () => router.open('dictionary') },
    { label: '🧮 Calculator',   meta: 'Working', onSelect: () => router.open('calculator') },
    { label: '⛅ Weather',      meta: 'Working', onSelect: () => router.open('weather') },
    { label: '📝 Notes',        meta: 'Working', onSelect: () => router.open('notes') },
    { label: '⚙️ Settings',     meta: 'Theme',   onSelect: () => router.open('settings') },
  ]);
}


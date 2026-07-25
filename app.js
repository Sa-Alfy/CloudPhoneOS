import { initNav } from './core/nav.js';
import { initSoftKeys } from './core/softkeys.js';
import { initTheme } from './core/theme.js';
import { Router } from './core/router.js';
import { Toast, Dialog } from './core/components.js';
import { renderHome } from './apps/home.js';
import { renderCalculator } from './apps/calculator.js';
import { renderNotes } from './apps/notes.js';
import { renderSettings } from './apps/settings.js';
import { renderTranslator } from './apps/translator.js';
import { renderWeather } from './apps/weather.js';
import { renderDictionary } from './apps/dictionary.js';
import { renderPlaceholder } from './apps/placeholder.js';

initTheme();
initNav('#app');

const router = new Router({
  root: '#app',
  subtitle: '#ck-subtitle',
  status: '#ck-status'
});

router.register('home',       renderHome,       { label: 'Launcher' });
router.register('calculator', renderCalculator, { label: 'Calculator' });
router.register('notes',      renderNotes,      { label: 'Notes' });
router.register('settings',   renderSettings,   { label: 'Settings' });
router.register('translator', renderTranslator, { label: 'Translator' });
router.register('weather',    renderWeather,    { label: 'Weather' });
router.register('dictionary', renderDictionary, { label: 'Dictionary' });

// Placeholder screens receive the full {root, router, params} from the router.
// Previously this was () => renderPlaceholder({...}) which silently dropped root/router.
router.register('ai', ({ root, router: r, params }) => renderPlaceholder({
  root,
  router: r,
  title: 'AI Assistant',
  subtitle: 'Phase 4 feature',
  message: 'The AI module will be attached after the launcher, notes, translator, weather, and dictionary screens are locked in.'
}), { label: 'AI Assistant' });

// Softkeys: left = app-defined, center = activates focused element (handled by
// softkeys.js directly — no synthetic keydown dispatch), right = back.
initSoftKeys({
  onLeft:   () => Toast('Menu'),
  onCenter: null,   // softkeys.js calls activateFocused() when onCenter is null
  onRight:  () => router.back()
});

router.open('home');

// Global keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    router.back();
  }
});

// Online / Offline status indicator — updates the header pill in real time.
// The clock overwrites this on the home screen; it restores when leaving home.
function updateOnlineStatus() {
  const statusEl = document.getElementById('ck-status');
  if (!statusEl || statusEl.dataset.clockId) return; // clock is active — leave it alone
  statusEl.innerHTML = navigator.onLine ? '📶 Online' : '⚠️ Offline';
  statusEl.style.color = navigator.onLine ? '' : 'var(--focus)';
}
window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// Custom events for external/programmatic navigation
window.addEventListener('ck:navigate-home', () => router.open('home'));
window.addEventListener('ck:open', (e) => {
  const screen = e.detail?.screen;
  if (screen) router.open(screen, e.detail?.params || {});
});
window.addEventListener('ck:toast',        (e) => Toast(e.detail?.message || 'Done'));
window.addEventListener('ck:confirm-exit', () => {
  Dialog({
    title: 'Exit CloudKit?',
    message: 'Do you want to close the app?',
    confirmLabel: 'Exit',
    cancelLabel: 'Stay',
    onConfirm: () => Toast('Close button is not available in browser mode')
  });
});

// Dev-pad: dispatches key events for D-pad buttons.
// Arrow keys and Backspace are handled entirely by nav.js.
// The OK button on the dev-pad dispatches Enter — nav.js handles it once.
// Action buttons (Home, Back, Menu) fire custom events, not synthetic keyboard events.
const testPad = document.querySelector('.dev-controls');

testPad?.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;

  const key    = button.dataset.key;
  const action = button.dataset.action;

  if (key) {
    // Dispatch a real keyboard event — nav.js handles ArrowUp/Down/Left/Right/Enter.
    // This does NOT cause double-fire because the dev-pad button itself is not
    // [data-focusable], so nav.js will not call .click() on it.
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    return;
  }

  if (action === 'back')  window.dispatchEvent(new Event('ck:back'));
  if (action === 'home')  router.open('home');
  if (action === 'menu')  window.dispatchEvent(new Event('ck:left'));
});

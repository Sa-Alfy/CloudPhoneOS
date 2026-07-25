import { renderMenu, Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';

export function renderHome({ root, router }) {
  setSoftKeys({
    left: 'Menu',
    center: 'Select',
    right: 'Exit',
    onLeft: () => Toast('Use Up/Down, OK, and Back'),
    onCenter: null,
    onRight: () => window.dispatchEvent(new Event('ck:confirm-exit'))
  });

  renderMenu(root, [
    { label: '🤖 AI Assistant', meta: 'Soon',    onSelect: () => router.open('ai') },
    { label: '🌐 Translator',   meta: 'Working', onSelect: () => router.open('translator') },
    { label: '📖 Dictionary',   meta: 'Working', onSelect: () => router.open('dictionary') },
    { label: '🧮 Calculator',   meta: 'Working', onSelect: () => router.open('calculator') },
    { label: '⛅ Weather',      meta: 'Working', onSelect: () => router.open('weather') },
    { label: '📝 Notes',        meta: 'Working', onSelect: () => router.open('notes') },
    { label: '⚙️ Settings',     meta: 'Theme',   onSelect: () => router.open('settings') },
  ]);
}

import { toggleTheme } from '../core/theme.js';
import { renderMenu, Toast, Dialog } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';
import { load, save } from '../core/storage.js';

export const manifest = {
  id: 'settings',
  name: 'Settings',
  icon: '⚙️',
  order: 6,
  description: 'System preferences & themes.',
  version: '1.0',
  keywords: ['config', 'theme', 'dark', 'light', 'options', 'system', 'ai', 'key'],
  route: 'settings'
};

export function renderSettings({ root, router }) {
  const currentKey = load('ck_ai_key', '');
  const maskedKey = currentKey
    ? currentKey.slice(0, 6) + '••••' + currentKey.slice(-4)
    : 'Not set (tap to configure)';

  setSoftKeys({
    left: 'Toggle',
    center: 'Select',
    right: 'Back',
    onLeft: () => {
      const next = toggleTheme();
      Toast(`Theme: ${next}`);
    },
    onCenter: null,
    onRight: () => router.back()
  });

  renderMenu(root, [
    {
      label: 'Toggle theme',
      meta: 'Dark / Light',
      onSelect: () => {
        const next = toggleTheme();
        Toast(`Theme: ${next}`);
      }
    },
    {
      label: '🤖 AI Assistant Key',
      meta: maskedKey,
      onSelect: () => {
        // Open AI App directly to configure/update key
        router.open('ai');
      }
    },
    {
      label: 'About CloudKit',
      meta: 'Developed by Shariar Ahamed',
      onSelect: () => router.open('about')
    },
    {
      label: 'Back',
      meta: 'Return',
      onSelect: () => router.back()
    }
  ], { emptyMessage: 'Settings unavailable' });
}

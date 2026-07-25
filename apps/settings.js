import { toggleTheme } from '../core/theme.js';
import { renderMenu, Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';

export function renderSettings({ root, router }) {
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
      label: 'About CloudKit',
      meta: 'Phase 4',
      onSelect: () => Toast('CloudKit OS')
    },
    {
      label: 'Back',
      meta: 'Return',
      onSelect: () => router.back()
    }
  ], { emptyMessage: 'Settings unavailable' });
}


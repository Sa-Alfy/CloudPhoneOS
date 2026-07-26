import { appRegistry } from '../core/app-registry.js';
import { Toast, Dialog } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';
import { getTheme } from '../core/theme.js';

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

function showAboutDialog() {
  const allApps = appRegistry.getAll();
  const currentTheme = getTheme();
  const themeLabel = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);

  Dialog({
    title: 'CloudKit OS',
    message: `
      <div style="font-size: 13px; line-height: 1.5; text-align: left;">
        <div><strong>Version:</strong> 2.0 (Beta)</div>
        <div><strong>Installed Apps:</strong> ${allApps.length}</div>
        <div><strong>Theme:</strong> ${themeLabel}</div>
        <div style="margin-top: 6px; color: var(--muted);">Feature-phone micro-OS shell.</div>
      </div>
    `,
    confirmLabel: 'OK',
    cancelLabel: 'Close',
    onConfirm: null,
    onCancel: null
  });
}

function showLauncherMenu({ router, onOpenSearch }) {
  if (document.querySelector('.ck-dialog-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'ck-dialog-overlay';
  overlay.innerHTML = `
    <div class="ck-dialog ck-launcher-menu-dialog" role="dialog" aria-modal="true">
      <h3 style="margin-bottom: 12px;">Menu</h3>
      <div class="ck-menu-options" style="display: grid; gap: 8px;">
        <button type="button" class="ck-action" data-focusable data-action="search">🔍 Search Apps</button>
        <button type="button" class="ck-action" data-focusable data-action="settings">⚙️ Settings</button>
        <button type="button" class="ck-action" data-focusable data-action="about">ℹ️ About CloudKit</button>
      </div>
      <div style="margin-top: 12px; text-align: right;">
        <button type="button" class="ck-dialog-btn ck-dialog-cancel">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.querySelector('[data-action="search"]')?.addEventListener('click', () => {
    close();
    onOpenSearch();
  });

  overlay.querySelector('[data-action="settings"]')?.addEventListener('click', () => {
    close();
    router.open('settings');
  });

  overlay.querySelector('[data-action="about"]')?.addEventListener('click', () => {
    close();
    showAboutDialog();
  });

  overlay.querySelector('.ck-dialog-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Re-focus first menu option
  window.dispatchEvent(new CustomEvent('ck:rendered', { detail: { focusIndex: 0 } }));
}

function renderSearchScreen({ root, router, onBack }) {
  root.innerHTML = `
    <div class="ck-screen ck-search-screen">
      <div class="ck-search-bar-container">
        <input type="text" id="ck-search-input" class="ck-search-input" placeholder="🔍 Search apps..." autocomplete="off" autofocus data-focusable />
      </div>
      <div id="ck-search-results" class="ck-list"></div>
    </div>
  `;

  const searchInput = root.querySelector('#ck-search-input');
  const resultsContainer = root.querySelector('#ck-search-results');

  function updateResults() {
    const query = searchInput?.value || '';
    const results = appRegistry.search(query);

    resultsContainer.innerHTML = '';

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'ck-empty';
      empty.textContent = 'No matching apps found';
      resultsContainer.appendChild(empty);
    } else {
      results.forEach((app) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ck-item';
        if (app.disabled) {
          btn.setAttribute('aria-disabled', 'true');
          btn.classList.add('ck-item--disabled');
        } else {
          btn.dataset.focusable = '';
        }

        btn.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="ck-item__icon">${app.icon}</span>
            <span class="ck-item__label">${app.name}</span>
          </div>
          ${app.meta ? `<span class="ck-item__meta">${app.meta}</span>` : `<span class="ck-item__meta">${app.description}</span>`}
        `;

        btn.addEventListener('click', () => {
          if (app.disabled) {
            Toast(`${app.name} is coming in a future update`);
          } else {
            router.open(app.route);
          }
        });

        resultsContainer.appendChild(btn);
      });
    }

    window.dispatchEvent(new CustomEvent('ck:rendered', { detail: { focusIndex: 0 } }));
  }

  // Handle live typing
  searchInput?.addEventListener('input', updateResults);

  // Handle D-Pad down or Enter in input
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const firstResult = resultsContainer.querySelector('[data-focusable]');
      if (firstResult instanceof HTMLElement) {
        firstResult.focus();
        firstResult.classList.add('is-focused');
      }
    }
  });

  setSoftKeys({
    left: 'Clear',
    center: 'Open',
    right: 'Back',
    onLeft: () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        updateResults();
      }
    },
    onCenter: null,
    onRight: () => onBack()
  });

  updateResults();
}

export function renderHome({ root, router }) {
  const clockId = startClock();
  const statusEl = document.getElementById('ck-status');
  if (statusEl && clockId) statusEl.dataset.clockId = clockId;

  function renderMainLauncher() {
    const recents = appRegistry.getRecents();
    const allApps = appRegistry.getAll();

    root.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'ck-screen ck-launcher';

    // 1. Recently Used Section
    if (recents.length > 0) {
      const recentsSection = document.createElement('section');
      recentsSection.className = 'ck-section';
      recentsSection.innerHTML = `<div class="ck-section-title">🕒 Recently Used</div>`;

      const recentsList = document.createElement('div');
      recentsList.className = 'ck-list';

      recents.forEach((app) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ck-item ck-item--recent';
        btn.dataset.focusable = '';

        btn.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="ck-item__icon">${app.icon}</span>
            <span class="ck-item__label">${app.name}</span>
          </div>
          <span class="ck-item__meta">Recent</span>
        `;

        btn.addEventListener('click', () => router.open(app.route));
        recentsList.appendChild(btn);
      });

      recentsSection.appendChild(recentsList);
      container.appendChild(recentsSection);
    }

    // 2. All Applications Section
    const allAppsSection = document.createElement('section');
    allAppsSection.className = 'ck-section';
    allAppsSection.innerHTML = `<div class="ck-section-title">📱 Applications</div>`;

    const allAppsList = document.createElement('div');
    allAppsList.className = 'ck-list';

    allApps.forEach((app) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ck-item';
      if (app.disabled) {
        btn.setAttribute('aria-disabled', 'true');
        btn.classList.add('ck-item--disabled');
      } else {
        btn.dataset.focusable = '';
      }

      btn.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="ck-item__icon">${app.icon}</span>
          <span class="ck-item__label">${app.name}</span>
        </div>
        ${app.meta ? `<span class="ck-item__meta">${app.meta}</span>` : ''}
      `;

      btn.addEventListener('click', () => {
        if (app.disabled) {
          Toast(`${app.name} is coming in a future update`);
        } else {
          router.open(app.route);
        }
      });

      allAppsList.appendChild(btn);
    });

    allAppsSection.appendChild(allAppsList);
    container.appendChild(allAppsSection);

    root.appendChild(container);

    setSoftKeys({
      left: 'Menu',
      center: 'Open',
      right: 'Exit',
      onLeft: () => showLauncherMenu({
        router,
        onOpenSearch: () => renderSearchScreen({
          root,
          router,
          onBack: () => renderMainLauncher()
        })
      }),
      onCenter: null,
      onRight: () => window.dispatchEvent(new Event('ck:confirm-exit'))
    });

    window.dispatchEvent(new CustomEvent('ck:rendered', { detail: { focusIndex: 0 } }));
  }

  renderMainLauncher();
}

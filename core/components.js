export function Toast(message, duration = 1800) {
  const el = document.createElement('div');
  el.className = 'ck-toast';
  el.textContent = message;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 220);
  }, duration);
}

export function Dialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }) {
  if (document.querySelector('.ck-dialog-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'ck-dialog-overlay';
  overlay.innerHTML = `
    <div class="ck-dialog" role="dialog" aria-modal="true">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="ck-dialog-actions">
        <button type="button" class="ck-dialog-btn ck-dialog-cancel">${cancelLabel}</button>
        <button type="button" class="ck-dialog-btn ck-dialog-confirm">${confirmLabel}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = (result) => {
    overlay.remove();
    result?.();
  };

  overlay.querySelector('.ck-dialog-confirm').addEventListener('click', () => close(onConfirm));
  overlay.querySelector('.ck-dialog-cancel').addEventListener('click', () => close(onCancel));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close(onCancel);
  });

  return overlay;
}

export function LoadingScreen(show = true, message = 'Loading...') {
  let el = document.getElementById('ck-loading');

  if (show) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'ck-loading';
      el.className = 'ck-loading';
      document.body.appendChild(el);
    }
    el.textContent = message;
    return el;
  }

  if (el) el.remove();
  return null;
}

export function renderMenu(root, items, { emptyMessage = 'Nothing here yet' } = {}) {
  root.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'ck-empty';
    empty.textContent = emptyMessage;
    root.appendChild(empty);
    window.dispatchEvent(new Event('ck:rendered'));
    return;
  }

  const list = document.createElement('div');
  list.className = 'ck-list';

  items.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ck-item';
    if (item.disabled) {
      button.setAttribute('aria-disabled', 'true');
      button.classList.add('ck-item--disabled');
    } else {
      button.dataset.focusable = '';
    }
    button.innerHTML = `
      <span class="ck-item__label">${item.label}</span>
      ${item.meta ? `<span class="ck-item__meta">${item.meta}</span>` : ''}
    `;
    button.addEventListener('click', () => item.onSelect?.());
    list.appendChild(button);
  });

  root.appendChild(list);
  window.dispatchEvent(new CustomEvent('ck:rendered', { detail: { focusIndex: 0 } }));
}

// ---------------------------------------------------------------------------
// Shared state panels — used by Weather, Dictionary, and any future online app.
// Each returns a DOM element so the caller can insert it wherever it needs.
// ---------------------------------------------------------------------------

/**
 * Render a loading indicator into `container`.
 * @param {HTMLElement} container
 * @param {string} [message]
 */
export function LoadingState(container, message = 'Loading…') {
  container.innerHTML = `
    <div class="ck-state ck-state--loading" aria-live="polite">
      <div class="ck-state__icon">⏳</div>
      <div class="ck-state__message">${message}</div>
    </div>
  `;
}

/**
 * Render a generic error panel into `container`.
 * @param {HTMLElement} container
 * @param {string} [message]
 * @param {Function} [onRetry]   If provided, a Retry button is shown.
 */
export function ErrorState(container, message = 'Something went wrong.', onRetry) {
  container.innerHTML = `
    <div class="ck-state ck-state--error" aria-live="polite">
      <div class="ck-state__icon">⚠️</div>
      <div class="ck-state__message">${message}</div>
      ${onRetry ? `<button type="button" class="ck-action ck-state__retry" data-focusable>Retry</button>` : ''}
    </div>
  `;
  if (onRetry) {
    container.querySelector('.ck-state__retry')?.addEventListener('click', onRetry);
  }
}

/**
 * Render an offline notice into `container`.
 * @param {HTMLElement} container
 * @param {string} [message]
 * @param {Function} [onRetry]
 */
export function OfflineState(container, message = 'No internet connection.', onRetry) {
  container.innerHTML = `
    <div class="ck-state ck-state--offline" aria-live="polite">
      <div class="ck-state__icon">📡</div>
      <div class="ck-state__message">${message}</div>
      ${onRetry ? `<button type="button" class="ck-action ck-state__retry" data-focusable>Retry</button>` : ''}
    </div>
  `;
  if (onRetry) {
    container.querySelector('.ck-state__retry')?.addEventListener('click', onRetry);
  }
}

/**
 * Render an empty / no-results panel into `container`.
 * @param {HTMLElement} container
 * @param {string} [message]
 */
export function EmptyState(container, message = 'No results found.') {
  container.innerHTML = `
    <div class="ck-state ck-state--empty" aria-live="polite">
      <div class="ck-state__icon">🔍</div>
      <div class="ck-state__message">${message}</div>
    </div>
  `;
}

import { getFocusIndex } from './nav.js';
import { appRegistry } from './app-registry.js';

export class Router {
  constructor({ root, subtitle }) {
    this.root = document.querySelector(root);
    this.subtitle = document.querySelector(subtitle);
    this.routes = new Map();
    this.stack = [];
    this.current = null;
    this._lastNavTime = 0;
  }


  register(name, renderFn, options = {}) {
    this.routes.set(name, {
      renderFn,
      label: options.label || this.friendlyName(name)
    });
  }

  friendlyName(name) {
    return String(name)
      .split(/[-_]+/)
      .map((w) => (w.toLowerCase() === 'ai' ? 'AI' : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }

  // Stop the clock interval when leaving the home screen.
  _clearClock() {
    const statusEl = document.getElementById('ck-status');
    if (statusEl?.dataset.clockId) {
      clearInterval(Number(statusEl.dataset.clockId));
      delete statusEl.dataset.clockId;
      statusEl.innerHTML = navigator.onLine ? '📶 Online' : '⚠️ Offline';
      statusEl.style.color = navigator.onLine ? '' : 'var(--focus)';
    }
  }

  // Fade the app root in after a render.
  _fadeIn() {
    if (!this.root) return;
    this.root.classList.remove('ck-fade-in');
    // Force reflow so the animation restarts each time.
    void this.root.offsetWidth;
    this.root.classList.add('ck-fade-in');
  }

  open(name, params = {}, { pushHistory = true } = {}) {
    const now = Date.now();
    if (now - this._lastNavTime < 300) return;
    this._lastNavTime = now;

    const route = this.routes.get(name);
    if (!route || !this.root) return;

    if (pushHistory && this.current) {
      this.stack.push({
        ...this.current,
        focusIndex: getFocusIndex()
      });
    }

    this._clearClock();
    appRegistry.recordLaunch(name);
    this.current = { name, params };
    this.root.innerHTML = '';

    this.root.scrollTop = 0;
    route.renderFn({ root: this.root, router: this, params });
    this.updateHeader(route.label);
    this._fadeIn();
    window.dispatchEvent(new CustomEvent('ck:rendered', { detail: { focusIndex: 0 } }));
  }

  back() {
    const now = Date.now();
    if (now - this._lastNavTime < 300) return;
    this._lastNavTime = now;

    if (this.stack.length === 0) {
      window.dispatchEvent(new Event('ck:confirm-exit'));
      return;
    }

    const previous = this.stack.pop();
    const route = this.routes.get(previous.name);
    if (!route || !this.root) return;

    this._clearClock();
    this.current = previous;
    this.root.innerHTML = '';
    this.root.scrollTop = 0;
    route.renderFn({ root: this.root, router: this, params: previous.params || {} });
    this.updateHeader(route.label);
    this._fadeIn();
    window.dispatchEvent(new CustomEvent('ck:rendered', { detail: { focusIndex: previous.focusIndex ?? 0 } }));
  }

  updateHeader(label) {
    if (this.subtitle) this.subtitle.textContent = label;
  }
}



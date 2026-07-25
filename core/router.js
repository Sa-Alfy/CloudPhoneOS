import { getFocusIndex } from './nav.js';

export class Router {
  constructor({ root, subtitle }) {
    this.root = document.querySelector(root);
    this.subtitle = document.querySelector(subtitle);
    this.routes = new Map();
    this.stack = [];
    this.current = null;
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

  open(name, params = {}, { pushHistory = true } = {}) {
    const route = this.routes.get(name);
    if (!route || !this.root) return;

    if (pushHistory && this.current) {
      this.stack.push({
        ...this.current,
        focusIndex: getFocusIndex()
      });
    }

    this.current = { name, params };
    this.root.innerHTML = '';
    route.renderFn({ root: this.root, router: this, params });
    this.updateHeader(route.label);
    window.dispatchEvent(new CustomEvent('ck:rendered', { detail: { focusIndex: 0 } }));
  }

  back() {
    if (this.stack.length === 0) {
      window.dispatchEvent(new Event('ck:confirm-exit'));
      return;
    }

    const previous = this.stack.pop();
    const route = this.routes.get(previous.name);
    if (!route || !this.root) return;

    this.current = previous;
    this.root.innerHTML = '';
    route.renderFn({ root: this.root, router: this, params: previous.params || {} });
    this.updateHeader(route.label);
    window.dispatchEvent(new CustomEvent('ck:rendered', { detail: { focusIndex: previous.focusIndex ?? 0 } }));
  }

  updateHeader(label) {
    if (this.subtitle) this.subtitle.textContent = label;
  }
}


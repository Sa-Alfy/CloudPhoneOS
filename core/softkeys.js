import { activateFocused } from './nav.js';

let currentCallbacks = { onLeft: null, onCenter: null, onRight: null };
let lastSoftKeyTime = 0;
const DEBOUNCE_MS = 300;

function safeCall(fn) {
  if (typeof fn !== 'function') return;
  const now = Date.now();
  if (now - lastSoftKeyTime < DEBOUNCE_MS) return;
  lastSoftKeyTime = now;
  fn();
}

export function setSoftKeys({ left, center, right, onLeft, onCenter, onRight } = {}) {
  const lskBtn = document.getElementById('lsk-btn');
  const cskBtn = document.getElementById('csk-btn');
  const rskBtn = document.getElementById('rsk-btn');

  if (lskBtn && left !== undefined) lskBtn.textContent = left;
  if (cskBtn && center !== undefined) cskBtn.textContent = center;
  if (rskBtn && right !== undefined) rskBtn.textContent = right;

  if (onLeft !== undefined) currentCallbacks.onLeft = onLeft;
  if (onCenter !== undefined) currentCallbacks.onCenter = onCenter;
  if (onRight !== undefined) currentCallbacks.onRight = onRight;
}

export function initSoftKeys({ onLeft, onCenter, onRight } = {}) {
  currentCallbacks = { onLeft, onCenter, onRight };
  const lskBtn = document.getElementById('lsk-btn');
  const cskBtn = document.getElementById('csk-btn');
  const rskBtn = document.getElementById('rsk-btn');

  if (lskBtn) lskBtn.addEventListener('click', (e) => {
    e.preventDefault();
    safeCall(currentCallbacks.onLeft);
  });

  // Center button activates the focused element directly.
  if (cskBtn) cskBtn.addEventListener('click', (e) => {
    e.preventDefault();
    safeCall(() => {
      if (currentCallbacks.onCenter) {
        currentCallbacks.onCenter();
      } else {
        activateFocused();
      }
    });
  });

  if (rskBtn) rskBtn.addEventListener('click', (e) => {
    e.preventDefault();
    safeCall(currentCallbacks.onRight);
  });

  window.addEventListener('keydown', (event) => {
    // Left softkey — various KaiOS/W3C key names
    if (event.key === 'SoftLeft' || event.key === 'F1') {
      event.preventDefault();
      safeCall(currentCallbacks.onLeft);
      return;
    }

    // Right softkey / back key — covers all KaiOS device variants:
    // SoftRight, F2, Backspace, and EndCall.
    if (
      event.key === 'SoftRight' ||
      event.key === 'F2' ||
      event.key === 'EndCall' ||
      event.key === 'Backspace'
    ) {
      // Don't intercept Backspace inside editable fields (textarea, input)
      const tag = document.activeElement?.tagName;
      if (event.key === 'Backspace' && (tag === 'INPUT' || tag === 'TEXTAREA')) return;

      event.preventDefault();
      safeCall(currentCallbacks.onRight);
    }
  });

  window.addEventListener('ck:left',   () => safeCall(currentCallbacks.onLeft));
  window.addEventListener('ck:center', () => safeCall(() => activateFocused()));
  window.addEventListener('ck:back',   () => safeCall(currentCallbacks.onRight));
}

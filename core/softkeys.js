import { activateFocused } from './nav.js';

let currentCallbacks = { onLeft: null, onCenter: null, onRight: null };

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

  if (lskBtn) lskBtn.addEventListener('click', () => currentCallbacks.onLeft?.());

  // Center button activates the focused element directly.
  // Do NOT dispatch a synthetic keydown Enter here — that would cause
  // nav.js to catch the event and call active.click() a second time.
  if (cskBtn) cskBtn.addEventListener('click', () => {
    if (currentCallbacks.onCenter) {
      currentCallbacks.onCenter();
    } else {
      activateFocused();
    }
  });

  if (rskBtn) rskBtn.addEventListener('click', () => currentCallbacks.onRight?.());

  window.addEventListener('keydown', (event) => {
    if ((event.key === 'F1' || event.key === 'SoftLeft') && currentCallbacks.onLeft) {
      event.preventDefault();
      currentCallbacks.onLeft();
    } else if ((event.key === 'F2' || event.key === 'SoftRight') && currentCallbacks.onRight) {
      event.preventDefault();
      currentCallbacks.onRight();
    }
  });

  window.addEventListener('ck:left',   () => currentCallbacks.onLeft?.());
  window.addEventListener('ck:center', () => activateFocused());
  window.addEventListener('ck:back',   () => currentCallbacks.onRight?.());
}

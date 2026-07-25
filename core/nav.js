let container = null;
let listenerAttached = false;

function focusables() {
  if (!container) return [];
  return Array.from(container.querySelectorAll('[data-focusable]')).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return false;
    const rects = el.getClientRects();
    return rects.length > 0;
  });
}

function activeElement() {
  return focusables().find((element) => element.classList.contains('is-focused')) || null;
}

function centerOf(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

export function setFocused(element) {
  const focusableItems = focusables();
  if (!focusableItems.length) return;

  const target = element && focusableItems.includes(element) ? element : focusableItems[0];
  focusableItems.forEach((node) => node.classList.remove('is-focused'));
  target.classList.add('is-focused');

  // Scroll within the .ck-app container instead of using scrollIntoView on the
  // document — scrollIntoView can push the sticky header off-screen on KaiOS/Gecko.
  const scrollRoot = container?.closest('.ck-app') ?? container;
  if (scrollRoot) {
    const elRect   = target.getBoundingClientRect();
    const rootRect = scrollRoot.getBoundingClientRect();
    if (elRect.bottom > rootRect.bottom - 8) {
      scrollRoot.scrollTop += elRect.bottom - rootRect.bottom + 8;
    } else if (elRect.top < rootRect.top + 8) {
      scrollRoot.scrollTop -= rootRect.top - elRect.top + 8;
    }
  }
}

// Call this to trigger the currently focused element.
// Used by softkeys center button so activation never goes through a
// synthetic keydown event (which would double-fire nav's own Enter handler).
export function activateFocused() {
  const active = activeElement();
  if (!active) return;
  active.classList.add('is-pressed');
  setTimeout(() => active.classList.remove('is-pressed'), 120);
  active.click();
}

export function getFocusIndex() {
  const items = focusables();
  const active = activeElement();
  const idx = active ? items.indexOf(active) : 0;
  return idx === -1 ? 0 : idx;
}

export function restoreFocusIndex(index = 0) {
  const items = focusables();
  if (!items.length) return;
  const targetIndex = Math.max(0, Math.min(index, items.length - 1));
  setFocused(items[targetIndex]);
}

function pickNext(direction) {
  const items = focusables();
  if (!items.length) return null;

  const current = activeElement() || items[0];
  const currentCenter = centerOf(current);

  const scored = items
    .filter((element) => element !== current)
    .map((element) => {
      const c = centerOf(element);
      const dx = c.x - currentCenter.x;
      const dy = c.y - currentCenter.y;

      let valid = false;
      let primary = 0;
      let secondary = 0;

      switch (direction) {
        case 'up':
          valid = dy < -1;
          primary = Math.abs(dy);
          secondary = Math.abs(dx);
          break;
        case 'down':
          valid = dy > 1;
          primary = Math.abs(dy);
          secondary = Math.abs(dx);
          break;
        case 'left':
          valid = dx < -1;
          primary = Math.abs(dx);
          secondary = Math.abs(dy);
          break;
        case 'right':
          valid = dx > 1;
          primary = Math.abs(dx);
          secondary = Math.abs(dy);
          break;
      }

      return valid
        ? { element, score: primary + secondary * 3, dx, dy }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);

  if (scored.length) return scored[0].element;

  // Fallback to DOM order if no spatial candidate exists.
  const currentIndex = items.indexOf(current);
  if (currentIndex === -1) return items[0];

  if (direction === 'up' || direction === 'left') {
    return items[Math.max(0, currentIndex - 1)];
  }

  return items[Math.min(items.length - 1, currentIndex + 1)];
}

export function focusFirst() {
  setFocused(focusables()[0] || null);
}

function isEditable(element) {
  if (!(element instanceof HTMLElement)) return false;
  const tag = element.tagName;
  return element.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function initNav(selector = '#app') {
  container = document.querySelector(selector);
  if (!container) return;

  if (!listenerAttached) {
    listenerAttached = true;

    // Mouse focus sync
    container.addEventListener('pointerenter', (e) => {
      const target = e.target?.closest?.('[data-focusable]');
      if (target && focusables().includes(target)) {
        setFocused(target);
      }
    }, { capture: true });

    container.addEventListener('click', (e) => {
      const target = e.target?.closest?.('[data-focusable]');
      if (target && focusables().includes(target)) {
        setFocused(target);
      }
    }, { capture: true });

    window.addEventListener('keydown', (event) => {
      if (!container) return;
      if (!focusables().length) return;
      if (isEditable(document.activeElement)) {
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setFocused(pickNext('up'));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocused(pickNext('down'));
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setFocused(pickNext('left'));
          break;
        case 'ArrowRight':
          event.preventDefault();
          setFocused(pickNext('right'));
          break;
        case 'Enter':
          event.preventDefault();
          activateFocused();
          break;
        // NOTE: Backspace is intentionally NOT handled here.
        // On KaiOS, the left softkey maps to Backspace on many devices.
        // Back navigation is handled exclusively by softkeys.js (SoftLeft / F1 / ck:back).
      }
    });

    window.addEventListener('ck:rendered', (e) => {
      const targetIdx = e.detail?.focusIndex;
      if (typeof targetIdx === 'number') {
        restoreFocusIndex(targetIdx);
      } else {
        focusFirst();
      }
    });
  }

  focusFirst();
}


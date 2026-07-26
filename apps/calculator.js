import { Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';

export const manifest = {
  id: 'calculator',
  name: 'Calculator',
  icon: '🧮',
  order: 1,
  description: 'Quick calculations.',
  version: '2.0',
  keywords: ['math', 'calc', 'add', 'subtract', 'numbers', 'equal'],
  route: 'calculator'
};

// DEV_MODE: enables direct keyboard number/operator input on PC.
// Auto-detected: true on wide screens (desktop/laptop), false on real phone screens.
const DEV_MODE = window.screen.width > 480;

function calc(expr) {
  if (!expr) return '';
  const normalised = expr.replace(/×/g, '*').replace(/÷/g, '/');
  const safe = normalised.replace(/[^0-9+\-*/().% ]/g, '');
  try {
    const result = Function('"use strict"; return (' + safe + ')')();
    return Number.isFinite(result) ? String(result) : 'Error';
  } catch {
    return 'Error';
  }
}

export function renderCalculator({ root, router }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ck-screen ck-calculator';

  // ── Display area ─────────────────────────────────────────────────────────
  wrapper.innerHTML = `
    <div class="ck-calc-display-area">
      <div id="calc-expression" class="ck-calc-expression-line"></div>
      <div id="calc-result" class="ck-calc-result-big">0</div>
    </div>

    <div class="ck-calc-keypad-overlay">
      <!-- Row 1: maps to * key | nav-up | # key -->
      <div class="ck-calc-overlay-row">
        <div class="ck-calc-overlay-cell ck-calc-overlay-cell--corner">
          <span class="ck-calc-overlay-hw">*</span>
          <span class="ck-calc-overlay-op">±</span>
        </div>
        <div class="ck-calc-overlay-cell ck-calc-overlay-cell--center">
          <span class="ck-calc-overlay-op ck-calc-overlay-op--main">+</span>
        </div>
        <div class="ck-calc-overlay-cell ck-calc-overlay-cell--corner">
          <span class="ck-calc-overlay-hw">#</span>
          <span class="ck-calc-overlay-op">.</span>
        </div>
      </div>

      <!-- Row 2: nav-left | ok/center | nav-right -->
      <div class="ck-calc-overlay-row ck-calc-overlay-row--mid">
        <div class="ck-calc-overlay-cell ck-calc-overlay-cell--center">
          <span class="ck-calc-overlay-op ck-calc-overlay-op--main">÷</span>
        </div>
        <div class="ck-calc-overlay-cell ck-calc-overlay-cell--center">
          <span class="ck-calc-overlay-op ck-calc-overlay-op--main">=</span>
        </div>
        <div class="ck-calc-overlay-cell ck-calc-overlay-cell--center">
          <span class="ck-calc-overlay-op ck-calc-overlay-op--main">×</span>
        </div>
      </div>

      <!-- Row 3: left-softkey | nav-down | right-softkey -->
      <div class="ck-calc-overlay-row">
        <div class="ck-calc-overlay-cell ck-calc-overlay-cell--corner">
          <span class="ck-calc-overlay-op">%</span>
        </div>
        <div class="ck-calc-overlay-cell ck-calc-overlay-cell--center">
          <span class="ck-calc-overlay-op ck-calc-overlay-op--main">−</span>
        </div>
        <div class="ck-calc-overlay-cell ck-calc-overlay-cell--corner">
          <span class="ck-calc-overlay-op">←</span>
        </div>
      </div>
    </div>
  `;

  let expression = '';
  let lastResult = '0';

  const exprEl  = wrapper.querySelector('#calc-expression');
  const resultEl = wrapper.querySelector('#calc-result');

  function refresh() {
    exprEl.textContent = expression || '';
    const preview = expression ? calc(expression) : lastResult;
    resultEl.textContent = preview || '0';
  }

  function append(token) {
    if (!token) return;
    if (!expression && /[+×÷/.%)]/.test(token)) return;
    expression += token;
  }

  function handleValue(value) {
    switch (value) {
      case 'C':
        expression = '';
        lastResult = '0';
        Toast('Cleared');
        break;
      case 'BACKSPACE':
        expression = expression.slice(0, -1);
        break;
      case 'BACK':
        router.back();
        return;
      case '=': {
        const result = calc(expression);
        if (result === 'Error') {
          lastResult = 'Error';
          Toast('Error');
        } else {
          expression = result;
          lastResult = result;
        }
        break;
      }
      case 'TOGGLE_SIGN': {
        if (!expression) break;
        if (expression.startsWith('-')) {
          expression = expression.slice(1);
        } else {
          expression = '-' + expression;
        }
        break;
      }
      default:
        append(value);
    }
    refresh();
  }

  setSoftKeys({
    left: '%',
    center: '=',
    right: '⌫',
    onLeft:   () => handleValue('%'),
    onCenter: () => handleValue('='),
    onRight:  () => handleValue('BACKSPACE')
  });

  root.appendChild(wrapper);
  refresh();

  // ── Key maps ─────────────────────────────────────────────────────────────
  // Phone hardware key → calculator action
  const PHONE_KEY_MAP = {
    // Digits
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    // D-pad / nav — mapped to operators (matching the overlay)
    'ArrowUp':    '+',
    'ArrowLeft':  '÷',
    'ArrowRight': '×',
    'ArrowDown':  '-',
    'Enter':      '=',
    // * key → toggle sign, # key → decimal point
    '*': 'TOGGLE_SIGN',
    '#': '.',
    // PC convenience
    '.': '.', 'Decimal': '.', 'NumpadDecimal': '.',
    '+': '+', 'Add': '+', 'NumpadAdd': '+',
    '-': '-', 'Subtract': '-', 'NumpadSubtract': '-',
    'x': '×', 'X': '×', 'Multiply': '×', 'NumpadMultiply': '×',
    '/': '÷', 'Divide': '÷', 'NumpadDivide': '÷',
    '=': '=', 'NumpadEnter': '=',
    'Backspace': 'BACKSPACE', 'Delete': 'C', 'Escape': 'BACK',
  };

  const phoneKeyHandler = (event) => {
    if (!root.contains(wrapper)) {
      window.removeEventListener('keydown', phoneKeyHandler);
      return;
    }
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const mapped = PHONE_KEY_MAP[event.key];
    if (!mapped) return;

    event.preventDefault();
    handleValue(mapped);
  };

  window.addEventListener('keydown', phoneKeyHandler);

  if (DEV_MODE) {
    const DEV_KEY_MAP = { ...PHONE_KEY_MAP, 'c': 'C' };
    const devKeyHandler = (event) => {
      if (!root.contains(wrapper)) {
        window.removeEventListener('keydown', devKeyHandler);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mapped = DEV_KEY_MAP[event.key];
      if (!mapped) return;
      event.preventDefault();
      handleValue(mapped);
    };
    window.addEventListener('keydown', devKeyHandler);
  }
}

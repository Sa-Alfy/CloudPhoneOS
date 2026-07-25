import { Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';

// DEV_MODE: enables direct keyboard number/operator input on PC.
// Set to false (or check hostname) for production/device builds.
const DEV_MODE = true;

function calc(expr) {
  if (!expr) return '';
  // Normalise display operators to JS operators before evaluating.
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
  wrapper.innerHTML = `
    <div class="ck-display ck-calc-display">
      <div class="ck-display__label">Expression</div>
      <div id="calc-expression" class="ck-calc-expression">0</div>
      <div class="ck-display__label">Result</div>
      <div id="calc-result" class="ck-calc-result">0</div>
      <div class="ck-calc-hint">Use arrows to move, OK to press${DEV_MODE ? ' · PC: type digits directly' : ''}</div>
    </div>
  `;

  const pad = document.createElement('div');
  pad.className = 'ck-grid ck-calc-pad';

  let expression = '';
  let lastResult = '0';

  const exprEl = wrapper.querySelector('#calc-expression');
  const resultEl = wrapper.querySelector('#calc-result');

  // Keys store the display label (×, ÷) — calc() normalises internally.
  const keys = [
    { label: 'C',    value: 'C' },
    { label: '⌫',   value: 'BACKSPACE' },
    { label: '(',    value: '(' },
    { label: ')',    value: ')' },
    { label: '7',    value: '7' },
    { label: '8',    value: '8' },
    { label: '9',    value: '9' },
    { label: '÷',    value: '÷' },
    { label: '4',    value: '4' },
    { label: '5',    value: '5' },
    { label: '6',    value: '6' },
    { label: '×',    value: '×' },
    { label: '1',    value: '1' },
    { label: '2',    value: '2' },
    { label: '3',    value: '3' },
    { label: '-',    value: '-' },
    { label: '0',    value: '0' },
    { label: '.',    value: '.' },
    { label: '=',    value: '=' },
    { label: 'Back', value: 'BACK' },
  ];

  function refresh() {
    exprEl.textContent = expression || '0';
    // Show live preview using the current expression.
    const preview = expression ? calc(expression) : lastResult;
    resultEl.textContent = preview || '0';
  }

  function append(token) {
    if (!token) return;
    // Disallow operators at the very start (except minus for negation).
    if (!expression && /[+×÷/.%)]/.test(token)) return;
    // Store display chars (× ÷) directly — calc() normalises on eval.
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
      default:
        append(value);
    }
    refresh();
  }

  setSoftKeys({
    left: 'Clear',
    center: 'Select',
    right: 'Back',
    onLeft: () => handleValue('C'),
    onCenter: null,
    onRight: () => router.back()
  });

  keys.forEach(({ label, value }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ck-key ck-calc-key';
    btn.dataset.focusable = '';
    btn.textContent = label;
    btn.addEventListener('click', () => handleValue(value));
    pad.appendChild(btn);
  });

  wrapper.appendChild(pad);
  root.appendChild(wrapper);
  refresh();

  // DEV_MODE only: let PC users type numbers and operators directly.
  // On a real keypad device this block is never reached (DEV_MODE = false).
  if (DEV_MODE) {
    const DEV_KEY_MAP = {
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '.': '.', '+': '+', '-': '-',
      '*': '×', '/': '÷', 'x': '×',
      '(': '(', ')': ')',
      '=': '=', 'Enter': '=',
      'Backspace': 'BACKSPACE',
      'c': 'C', 'C': 'C', 'Delete': 'C',
      'Escape': 'BACK',
    };

    const devKeyHandler = (event) => {
      // Only intercept if focus is NOT in an editable element and the
      // calculator screen is still mounted.
      if (!root.contains(wrapper)) {
        window.removeEventListener('keydown', devKeyHandler);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const mapped = DEV_KEY_MAP[event.key];
      if (!mapped) return;
      // Let nav handle arrow keys and Enter (spatial nav / select).
      if (event.key === 'Enter' || event.key.startsWith('Arrow')) return;
      event.preventDefault();
      handleValue(mapped);
    };

    window.addEventListener('keydown', devKeyHandler);
  }
}

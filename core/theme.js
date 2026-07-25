import { load, save } from './storage.js';

export function initTheme() {
  const saved = load('theme', 'dark');
  document.documentElement.dataset.theme = saved;
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  save('theme', next);
  return next;
}

export function getTheme() {
  return document.documentElement.dataset.theme || 'dark';
}


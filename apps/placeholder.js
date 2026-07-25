import { setSoftKeys } from '../core/softkeys.js';

export const aiManifest = {
  id: 'ai',
  name: 'AI Assistant',
  icon: '🤖',
  order: 7,
  description: 'AI assistant and voice helper.',
  version: '1.0',
  keywords: ['ai', 'bot', 'assistant', 'chat', 'llm'],
  route: 'ai',
  disabled: true,
  meta: 'Coming soon'
};


// Receives the standard { root, router } from the Router, plus any extra
// props passed through params.  Previously the registration in app.js used
// () => renderPlaceholder({...}) which silently discarded root and router.
export function renderPlaceholder({ root, router, title = 'Coming soon', subtitle = '', message = '' }) {
  setSoftKeys({
    left: 'Menu',
    center: 'Select',
    right: 'Back',
    onLeft: () => router.open('home'),
    onCenter: null,
    onRight: () => router.back()
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'ck-screen ck-placeholder';
  wrapper.innerHTML = `
    <section class="ck-panel">
      <div class="ck-panel__title">${title}</div>
      ${subtitle ? `<div class="ck-panel__subtitle">${subtitle}</div>` : ''}
      ${message  ? `<p class="ck-panel__text">${message}</p>` : ''}
    </section>

    <div class="ck-actions ck-actions--stacked">
      <button type="button" class="ck-action" data-focusable data-action="back">Back</button>
      <button type="button" class="ck-action" data-focusable data-action="home">Home</button>
    </div>
  `;

  wrapper.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.action === 'back') router.back();
      if (button.dataset.action === 'home') router.open('home');
    });
  });

  root.appendChild(wrapper);
}

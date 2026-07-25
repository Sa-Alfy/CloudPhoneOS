import { load, save } from '../core/storage.js';
import { Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';

export const manifest = {
  id: 'notes',
  name: 'Notes',
  icon: '📝',
  order: 2,
  description: 'Quick text notes.',
  version: '1.0',
  keywords: ['text', 'memo', 'pad', 'write', 'journal'],
  route: 'notes'
};


export function renderNotes({ root, router }) {
  const notes = load('notes', []);
  const wrapper = document.createElement('div');
  wrapper.className = 'ck-screen';
  wrapper.innerHTML = `
    <div class="ck-panel">
      <div class="ck-panel__title">Notes</div>
      <textarea id="notes-input" class="ck-textarea" rows="8" placeholder="Write a note..."></textarea>
    </div>
  `;

  const input = wrapper.querySelector('#notes-input');
  input.value = notes.join('\n\n');

  const doSave = () => {
    const text = input.value.trim();
    save('notes', text ? text.split(/\n\n+/) : []);
    Toast('Notes saved');
  };

  setSoftKeys({
    left: 'Save',
    center: 'Select',
    right: 'Back',
    onLeft: doSave,
    onCenter: null,
    onRight: () => router.back()
  });

  const actions = document.createElement('div');
  actions.className = 'ck-actions';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'ck-action';
  saveBtn.dataset.focusable = '';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', doSave);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'ck-action';
  clearBtn.dataset.focusable = '';
  clearBtn.textContent = 'Clear';
  clearBtn.addEventListener('click', () => {
    input.value = '';
    save('notes', []);
    Toast('Notes cleared');
  });

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'ck-action';
  backBtn.dataset.focusable = '';
  backBtn.textContent = 'Back';
  backBtn.addEventListener('click', () => router.back());

  actions.append(saveBtn, clearBtn, backBtn);
  wrapper.appendChild(actions);
  root.appendChild(wrapper);
}


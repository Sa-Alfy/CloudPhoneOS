import { h, render } from 'https://esm.sh/preact';
import { useState, useEffect } from 'https://esm.sh/preact/hooks';
import htm from 'https://esm.sh/htm';
import { load, save } from '../core/storage.js';
import { Toast, Dialog } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';

const html = htm.bind(h);

export const manifest = {
  id: 'notes',
  name: 'Notes',
  icon: '📝',
  order: 2,
  description: 'Quick text notes, templates and history manager.',
  version: '2.0',
  keywords: ['text', 'memo', 'pad', 'write', 'journal', 'history', 'template'],
  route: 'notes'
};

const TEMPLATES = [
  { id: 't1', title: '🛒 Shopping List', content: 'Title: Shopping List\n\n- Apples\n- Bread\n- Milk\n- Eggs\n- Chicken' },
  { id: 't2', title: '📝 Todo Tasks', content: 'Title: Daily Todo\n\n[ ] Buy groceries\n[ ] Walk the dog\n[ ] Finish coding\n[ ] Pay utility bills' },
  { id: 't3', title: '📅 Daily Journal', content: 'Title: Daily Journal\n\nDate: ' + new Date().toLocaleDateString() + '\n\n- How was today?\n\n- What am I grateful for?\n\n- Focus for tomorrow:' },
  { id: 't4', title: '💡 Idea Draft', content: 'Title: New Idea\n\nTopic:\n\n- Main concept:\n- Features:\n- Next steps:' }
];

function NotesApp({ router }) {
  const [view, setView] = useState('list'); // 'list' | 'editor' | 'history'
  const [notes, setNotes] = useState(() => load('ck_notes_list', []));
  const [activeNote, setActiveNote] = useState(null);
  const [tempTitle, setTempTitle] = useState('');
  const [tempContent, setTempContent] = useState('');
  const [selectedHistoryVer, setSelectedHistoryVer] = useState(null);
  const noteText = tempContent;

  // Synchronize notes list with localstorage
  const saveNotesList = (updatedNotes) => {
    setNotes(updatedNotes);
    save('ck_notes_list', updatedNotes);
  };

  const openEditor = (note = null) => {
    if (note) {
      setActiveNote(note);
      setTempTitle(note.title);
      setTempContent(note.content);
    } else {
      // New note
      setActiveNote({ id: 'new_' + Date.now(), title: '', content: '', history: [] });
      setTempTitle('');
      setTempContent('');
    }
    setView('editor');
  };

  const loadTemplate = (tmpl) => {
    setActiveNote({ id: 'new_' + Date.now(), title: tmpl.title.replace(/^[^\s]+\s+/, ''), content: tmpl.content, history: [] });
    setTempTitle(tmpl.title.replace(/^[^\s]+\s+/, ''));
    setTempContent(tmpl.content);
    setView('editor');
    Toast('Template loaded');
  };

  const handleSave = () => {
    const title = tempTitle.trim() || 'Untitled Note';
    const content = tempContent.trim();
    if (!content) {
      Toast('Note cannot be empty');
      return;
    }

    const isNew = String(activeNote.id).startsWith('new_');
    const noteId = isNew ? 'note_' + Date.now() : activeNote.id;
    const now = Date.now();

    let updatedNotes;
    if (isNew) {
      const newNote = {
        id: noteId,
        title,
        content,
        updatedAt: now,
        history: [] // History records of previous states
      };
      updatedNotes = [newNote, ...notes];
    } else {
      // Keep up to 5 previous history records
      const previousHistory = activeNote.history || [];
      const isContentChanged = activeNote.content !== content;
      const historyRecord = isContentChanged ? [{ content: activeNote.content, updatedAt: activeNote.updatedAt }, ...previousHistory].slice(0, 5) : previousHistory;

      updatedNotes = notes.map(n => {
        if (n.id === activeNote.id) {
          return {
            ...n,
            title,
            content,
            updatedAt: now,
            history: historyRecord
          };
        }
        return n;
      });
    }

    saveNotesList(updatedNotes);
    setView('list');
    Toast('Saved successfully');
  };

  const handleDelete = (note) => {
    Dialog({
      title: 'Delete Note?',
      message: `Are you sure you want to delete "${note.title || 'this note'}"?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        const updatedNotes = notes.filter(n => n.id !== note.id);
        saveNotesList(updatedNotes);
        setView('list');
        Toast('Deleted');
      }
    });
  };

  const handleRestoreHistory = (historyItem) => {
    setTempContent(historyItem.content);
    setView('editor');
    Toast('Previous version restored');
  };

  // Bind Softkey mappings based on current active view
  useEffect(() => {
    if (view === 'list') {
      setSoftKeys({
        left: 'New Note',
        center: 'Select',
        right: 'Back',
        onLeft: () => openEditor(null),
        onCenter: null,
        onRight: () => router.back()
      });
    } else if (view === 'editor') {
      setSoftKeys({
        left: 'Save',
        center: 'Select',
        right: 'Cancel',
        onLeft: handleSave,
        onCenter: null,
        onRight: () => setView('list')
      });
    } else if (view === 'history') {
      setSoftKeys({
        left: 'Restore',
        center: 'Select',
        right: 'Back',
        onLeft: () => selectedHistoryVer && handleRestoreHistory(selectedHistoryVer),
        onCenter: null,
        onRight: () => setView('editor')
      });
    }
  }, [view, noteText, tempTitle, tempContent, activeNote, selectedHistoryVer]);


  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (view === 'list') {
    return html`
      <div class="ck-screen ck-notes-v2">
        <header class="ck-nt-header">
          <div class="ck-nt-header__title">Notes List 📝</div>
          <div class="ck-nt-header__subtitle">Manage notes, templates and revisions</div>
        </header>

        <main class="ck-nt-content">
          <button
            type="button"
            class="ck-action"
            onClick=${() => openEditor(null)}
            data-focusable
          >
            ➕ New Memo note
          </button>

          <div class="ck-nt-section-title">Saved Notes</div>
          <div class="ck-nt-list">
            ${notes.length === 0
              ? html`<div class="ck-nt-empty">No notes saved yet</div>`
              : notes.map(note => html`
                  <div
                    class="ck-nt-item"
                    onClick=${() => openEditor(note)}
                    data-focusable
                  >
                    <span class="ck-nt-item__title">${note.title}</span>
                    <span class="ck-nt-item__snippet">${note.content}</span>
                    <div class="ck-nt-item__meta">
                      <span>📅 ${formatDate(note.updatedAt)}</span>
                      <span>⏱️ ${note.history?.length || 0} revs</span>
                    </div>
                  </div>
                `)
            }
          </div>

          <div class="ck-nt-section-title">Use Template</div>
          <div class="ck-tr-chips">
            ${TEMPLATES.map(tmpl => html`
              <button
                type="button"
                class="ck-chip"
                onClick=${() => loadTemplate(tmpl)}
                data-focusable
              >
                ${tmpl.title.split(' ')[0]}
              </button>
            `)}
          </div>
        </main>

        <footer class="ck-nt-navbar">
          <span class="ck-nt-navbar__label">LSK: New Note</span>
          <span class="ck-nt-navbar__label">RSK: Back</span>
        </footer>
      </div>
    `;
  }

  if (view === 'editor') {
    const hasHistory = activeNote && activeNote.history && activeNote.history.length > 0;
    return html`
      <div class="ck-screen ck-notes-v2">
        <header class="ck-nt-header">
          <div class="ck-nt-header__title">Note Editor ✍️</div>
          <div class="ck-nt-header__subtitle">Writing note...</div>
        </header>

        <main class="ck-nt-content">
          <div class="ck-tr-field">
            <label class="ck-tr-field__label" for="notes-title-input">Title</label>
            <input
              id="notes-title-input"
              class="ck-input"
              type="text"
              placeholder="Note Title"
              value=${tempTitle}
              onInput=${(e) => setTempTitle(e.target.value)}
              data-focusable
            />
          </div>

          <div class="ck-tr-field">
            <label class="ck-tr-field__label" for="notes-input">Content</label>
            <textarea
              id="notes-input"
              class="ck-textarea"
              placeholder="Write note body here..."
              value=${tempContent}
              onInput=${(e) => setTempContent(e.target.value)}
              data-focusable
            />
          </div>

          <div class="ck-nt-actions">
            <button
              type="button"
              class="ck-action"
              onClick=${handleSave}
              data-focusable
            >
              Save
            </button>
            ${hasHistory && html`
              <button
                type="button"
                class="ck-action"
                onClick=${() => { setView('history'); setSelectedHistoryVer(activeNote.history[0]); }}
                data-focusable
              >
                History
              </button>
            `}
            ${!String(activeNote.id).startsWith('new_') && html`
              <button
                type="button"
                class="ck-action"
                onClick=${() => handleDelete(activeNote)}
                data-focusable
              >
                Delete
              </button>
            `}
            <button
              type="button"
              class="ck-action"
              onClick=${() => setView('list')}
              data-focusable
            >
              Cancel
            </button>
          </div>
        </main>

        <footer class="ck-nt-navbar">
          <span class="ck-nt-navbar__label">LSK: Save</span>
          <span class="ck-nt-navbar__label">RSK: Cancel</span>
        </footer>
      </div>
    `;
  }

  if (view === 'history') {
    const historyList = activeNote.history || [];
    return html`
      <div class="ck-screen ck-notes-v2">
        <header class="ck-nt-header">
          <div class="ck-nt-header__title">Note History ⏱️</div>
          <div class="ck-nt-header__subtitle">Select previous saved revisions</div>
        </header>

        <main class="ck-nt-content">
          <div class="ck-nt-section-title">Saved Revisions</div>
          <div class="ck-nt-list">
            ${historyList.map((hist, idx) => html`
              <div
                class=${`ck-nt-item ${selectedHistoryVer === hist ? 'is-focused' : ''}`}
                onClick=${() => setSelectedHistoryVer(hist)}
                onDblClick=${() => handleRestoreHistory(hist)}
                data-focusable
              >
                <span class="ck-nt-item__title">Revision #${historyList.length - idx}</span>
                <span class="ck-nt-item__snippet">${hist.content}</span>
                <div class="ck-nt-item__meta">
                  <span>📅 Saved at ${formatDate(hist.updatedAt)}</span>
                </div>
              </div>
            `)}
          </div>

          <div class="ck-nt-actions">
            <button
              type="button"
              class="ck-action"
              onClick=${() => handleRestoreHistory(selectedHistoryVer)}
              data-focusable
              disabled=${!selectedHistoryVer}
            >
              Restore
            </button>
            <button
              type="button"
              class="ck-action"
              onClick=${() => setView('editor')}
              data-focusable
            >
              Back
            </button>
          </div>
        </main>

        <footer class="ck-nt-navbar">
          <span class="ck-nt-navbar__label">LSK: Restore</span>
          <span class="ck-nt-navbar__label">RSK: Back</span>
        </footer>
      </div>
    `;
  }

  return null;
}

export function renderNotes({ root, router }) {
  render(html`<${NotesApp} router=${router} />`, root);
}

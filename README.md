# 📱 CloudKit OS

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

[![Platform: Web / Cloud Widget](https://img.shields.io/badge/Platform-Web%20%2F%20Cloud-orange.svg)](#)
[![Dependencies: None](https://img.shields.io/badge/Dependencies-None-brightgreen.svg)](#)
[![Built with: Vanilla JS & CSS](https://img.shields.io/badge/Built%20with-Vanilla%20JS%20%26%20CSS-blueviolet.svg)](#)

> A lightweight, modular micro-OS shell and application framework designed for cloud phone widgets and keypad-driven web environments.

```
   ┌───────────────────────────────────────────────┐
   │ 📶 12:00 AM                       CloudKit OS │
   ├───────────────────────────────────────────────┤
   │                                               │
   │   🤖 AI Assistant        [Soon]               │
   │   🌐 Translator          [Bangla ⇄ English]  │
   │  👉🧮 Calculator          [Working]          │
   │   ⛅ Weather             [Open-Meteo API]     │
   │   📝 Notes               [Local Persistence]  │
   │   ⚙️ Settings            [Theme Toggle]       │
   │                                               │
   ├───────────────────────────────────────────────┤
   │    [Menu]            [Select]          [Exit] │
   └───────────────────────────────────────────────┘
```

---

## ✨ Features

- 🔋 **Zero Build Steps**: Runs directly in any modern browser using native ES Modules.
- 🎯 **Predictive Spatial D-Pad Navigation**: Fully optimized arrow/keypad navigation engine with intelligent proximity scoring to avoid jumpy grid movements.
- ⚡ **Strict Single-Activation**: Robust click-event unification ensuring zero duplicate triggers between keypad `Enter` and mouse clicks.
- 💾 **State & Focus Preservation**: Back navigation (`router.back()`) restores the exact page state, scroll offset, and item focus.
- 🎹 **Context-Aware Softkeys**: An adaptive status bar (LSK/CSK/RSK) that changes its actions and labels based on the active application.
- 🛠️ **Built-in Dev Controls**: Floating hardware-simulator overlay for quick testing, enabled with `?dev=1` or the `ck:dev-controls` localStorage flag.

---

## 🏛️ Repository Structure

```
CloudKit/
├── apps/                 # Built-in Applications
│   ├── home.js           # Launcher screen
│   ├── calculator.js     # Standard key-grid calculator
│   ├── notes.js          # Persistent local text editor
│   ├── translator.js     # Bangla ⇄ English offline/online translator
│   ├── weather.js        # Geolocation-enabled weather forecast app
│   ├── settings.js       # App configuration and theme selector
│   └── placeholder.js    # Unimplemented feature fallback screen
│
├── core/                 # Core Framework & OS Architecture
│   ├── nav.js            # Spatial navigation and focus management
│   ├── router.js         # Single-screen routing and history engine
│   ├── softkeys.js       # Contextual left/center/right softkey manager
│   ├── storage.js        # LocalStorage persistence wrapper
│   └── theme.js          # Dark/Light theme toggles
│
├── styles/               # CSS Styles & Modules
│   ├── main.css          # Entrypoint imports
│   ├── base.css          # Root variables and core elements
│   ├── calculator.css    # Calculator app overrides
│   ├── dictionary.css    # Dictionary app overrides
│   ├── launcher.css      # Home launcher screen styles
│   └── weather.css       # Weather app styling
│
├── index.html            # OS entrypoint and layout template
└── app.js                # App bootstrap & event wiring
```

---

## 🚀 Getting Started

No build or compiler steps are required. Simply host the folder with any static HTTP server.

### 1. Run Locally
Using Node (npx):
```bash
npx serve -l 8080
```
Or Python:
```bash
python -m http.server 8080
```

### 2. Open in Browser
Visit `http://localhost:8080/` to launch the CloudKit Shell.

---

## 🕹️ Keyboard Controls

| Key | Action |
|-----|--------|
| **Arrow Up / Down / Left / Right** | D-pad navigation between focusable items; in editable fields, arrows can also move between neighboring form controls |
| **Enter** | Center Softkey (CSK) / Trigger action |
| **F1 / Escape** | Left Softkey (LSK) |
| **F2 / Backspace** | Right Softkey (RSK) / Back |

---

## 🛠️ Developer Testing Mode
A simulation control pad can be enabled on desktop by adding `?dev=1` to the URL or setting `localStorage.setItem('ck:dev-controls', '1')` in the browser console. Use it to simulate hardware keys, test focus order, and debug screen flows under a device constraint.

## ✍️ Form Navigation

Text inputs, textareas, and select boxes are part of the D-pad focus order in apps that use them, including Weather, Dictionary, Translator, Notes, and the launcher search box. Use the arrow keys or D-pad to move into a field, type normally once focused, and move on to the next control when you reach a field edge.

---

## 📜 License
Distributed under the GNU Affero General Public License v3 (AGPL-3.0). See [LICENSE](LICENSE) for more details.


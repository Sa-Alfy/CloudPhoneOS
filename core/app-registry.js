import { load, save } from './storage.js';

const RECENTS_KEY = 'recents';
const MAX_RECENTS = 5;

class AppRegistry {
  constructor() {
    /** @type {Map<string, Object>} */
    this.apps = new Map();
  }

  /**
   * Explicitly register an app manifest (pure metadata).
   * @param {Object} manifest
   */
  register(manifest) {
    if (!manifest || !manifest.id) {
      console.error('AppRegistry: Invalid manifest', manifest);
      return;
    }
    this.apps.set(manifest.id, {
      id: manifest.id,
      name: manifest.name || manifest.id,
      icon: manifest.icon || '📱',
      order: typeof manifest.order === 'number' ? manifest.order : 99,
      description: manifest.description || '',
      version: manifest.version || '1.0',
      keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [],
      route: manifest.route || manifest.id,
      disabled: Boolean(manifest.disabled),
      meta: manifest.meta || (manifest.disabled ? 'Coming soon' : '')
    });
  }

  /**
   * Get all registered apps sorted by order.
   * @returns {Array<Object>}
   */
  getAll() {
    return Array.from(this.apps.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * Get a registered app by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  get(id) {
    return this.apps.get(id) || null;
  }

  /**
   * Record an app launch in recent apps storage.
   * @param {string} id
   */
  recordLaunch(id) {
    if (!id || id === 'home' || !this.apps.has(id)) return;
    const app = this.apps.get(id);
    if (app?.disabled) return;

    let recents = load(RECENTS_KEY, []);
    // Remove if already present (deduplicate)
    recents = recents.filter((appId) => appId !== id);
    // Add to front
    recents.unshift(id);
    // Limit to MAX_RECENTS
    if (recents.length > MAX_RECENTS) {
      recents = recents.slice(0, MAX_RECENTS);
    }
    save(RECENTS_KEY, recents);
  }

  /**
   * Get recently launched apps (up to MAX_RECENTS).
   * @returns {Array<Object>}
   */
  getRecents() {
    const recentIds = load(RECENTS_KEY, []);
    return recentIds
      .map((id) => this.apps.get(id))
      .filter((app) => app && !app.disabled);
  }

  /**
   * Perform smart search ranking across registered apps.
   * Ranking rules:
   * 1. Recents matching query
   * 2. Exact Name match
   * 3. Exact Keyword match
   * 4. Name starts with query
   * 5. Name / description / keywords contain query
   * @param {string} query
   * @returns {Array<Object>}
   */
  search(query = '') {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAll();

    const recentsSet = new Set(this.getRecents().map((a) => a.id));
    const allApps = this.getAll();

    /** @type {Array<{ app: Object, score: number }>} */
    const scored = [];

    for (const app of allApps) {
      const nameLower = app.name.toLowerCase();
      const descLower = app.description.toLowerCase();
      const keywordsLower = app.keywords.map((k) => String(k).toLowerCase());

      let rank = 999;

      // 1. Recents match
      const isRecent = recentsSet.has(app.id);
      const matchesName = nameLower.includes(q);
      const matchesKeyword = keywordsLower.some((k) => k.includes(q));
      const matchesDesc = descLower.includes(q);

      if (!matchesName && !matchesKeyword && !matchesDesc) {
        continue; // No match at all
      }

      if (isRecent && (matchesName || matchesKeyword)) {
        rank = 1;
      } else if (nameLower === q) {
        // 2. Exact Name match
        rank = 2;
      } else if (keywordsLower.some((k) => k === q)) {
        // 3. Exact Keyword match
        rank = 3;
      } else if (nameLower.startsWith(q)) {
        // 4. Starts with Name
        rank = 4;
      } else {
        // 5. Contains match
        rank = 5;
      }

      scored.push({ app, score: rank });
    }

    scored.sort((a, b) => a.score - b.score || a.app.order - b.app.order);
    return scored.map((item) => item.app);
  }
}

export const appRegistry = new AppRegistry();

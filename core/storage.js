const PREFIX = 'cloudkit:';

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('CloudKit storage save failed:', error);
    return false;
  }
}

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.error('CloudKit storage load failed:', error);
    return fallback;
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

export function clearAll() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}

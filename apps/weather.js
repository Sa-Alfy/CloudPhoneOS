import { Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';
import { save, load } from '../core/storage.js';

export const manifest = {
  id: 'weather',
  name: 'Weather',
  icon: '☁️',
  order: 3,
  description: 'Current conditions & forecast.',
  version: '2.0',
  keywords: ['climate', 'forecast', 'rain', 'temperature', 'sun', 'cloud'],
  route: 'weather'
};

const CACHE_KEY = 'weather:cache';

const WEATHER_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Heavy freezing rain',
  71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Patchy rain nearby', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail'
};

function conditionLabel(code) {
  return WEATHER_CODES[code] ?? 'Unknown conditions';
}

function heroIcon(code, isDay) {
  if (!isDay) {
    if (code <= 1)  return '🌙';
    if (code <= 2)  return '🌥️';
    if (code <= 3)  return '☁️';
    if (code <= 48) return '🌫️';
    if (code <= 67 || (code >= 80 && code <= 82)) return '🌧️';
    if (code <= 77 || (code >= 85 && code <= 86)) return '🌨️';
    return '⛈️';
  }
  if (code === 0)  return '☀️';
  if (code <= 2)   return '⛅';
  if (code === 3)  return '☁️';
  if (code <= 48)  return '🌫️';
  if (code <= 57)  return '🌦️';
  if (code <= 67)  return '🌧️';
  if (code <= 77)  return '❄️';
  if (code <= 82)  return '🌧️';
  if (code <= 86)  return '🌨️';
  return '⛈️';
}

function rowIcon(code, isDay) {
  return heroIcon(code, isDay);
}

function bgClass(code, isDay) {
  if (code <= 1)  return isDay ? 'wx-clear-day'   : 'wx-clear-night';
  if (code <= 2)  return isDay ? 'wx-partly-day'  : 'wx-partly-night';
  if (code === 3) return 'wx-overcast';
  if (code <= 48) return 'wx-fog';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'wx-rain';
  if (code <= 77 || (code >= 85 && code <= 86)) return 'wx-snow';
  return 'wx-storm';
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

function formatHourLabel(isoString) {
  const d = new Date(isoString);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { date: `${month}/${day}`, time: `${h12}${ampm}` };
}

export function renderWeather({ root, router }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ck-screen ck-weather-v2';

  wrapper.innerHTML = `
    <div class="ck-wx-bg wx-partly-night" id="wx-bg">

      <!-- Search panel (swaps with hero) -->
      <div class="ck-wx-search-panel" id="wx-search-panel" hidden>
        <input id="ck-city" class="ck-wx-search-input" type="text"
               placeholder="Search city…" autocomplete="off" spellcheck="false">
        <button type="button" class="ck-wx-search-btn" id="wx-search-go">Go</button>
      </div>

      <!-- Hero -->
      <div class="ck-wx-hero" id="wx-hero">
        <div class="ck-wx-hero__left">
          <div class="ck-wx-hero__city" id="wx-city">—</div>
          <div class="ck-wx-hero__temp" id="wx-temp">—</div>
          <div class="ck-wx-hero__cond" id="wx-cond">Loading…</div>
        </div>
        <div class="ck-wx-hero__icon" id="wx-icon">🌤️</div>
      </div>

      <!-- Hourly list -->
      <div class="ck-wx-hourly" id="wx-hourly">
        <div class="ck-wx-loading">Fetching forecast…</div>
      </div>

      <!-- Bottom nav bar -->
      <div class="ck-wx-navbar">
        <button class="ck-wx-navbar__btn" id="wx-menu-btn" type="button">☰</button>
        <div class="ck-wx-navbar__dots" id="wx-dots">
          <span class="ck-wx-dot ck-wx-dot--active"></span>
          <span class="ck-wx-dot"></span>
        </div>
        <button class="ck-wx-navbar__btn" id="wx-back-btn" type="button">←</button>
      </div>
    </div>
  `;

  const bgEl       = wrapper.querySelector('#wx-bg');
  const cityEl     = wrapper.querySelector('#wx-city');
  const tempEl     = wrapper.querySelector('#wx-temp');
  const condEl     = wrapper.querySelector('#wx-cond');
  const iconEl     = wrapper.querySelector('#wx-icon');
  const hourlyEl   = wrapper.querySelector('#wx-hourly');
  const heroEl     = wrapper.querySelector('#wx-hero');
  const searchPanel = wrapper.querySelector('#wx-search-panel');
  const cityInput  = wrapper.querySelector('#ck-city');
  const goBtn      = wrapper.querySelector('#wx-search-go');

  let focusedIdx  = 0;
  let hourlyItems = [];
  let searchMode  = false;

  // ── Softkeys ─────────────────────────────────────────────────────────────
  function setDefaultSoftkeys() {
    setSoftKeys({
      left: 'Search', center: '', right: 'Back',
      onLeft: openSearch, onCenter: null, onRight: () => router.back()
    });
  }

  function setSearchSoftkeys() {
    setSoftKeys({
      left: '', center: 'Search', right: 'Cancel',
      onLeft: null, onCenter: doSearch, onRight: closeSearch
    });
  }

  // ── Search overlay ────────────────────────────────────────────────────────
  function openSearch() {
    searchMode = true;
    heroEl.hidden = true;
    searchPanel.hidden = false;
    cityInput.focus();
    setSearchSoftkeys();
  }

  function closeSearch() {
    searchMode = false;
    searchPanel.hidden = true;
    heroEl.hidden = false;
    cityInput.blur();
    setDefaultSoftkeys();
  }

  // ── Background ────────────────────────────────────────────────────────────
  function applyBg(code, isDay) {
    // Strip old wx-* classes
    const keep = [...bgEl.classList].filter(c => !c.startsWith('wx-'));
    bgEl.className = [...keep, bgClass(code, isDay)].join(' ');
  }

  // ── Hourly render ─────────────────────────────────────────────────────────
  function buildHourlyItems(hourly) {
    const now = Date.now();
    // Find first hour >= now
    let start = 0;
    for (let i = 0; i < hourly.time.length; i++) {
      if (new Date(hourly.time[i]).getTime() >= now) { start = i; break; }
    }
    const items = [];
    for (let i = start; i < Math.min(start + 24, hourly.time.length); i++) {
      const code = hourly.weather_code?.[i] ?? hourly.weathercode?.[i] ?? 0;
      const isDay = hourly.is_day?.[i] ?? (new Date(hourly.time[i]).getHours() >= 6 && new Date(hourly.time[i]).getHours() < 19 ? 1 : 0);
      items.push({
        time:   hourly.time[i],
        temp:   hourly.temperature_2m[i],
        precip: hourly.precipitation_probability?.[i] ?? 0,
        code,
        isDay
      });
    }
    return items;
  }

  function paintHourly() {
    hourlyEl.innerHTML = '';
    hourlyItems.forEach((item, i) => {
      const { date, time } = formatHourLabel(item.time);
      const icon = rowIcon(item.code, item.isDay);
      const row = document.createElement('div');
      row.className = 'ck-wx-hour' + (i === focusedIdx ? ' ck-wx-hour--active' : '');
      row.innerHTML = `
        <div class="ck-wx-hour__time">
          <span class="ck-wx-hour__date">${date}</span>
          <span class="ck-wx-hour__label">${time}</span>
        </div>
        <span class="ck-wx-hour__icon">${icon}</span>
        <span class="ck-wx-hour__precip">${item.precip}%</span>
        <span class="ck-wx-hour__temp">${Math.round(item.temp)}°</span>
      `;
      hourlyEl.appendChild(row);
    });
    // Scroll focused into view
    hourlyEl.querySelector('.ck-wx-hour--active')?.scrollIntoView({ block: 'nearest' });
  }

  // ── Render current + hourly data ──────────────────────────────────────────
  function renderData({ place, current, hourly, isDay }) {
    applyBg(current.weather_code, isDay);
    iconEl.textContent = heroIcon(current.weather_code, isDay);
    tempEl.textContent = `${current.temperature_2m.toFixed(1)}°`;
    cityEl.textContent = place;
    condEl.textContent = conditionLabel(current.weather_code);
    if (hourly) {
      hourlyItems = buildHourlyItems(hourly);
      focusedIdx  = 0;
      paintHourly();
    }
  }

  // ── API calls ─────────────────────────────────────────────────────────────
  async function loadByCoords(lat, lon, place, { silent = false } = {}) {
    if (!silent) {
      condEl.textContent = 'Loading…';
      hourlyEl.innerHTML = '<div class="ck-wx-loading">Fetching forecast…</div>';
    }

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',  String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current',   'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day');
    url.searchParams.set('hourly',    'temperature_2m,precipitation_probability,weather_code,is_day');
    url.searchParams.set('forecast_days', '2');
    url.searchParams.set('timezone',  'auto');

    const data    = await fetchJson(url);
    const current = data.current;
    if (!current) throw new Error('No current weather data');

    const isDay = current.is_day ?? 1;
    renderData({ place, current, hourly: data.hourly, isDay });
    save(CACHE_KEY, { city: place, lat, lon, current, hourly: data.hourly, isDay, timestamp: Date.now() });
    if (!silent) Toast('Updated');
  }

  async function searchCity(city, { silent = false } = {}) {
    const name = city.trim();
    if (!name) { Toast('Type a city first'); return; }
    if (!silent) { cityEl.textContent = `${name}…`; condEl.textContent = ''; }

    const geo = new URL('https://geocoding-api.open-meteo.com/v1/search');
    geo.searchParams.set('name',     name);
    geo.searchParams.set('count',    '1');
    geo.searchParams.set('language', 'en');
    geo.searchParams.set('format',   'json');

    const places   = await fetchJson(geo);
    const location = places.results?.[0];
    if (!location) {
      cityEl.textContent = 'City not found';
      if (!silent) Toast('No match');
      return;
    }
    await loadByCoords(location.latitude, location.longitude, location.name, { silent });
  }

  async function useLocation() {
    if (!navigator.geolocation) { Toast('Location unavailable'); return; }
    cityEl.textContent = 'Getting location…';
    condEl.textContent = '';
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try { await loadByCoords(coords.latitude, coords.longitude, 'My Location'); }
        catch (err) { cityEl.textContent = 'Error'; Toast(err.message || 'Failed'); }
      },
      (err) => { cityEl.textContent = 'Location blocked'; Toast(err.message || 'Denied'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const doSearch = () => {
    const city = cityInput.value.trim();
    if (!city) return;
    closeSearch();
    searchCity(city).catch(err => { cityEl.textContent = 'Error'; Toast(err.message || 'Network error'); });
  };

  // ── Events ────────────────────────────────────────────────────────────────
  goBtn.addEventListener('click', doSearch);
  cityInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
  wrapper.querySelector('#wx-menu-btn').addEventListener('click', openSearch);
  wrapper.querySelector('#wx-back-btn').addEventListener('click', () => router.back());

  // D-pad scrolls through hourly rows
  const keyHandler = e => {
    if (!root.contains(wrapper)) { window.removeEventListener('keydown', keyHandler); return; }
    if (searchMode) return;
    if (e.key === 'ArrowDown' && focusedIdx < hourlyItems.length - 1) {
      e.preventDefault(); focusedIdx++; paintHourly();
    } else if (e.key === 'ArrowUp' && focusedIdx > 0) {
      e.preventDefault(); focusedIdx--; paintHourly();
    }
  };
  window.addEventListener('keydown', keyHandler);

  setDefaultSoftkeys();
  root.appendChild(wrapper);

  // ── Boot: load cache or default city ─────────────────────────────────────
  const cached = load(CACHE_KEY);
  if (cached?.current) {
    renderData({ place: cached.city, current: cached.current, hourly: cached.hourly, isDay: cached.isDay ?? 1 });
    if (cached.lat && cached.lon) {
      loadByCoords(cached.lat, cached.lon, cached.city, { silent: true }).catch(() => {});
    } else {
      searchCity(cached.city, { silent: true }).catch(() => {});
    }
  } else {
    searchCity('Dhaka').catch(err => { cityEl.textContent = 'Error'; Toast(err.message || 'Network error'); });
  }
}

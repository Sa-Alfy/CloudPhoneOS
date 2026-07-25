import { Toast } from '../core/components.js';
import { setSoftKeys } from '../core/softkeys.js';
import { save, load } from '../core/storage.js';

export const manifest = {
  id: 'weather',
  name: 'Weather',
  icon: '☁️',
  order: 3,
  description: 'Current conditions & forecast.',
  version: '1.0',
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
  80: 'Rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail'
};

function conditionLabel(code) {
  return WEATHER_CODES[code] || 'Unknown conditions';
}

function weatherIcon(code) {
  if (code === 0)                        return '☀️';
  if (code <= 2)                         return '⛅';
  if (code === 3)                        return '☁️';
  if (code <= 48)                        return '🌫️';
  if (code <= 57)                        return '🌦️';
  if (code <= 67)                        return '🌧️';
  if (code <= 77)                        return '❄️';
  if (code <= 82)                        return '🌧️';
  if (code <= 86)                        return '🌨️';
  return '⛈️';
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

function formatHumidity(v) { return typeof v === 'number' ? `${v}%` : '—'; }
function formatWind(v)     { return typeof v === 'number' ? `${Math.round(v)} km/h` : '—'; }

function formatTimestamp(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function renderWeather({ root, router }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ck-screen ck-weather';
  wrapper.innerHTML = `
    <div class="ck-weather-search-bar">
      <input id="ck-city" class="ck-input" type="text" placeholder="Search city..." autocomplete="off" spellcheck="false" data-focusable>
      <button type="button" class="ck-weather-search-btn" data-action="search" data-focusable>Search</button>
    </div>

    <section class="ck-weather-hero" aria-live="polite">
      <div class="ck-weather-hero__icon" id="ck-weather-hero-icon">🌤️</div>
      <div class="ck-weather-hero__temp" id="ck-weather-hero-temp">—</div>
      <div class="ck-weather-hero__location" id="ck-weather-hero-loc">Ready</div>
      <div class="ck-weather-hero__cond" id="ck-weather-hero-cond">Type a city and search.</div>
    </section>

    <section class="ck-panel ck-weather-result">
      <div class="ck-weather-grid" id="ck-weather-grid">
        <div class="ck-weather-stat">
          <div class="ck-weather-stat__label">Feels like</div>
          <div class="ck-weather-stat__value" id="ck-weather-feels">—</div>
        </div>
        <div class="ck-weather-stat">
          <div class="ck-weather-stat__label">Humidity</div>
          <div class="ck-weather-stat__value" id="ck-weather-humidity">—</div>
        </div>
        <div class="ck-weather-stat">
          <div class="ck-weather-stat__label">Wind</div>
          <div class="ck-weather-stat__value" id="ck-weather-wind">—</div>
        </div>
        <div class="ck-weather-stat">
          <div class="ck-weather-stat__label">Updated</div>
          <div class="ck-weather-stat__value" id="ck-weather-note" style="font-size: 14px; color: var(--muted); margin-top: 8px; font-weight: normal;">—</div>
        </div>
      </div>
    </section>
  `;

  const cityInput = wrapper.querySelector('#ck-city');
  const heroIcon = wrapper.querySelector('#ck-weather-hero-icon');
  const heroTemp = wrapper.querySelector('#ck-weather-hero-temp');
  const heroLoc = wrapper.querySelector('#ck-weather-hero-loc');
  const heroCond = wrapper.querySelector('#ck-weather-hero-cond');
  const feelsEl = wrapper.querySelector('#ck-weather-feels');
  const humidityEl = wrapper.querySelector('#ck-weather-humidity');
  const windEl = wrapper.querySelector('#ck-weather-wind');
  const noteEl = wrapper.querySelector('#ck-weather-note');

  function setLoading(message = 'Loading weather…') {
    heroLoc.textContent = message;
    heroCond.textContent = 'Fetching current conditions…';
    noteEl.textContent = 'Please wait.';
  }

  function setEmpty(message = 'No data') {
    heroLoc.textContent = message;
    heroCond.textContent = 'Try another city.';
    heroTemp.textContent = '—';
    feelsEl.textContent = '—';
    humidityEl.textContent = '—';
    windEl.textContent = '—';
    noteEl.textContent = '—';
  }

  function renderData({ place, current, cached = false }) {
    const icon = weatherIcon(current.weather_code);
    heroIcon.textContent = icon;
    heroTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
    heroLoc.textContent = place;
    heroCond.textContent = conditionLabel(current.weather_code);
    
    feelsEl.textContent = `${Math.round(current.apparent_temperature)}°C`;
    humidityEl.textContent = formatHumidity(current.relative_humidity_2m);
    windEl.textContent = formatWind(current.wind_speed_10m);
    noteEl.textContent = cached
      ? `${formatTimestamp(load(CACHE_KEY)?.timestamp)} (Cached)`
      : `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  async function loadWeatherByCoords(latitude, longitude, place, { silent = false } = {}) {
    if (!silent) setLoading();
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(latitude));
    url.searchParams.set('longitude', String(longitude));
    url.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m');
    url.searchParams.set('timezone', 'auto');

    const data = await fetchJson(url);
    const current = data.current;
    if (!current) throw new Error('No current weather returned');

    renderData({ place, current, cached: false });

    save(CACHE_KEY, { city: place, current, timestamp: Date.now() });
    if (!silent) Toast('Weather updated');
  }

  async function searchCity(city, { silent = false } = {}) {
    const name = city.trim();
    if (!name) { Toast('Type a city first'); return; }

    if (!silent) setLoading(`Searching ${name}…`);

    const geo = new URL('https://geocoding-api.open-meteo.com/v1/search');
    geo.searchParams.set('name', name);
    geo.searchParams.set('count', '1');
    geo.searchParams.set('language', 'en');
    geo.searchParams.set('format', 'json');

    const places = await fetchJson(geo);
    const location = places.results?.[0];
    if (!location) {
      setEmpty('City not found');
      if (!silent) Toast('No match');
      return;
    }

    const placeName = [location.name, location.admin1, location.country].filter(Boolean).join(', ');
    await loadWeatherByCoords(location.latitude, location.longitude, placeName, { silent });
  }

  async function useLocation() {
    if (!navigator.geolocation) { Toast('Location unavailable'); return; }
    setLoading('Getting location…');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await loadWeatherByCoords(
            position.coords.latitude,
            position.coords.longitude,
            'Current location'
          );
        } catch (err) {
          setEmpty('Location weather failed');
          Toast(err.message || 'Weather request failed');
        }
      },
      (err) => {
        setEmpty('Location blocked');
        Toast(err.message || 'Permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const doSearch = () => {
    searchBtn.textContent = '⏳';
    searchBtn.setAttribute('disabled', '');
    searchCity(cityInput.value)
      .catch((err) => {
        setEmpty('Weather unavailable');
        Toast(err.message || 'Network error');
      })
      .finally(() => {
        searchBtn.textContent = 'Search';
        searchBtn.removeAttribute('disabled');
      });
  };

  setSoftKeys({
    left: 'Location',
    center: 'Search',
    right: 'Back',
    onLeft: () => useLocation(),
    onCenter: () => doSearch(),
    onRight: () => router.back()
  });

  const searchBtn = wrapper.querySelector('[data-action="search"]');
  searchBtn.addEventListener('click', doSearch);

  cityInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      doSearch();
    }
  });

  root.appendChild(wrapper);

  const cached = load(CACHE_KEY);
  if (cached?.city && cached?.current) {
    cityInput.value = cached.city;
    renderData({ place: cached.city, current: cached.current, cached: true });

    searchCity(cached.city, { silent: true }).catch(() => {});
  } else {
    const defaultCity = 'Dhaka';
    cityInput.value = defaultCity;
    searchCity(defaultCity).catch((err) => {
      setEmpty('Weather unavailable');
      Toast(err.message || 'Network error');
    });
  }
}


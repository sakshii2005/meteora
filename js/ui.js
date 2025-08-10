// ui.js
import { appState } from './state.js';
import { getAQIDescription } from './api.js';
import { getMoonPhase } from './api.js';

// DOM element references
const elements = {
  loading: document.getElementById('loading'),
  weatherContent: document.getElementById('weather-content'),
  errorMessage: document.getElementById('error-message'),
  errorText: document.getElementById('error-text'),
  searchResults: document.getElementById('search-results'),
  currentLocation: document.getElementById('current-location'),
  currentTime: document.getElementById('current-time'),
  currentIcon: document.getElementById('current-icon'),
  currentTemp: document.getElementById('current-temp'),
  currentCondition: document.getElementById('current-condition'),
  feelsLike: document.getElementById('feels-like'),
  humidity: document.getElementById('humidity'),
  windSpeed: document.getElementById('wind-speed'),
  pressure: document.getElementById('pressure'),
  uvIndex: document.getElementById('uv-index'),
  visibility: document.getElementById('visibility'),
  moonPhase: document.getElementById('moon-phase'),
  dailyForecast: document.getElementById('daily-forecast'),
  airQuality: document.getElementById('air-quality'),
  favoriteBtn: document.getElementById('favorite-btn'),
  favoritesList: document.getElementById('favorites-list'),
  favoritesSection: document.getElementById('favorites-section')
};

// Initialize UI
export function initializeUI() {
  // Set up state listeners
  appState.on('locationChange', handleLocationChange);
  appState.on('weatherChange', handleWeatherChange);
  appState.on('favoritesChange', handleFavoritesChange);
  appState.on('loadingChange', handleLoadingChange);
  appState.on('errorChange', handleErrorChange);
  appState.on('settingsChange', handleSettingsChange);

  // Update favorites display
  updateFavoritesDisplay();
  
  // Update current time
  updateCurrentTime();
  setInterval(updateCurrentTime, 60000); // Update every minute
}

// Show loading state
export function showLoading() {
  elements.loading.classList.remove('hidden');
  elements.weatherContent.classList.add('hidden');
  elements.errorMessage.classList.add('hidden');
}

// Hide loading state
export function hideLoading() {
  elements.loading.classList.add('hidden');
}

// Show weather content
export function showWeatherContent() {
  elements.weatherContent.classList.remove('hidden');
  elements.errorMessage.classList.add('hidden');
}

// Show error message
export function showError(message) {
  elements.errorMessage.classList.remove('hidden');
  elements.weatherContent.classList.add('hidden');
  elements.errorText.textContent = message;
}

// Hide error message
export function hideError() {
  elements.errorMessage.classList.add('hidden');
}

// Display search results
export function displaySearchResults(results) {
  if (!results || results.length === 0) {
    elements.searchResults.classList.add('hidden');
    return;
  }

  const html = results.map(city => `
    <div class="search-result p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0" 
         data-lat="${city.latitude}" 
         data-lon="${city.longitude}"
         data-name="${city.name}"
         data-country="${city.country || ''}"
         data-admin1="${city.admin1 || ''}">
      <div class="font-medium text-gray-900">${city.name}</div>
      <div class="text-sm text-gray-600">
        ${[city.admin1, city.country].filter(Boolean).join(', ')}
      </div>
    </div>
  `).join('');

  elements.searchResults.innerHTML = html;
  elements.searchResults.classList.remove('hidden');
}

// Hide search results
export function hideSearchResults() {
  elements.searchResults.classList.add('hidden');
}

// Update current weather display
export function updateCurrentWeather(weatherData, locationData) {
  if (!weatherData || !weatherData.current) return;

  const current = weatherData.current;
  
  // Location and time
  elements.currentLocation.textContent = `${locationData.name}${locationData.country ? `, ${locationData.country}` : ''}`;
  
  // Weather icon and temperature
  //const icon = getWeatherIcon(current.temperature, 0);
  elements.currentIcon.textContent = icon;
  elements.currentTemp.textContent = appState.formatTemperature(current.temperature);
  
  // Weather condition (simplified based on temperature)
  let condition = 'Clear';
  if (current.temperature < 0) condition = 'Freezing';
  else if (current.temperature < 10) condition = 'Cold';
  else if (current.temperature > 30) condition = 'Hot';
  else if (current.temperature > 20) condition = 'Warm';
  
  elements.currentCondition.textContent = condition;
  
  // Weather details
  elements.feelsLike.textContent = appState.formatTemperature(current.temperature + 2); // Approximate feels like
  elements.humidity.textContent = current.humidity ? `${Math.round(current.humidity)}%` : '--%';
  elements.windSpeed.textContent = appState.formatWindSpeed(current.windSpeed);
  elements.pressure.textContent = current.pressure ? `${Math.round(current.pressure)} hPa` : '-- hPa';
  elements.visibility.textContent = current.visibility ? `${Math.round(current.visibility / 1000)} km` : '-- km';
  
  // UV Index (from daily data if available)
  const uvIndex = weatherData.daily?.[0]?.uvIndex;
  elements.uvIndex.textContent = uvIndex ? Math.round(uvIndex) : '--';

  // Moon Phase
  const moon = getMoonPhase(new Date(weatherData.current.time));
  elements.moonPhase.textContent = `${moon.emoji} ${moon.name}`;
  elements.moonPhase.title = `Moon Phase: ${moon.name}`;
  
  // Update favorite button state
  updateFavoriteButton(locationData);
}

// Update daily forecast display
export function updateDailyForecast(dailyData) {
  if (!dailyData || dailyData.length === 0) return;

  const html = dailyData.map((day, index) => {
    const date = new Date(day.date);
    const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' });
    //const icon = getWeatherIcon((day.tempMax + day.tempMin) / 2, day.precipitationProbability);
    
    return `
      <div class="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
        <div class="font-medium text-gray-900 mb-2">${dayName}</div>
        <div class="text-3xl mb-2 weather-icon">${icon}</div>
        <div class="space-y-1">
          <div class="font-semibold">${appState.formatTemperature(day.tempMax)}</div>
          <div class="text-gray-600 text-sm">${appState.formatTemperature(day.tempMin)}</div>
          <div class="text-blue-600 text-xs">${Math.round(day.precipitationProbability || 0)}%</div>
        </div>
      </div>
    `;
  }).join('');

  elements.dailyForecast.innerHTML = html;

  // === NEW: Make daily forecast clickable to update charts ===
  Array.from(elements.dailyForecast.children).forEach((dayEl, index) => {
    dayEl.addEventListener('click', () => {
      console.log(`Day clicked: index ${index}`, appState.getCurrentWeather()?.daily[index]);
      
      const weather = appState.getCurrentWeather();
      import('./charts.js').then(({ updateCharts }) => {
        updateCharts(weather, index);
      });
    });
  });
}

// Update air quality display
export function updateAirQuality(airQualityData) {
  if (!airQualityData) {
    elements.airQuality.innerHTML = '<div class="col-span-3 text-center text-gray-500">Air quality data unavailable</div>';
    return;
  }

  const aqiInfo = getAQIDescription(airQualityData.usAqi || 0);
  
  const html = `
    <div class="text-center p-4 rounded-lg ${aqiInfo.bg}">
      <div class="font-medium text-gray-900 mb-2">Air Quality Index</div>
      <div class="text-2xl font-bold ${aqiInfo.color} mb-1">${Math.round(airQualityData.usAqi || 0)}</div>
      <div class="text-sm ${aqiInfo.color}">${aqiInfo.level}</div>
    </div>
    
    <div class="text-center p-4 rounded-lg bg-gray-50">
      <div class="font-medium text-gray-900 mb-2">PM2.5</div>
      <div class="text-2xl font-bold text-gray-700 mb-1">${Math.round(airQualityData.pm2_5 || 0)}</div>
      <div class="text-sm text-gray-600">μg/m³</div>
    </div>
    
    <div class="text-center p-4 rounded-lg bg-gray-50">
      <div class="font-medium text-gray-900 mb-2">PM10</div>
      <div class="text-2xl font-bold text-gray-700 mb-1">${Math.round(airQualityData.pm10 || 0)}</div>
      <div class="text-sm text-gray-600">μg/m³</div>
    </div>
  `;

  elements.airQuality.innerHTML = html;
}

// Update favorite button state
export function updateFavoriteButton(locationData) {
  if (!locationData) return;
  
  const isFav = appState.isFavorite(locationData);
  const svg = elements.favoriteBtn.querySelector('svg');
  
  if (isFav) {
    svg.setAttribute('fill', 'currentColor');
    elements.favoriteBtn.setAttribute('aria-label', 'Remove from favorites');
  } else {
    svg.setAttribute('fill', 'none');
    elements.favoriteBtn.setAttribute('aria-label', 'Add to favorites');
  }
}

// Update favorites display
export function updateFavoritesDisplay() {
  const favorites = appState.getFavorites();
  
  if (favorites.length === 0) {
    elements.favoritesSection.classList.add('hidden');
    return;
  }

  elements.favoritesSection.classList.remove('hidden');
  
  const html = favorites.map(fav => `
    <div class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer favorite-item"
         data-lat="${fav.latitude}"
         data-lon="${fav.longitude}"
         data-name="${fav.name}"
         data-country="${fav.country}">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-medium text-gray-900">${fav.name}</div>
          <div class="text-sm text-gray-600">${fav.country}</div>
        </div>
        <button class="remove-favorite p-1 hover:bg-red-50 rounded" 
                data-id="${fav.id}"
                aria-label="Remove ${fav.name} from favorites">
          <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  elements.favoritesList.innerHTML = html;
}

// Update current time
function updateCurrentTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
  const dateString = now.toLocaleDateString('en', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  if (elements.currentTime) {
    elements.currentTime.textContent = `${dateString} • ${timeString}`;
  }
}

// Event handlers
function handleLocationChange(location) {
  if (location) {
    updateFavoriteButton(location);
  }
}

function handleWeatherChange(weather) {
  if (weather) {
    const location = appState.getCurrentLocation();
    if (location) {
      updateCurrentWeather(weather, location);
      updateDailyForecast(weather.daily);
    }
  }
}

function handleFavoritesChange() {
  updateFavoritesDisplay();
  const location = appState.getCurrentLocation();
  if (location) {
    updateFavoriteButton(location);
  }
}

function handleLoadingChange(isLoading) {
  if (isLoading) {
    showLoading();
  } else {
    hideLoading();
  }
}

function handleErrorChange(error) {
  if (error) {
    showError(error.message || 'An error occurred');
  } else {
    hideError();
  }
}

function handleSettingsChange({ key, value }) {
  if (key === 'temperatureUnit') {
    // Re-render temperature displays
    const weather = appState.getCurrentWeather();
    const location = appState.getCurrentLocation();
    if (weather && location) {
      updateCurrentWeather(weather, location);
      updateDailyForecast(weather.daily);
    }
  }
}

// Animation utilities
export function fadeIn(element, duration = 300) {
  element.style.opacity = '0';
  element.style.display = 'block';
  element.classList.add('fade-in-up');
  
  setTimeout(() => {
    element.style.opacity = '1';
  }, 50);
  
  setTimeout(() => {
    element.classList.remove('fade-in-up');
  }, duration);
}

export function fadeOut(element, duration = 300) {
  element.style.opacity = '0';
  
  setTimeout(() => {
    element.style.display = 'none';
    element.style.opacity = '1';
  }, duration);
}

// Toast notifications
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white max-w-sm transform transition-transform duration-300 translate-x-full`;
  
  // Set color based on type
  switch (type) {
    case 'success':
      toast.className += ' bg-green-600';
      break;
    case 'error':
      toast.className += ' bg-red-600';
      break;
    case 'warning':
      toast.className += ' bg-yellow-600';
      break;
    default:
      toast.className += ' bg-blue-600';
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, duration);
}

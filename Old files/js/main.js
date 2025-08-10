// Main application logic
import { appState } from './state.js';
import { initializeUI, showWeatherContent, displaySearchResults, hideSearchResults, updateAirQuality, showToast } from './ui.js';
import { initializeCharts, updateCharts } from './charts.js';
import { searchCities, getWeatherForecast, getAirQuality, getCurrentPosition } from './api.js';

// Initialize dayjs plugins
dayjs.extend(dayjs_plugin_relativeTime);

// Application class
class WeatherApp {
  constructor() {
    this.searchTimeout = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      // Initialize UI and charts
      initializeUI();
      initializeCharts();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Register service worker
      this.registerServiceWorker();
      
      // Load saved location or get user's location
      await this.loadInitialLocation();
      
      this.isInitialized = true;
      console.log('WeatherFlow app initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      appState.setError(new Error('Failed to initialize the application'));
    }
  }

  setupEventListeners() {
    // Search functionality
    const citySearch = document.getElementById('city-search');
    const searchResults = document.getElementById('search-results');
    const locateBtn = document.getElementById('locate-btn');

    // City search with debouncing
    citySearch.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      clearTimeout(this.searchTimeout);
      
      if (query.length < 2) {
        hideSearchResults();
        return;
      }
      
      this.searchTimeout = setTimeout(async () => {
        try {
          const results = await searchCities(query);
          displaySearchResults(results);
        } catch (error) {
          console.error('Search error:', error);
          hideSearchResults();
        }
      }, 300);
    });

    // Handle search result selection
    searchResults.addEventListener('click', (e) => {
      const result = e.target.closest('.search-result');
      if (result) {
        const location = {
          name: result.dataset.name,
          country: result.dataset.country,
          latitude: parseFloat(result.dataset.lat),
          longitude: parseFloat(result.dataset.lon)
        };
        
        this.loadWeatherForLocation(location);
        citySearch.value = location.name;
        hideSearchResults();
      }
    });

    // Use current location button
    locateBtn.addEventListener('click', () => {
      this.getCurrentLocation();
    });

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#city-search') && !e.target.closest('#search-results')) {
        hideSearchResults();
      }
    });

    // Favorites functionality
    const favoriteBtn = document.getElementById('favorite-btn');
    favoriteBtn.addEventListener('click', () => {
      this.toggleFavorite();
    });

    // Favorites list
    const favoritesList = document.getElementById('favorites-list');
    favoritesList.addEventListener('click', (e) => {
      const favoriteItem = e.target.closest('.favorite-item');
      const removeBtn = e.target.closest('.remove-favorite');
      
      if (removeBtn) {
        e.stopPropagation();
        const favoriteId = removeBtn.dataset.id;
        appState.removeFavorite(favoriteId);
        showToast('Location removed from favorites', 'success');
      } else if (favoriteItem) {
        const location = {
          name: favoriteItem.dataset.name,
          country: favoriteItem.dataset.country,
          latitude: parseFloat(favoriteItem.dataset.lat),
          longitude: parseFloat(favoriteItem.dataset.lon)
        };
        this.loadWeatherForLocation(location);
      }
    });

    // Settings
    const themeToggle = document.getElementById('theme-toggle');
    const unitsToggle = document.getElementById('units-toggle');

    themeToggle.addEventListener('click', () => {
      this.toggleTheme();
    });

    unitsToggle.addEventListener('click', () => {
      this.toggleUnits();
    });

    // Error retry
    const retryBtn = document.getElementById('retry-btn');
    retryBtn.addEventListener('click', () => {
      appState.clearError();
      const location = appState.getCurrentLocation();
      if (location) {
        this.loadWeatherForLocation(location);
      } else {
        this.loadInitialLocation();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Focus search on '/' key
      if (e.key === '/' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        citySearch.focus();
      }
      
      // Clear search on Escape
      if (e.key === 'Escape') {
        citySearch.blur();
        hideSearchResults();
      }
    });

    // Handle visibility changes for background updates
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && appState.getSetting('backgroundUpdates', true)) {
        this.refreshWeatherData();
      }
    });

    // Auto-refresh every 10 minutes
    setInterval(() => {
      if (appState.getSetting('backgroundUpdates', true)) {
        this.refreshWeatherData();
      }
    }, 10 * 60 * 1000);
  }

  async loadInitialLocation() {
    // Try to load saved location first
    const savedLocation = appState.loadCurrentLocation();
    if (savedLocation) {
      await this.loadWeatherForLocation(savedLocation);
      return;
    }

    // If no saved location, try to get current position
    try {
      await this.getCurrentLocation();
    } catch (error) {
      // If geolocation fails, show default location (London)
      const defaultLocation = {
        name: 'London',
        country: 'United Kingdom',
        latitude: 51.5074,
        longitude: -0.1278
      };
      await this.loadWeatherForLocation(defaultLocation);
    }
  }

  async getCurrentLocation() {
    try {
      appState.setLoading(true);
      const position = await getCurrentPosition();
      
      // Reverse geocode to get location name
      const results = await searchCities(`${position.latitude},${position.longitude}`);
      const locationName = results[0]?.name || 'Current Location';
      const country = results[0]?.country || '';
      
      const location = {
        name: locationName,
        country: country,
        latitude: position.latitude,
        longitude: position.longitude
      };
      
      await this.loadWeatherForLocation(location);
      showToast('Location updated successfully', 'success');
    } catch (error) {
      console.error('Geolocation error:', error);
      appState.setError(error);
      showToast('Unable to get your location', 'error');
    } finally {
      appState.setLoading(false);
    }
  }

  async loadWeatherForLocation(location) {
    try {
      appState.setLoading(true);
      appState.clearError();
      appState.setCurrentLocation(location);

      // Fetch weather data
      const weatherData = await getWeatherForecast(location.latitude, location.longitude);
      appState.setCurrentWeather(weatherData);

      // Fetch air quality data (optional)
      try {
        const airQualityData = await getAirQuality(location.latitude, location.longitude);
        updateAirQuality(airQualityData);
      } catch (error) {
        console.warn('Air quality data unavailable:', error);
        updateAirQuality(null);
      }

      // Update charts
      updateCharts(weatherData);
      
      // Show weather content
      showWeatherContent();
      
    } catch (error) {
      console.error('Weather loading error:', error);
      appState.setError(error);
    } finally {
      appState.setLoading(false);
    }
  }

  async refreshWeatherData() {
    const location = appState.getCurrentLocation();
    if (!location) return;

    try {
      // Silent refresh - don't show loading state
      const weatherData = await getWeatherForecast(location.latitude, location.longitude);
      appState.setCurrentWeather(weatherData);
      updateCharts(weatherData);

      // Update air quality
      try {
        const airQualityData = await getAirQuality(location.latitude, location.longitude);
        updateAirQuality(airQualityData);
      } catch (error) {
        console.warn('Air quality refresh failed:', error);
      }
    } catch (error) {
      console.warn('Weather refresh failed:', error);
    }
  }

  toggleFavorite() {
    const location = appState.getCurrentLocation();
    if (!location) return;

    if (appState.isFavorite(location)) {
      // Find and remove the favorite
      const favorites = appState.getFavorites();
      const favorite = favorites.find(fav => 
        Math.abs(fav.latitude - location.latitude) < 0.01 && 
        Math.abs(fav.longitude - location.longitude) < 0.01
      );
      if (favorite) {
        appState.removeFavorite(favorite.id);
        showToast('Removed from favorites', 'success');
      }
    } else {
      const added = appState.addFavorite(location);
      if (added) {
        showToast('Added to favorites', 'success');
      }
    }
  }

  toggleTheme() {
    const currentTheme = appState.getSetting('theme', 'auto');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    appState.updateSetting('theme', newTheme);
    this.applyTheme(newTheme);
  }

  applyTheme(theme) {
    const body = document.body;
    
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else if (theme === 'light') {
      body.classList.remove('dark-mode');
    } else {
      // Auto theme - use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        body.classList.add('dark-mode');
      } else {
        body.classList.remove('dark-mode');
      }
    }
  }

  toggleUnits() {
    const currentUnit = appState.getSetting('temperatureUnit', 'celsius');
    const newUnit = currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
    appState.updateSetting('temperatureUnit', newUnit);
    
    // Update button text
    const unitsToggle = document.getElementById('units-toggle');
    unitsToggle.textContent = newUnit === 'celsius' ? '°C' : '°F';
    
    showToast(`Temperature unit changed to ${newUnit === 'celsius' ? 'Celsius' : 'Fahrenheit'}`, 'success');
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }
}

// Initialize the app
const app = new WeatherApp();

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Handle window resize for responsive charts
window.addEventListener('resize', () => {
  // Import and call resize function
  import('./charts.js').then(({ resizeCharts }) => {
    resizeCharts();
  });
});

// Handle online/offline status
window.addEventListener('online', () => {
  showToast('Connection restored', 'success');
  app.refreshWeatherData();
});

window.addEventListener('offline', () => {
  showToast('You are offline. Some features may be limited.', 'warning', 5000);
});

// Export app instance for debugging
window.WeatherApp = app;
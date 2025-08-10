// Main application entry point
import { searchCities, getWeatherData, getAirQualityData, getCurrentPosition, reverseGeocode } from './api.js';
import { appState } from './state.js';
import { 
    showLoading, 
    hideLoading, 
    showError, 
    showSuccess,
    renderSearchSuggestions, 
    hideSearchSuggestions,
    renderCurrentWeather,
    renderAirQuality,
    renderAstronomy,
    renderWeatherDetails,
    renderWeeklyForecast,
    updateSettingsUI,
    toggleSettings,
    toggleFavorites,
    getDOMElements
} from './ui.js';
import { updateHourlyChart, updateChartTheme, resizeCharts } from './charts.js';
import { debounce, throttle, isMobile, checkLocationPermission } from './utils.js';

// Application state
let searchTimeout = null;
let refreshInterval = null;

// Initialize application
async function initApp() {
    console.log('Initializing Meteora app...');
    
    try {
        // Initialize DOM elements
        initializeDOMElements();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize settings
        initializeSettings();
        
        // Show loading
        showLoading();
        
        // Try to load saved location or get current location
        await initializeLocation();
        
        // Setup auto-refresh if enabled
        setupAutoRefresh();
        
        // Initialize service worker for PWA
        await initializeServiceWorker();
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to initialize app. Please refresh the page.');
    } finally {
        hideLoading();
    }
}

// Setup event listeners
function setupEventListeners() {
    const elements = getDOMElements();
    
    // Search functionality
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', debounce(handleSearchInput, 300));
        elements.searchInput.addEventListener('focus', handleSearchFocus);
        elements.searchInput.addEventListener('blur', handleSearchBlur);
        elements.searchInput.addEventListener('keydown', handleSearchKeydown);
    }
    
    // Location button
    if (elements.locationBtn) {
        elements.locationBtn.addEventListener('click', handleLocationClick);
    }
    
    // Theme toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', handleThemeToggle);
    }
    
    // Settings
    if (elements.settingsBtn) {
        elements.settingsBtn.addEventListener('click', () => toggleSettings(true));
    }
    
    if (elements.closeSettings) {
        elements.closeSettings.addEventListener('click', () => toggleSettings(false));
    }
    
    // Settings modal background click
    if (elements.settingsModal) {
        elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === elements.settingsModal) {
                toggleSettings(false);
            }
        });
    }
    
    // Settings inputs
    if (elements.tempUnit) {
        elements.tempUnit.addEventListener('change', (e) => {
            appState.updateSettings({ temperatureUnit: e.target.value });
            refreshCurrentWeatherDisplay();
        });
    }
    
    if (elements.windUnit) {
        elements.windUnit.addEventListener('change', (e) => {
            appState.updateSettings({ windSpeedUnit: e.target.value });
            refreshCurrentWeatherDisplay();
        });
    }
    
    if (elements.timeFormat) {
        elements.timeFormat.addEventListener('change', (e) => {
            appState.updateSettings({ timeFormat: e.target.value });
            refreshCurrentWeatherDisplay();
        });
    }
    
    if (elements.autoRefresh) {
        elements.autoRefresh.addEventListener('change', (e) => {
            appState.updateSettings({ autoRefresh: e.target.checked });
            setupAutoRefresh();
        });
    }
    
    // Search suggestions click handling
    document.addEventListener('click', handleDocumentClick);
    
    // Window resize handling
    window.addEventListener('resize', throttle(handleWindowResize, 250));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Online/offline handling
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Visibility change handling for refresh
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

// Handle search input
async function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        hideSearchSuggestions();
        return;
    }
    
    try {
        const cities = await searchCities(query);
        renderSearchSuggestions(cities);
    } catch (error) {
        console.error('Search failed:', error);
        hideSearchSuggestions();
    }
}

// Handle search focus
function handleSearchFocus() {
    const elements = getDOMElements();
    const query = elements.searchInput?.value.trim();
    
    if (query && query.length >= 2) {
        searchCities(query).then(cities => {
            renderSearchSuggestions(cities);
        }).catch(() => {
            // Ignore errors on focus
        });
    }
}

// Handle search blur (with delay to allow suggestion clicks)
function handleSearchBlur() {
    setTimeout(() => {
        hideSearchSuggestions();
    }, 150);
}

// Handle search keydown
function handleSearchKeydown(e) {
    const elements = getDOMElements();
    
    if (e.key === 'Escape') {
        hideSearchSuggestions();
        elements.searchInput?.blur();
    }
    
    if (e.key === 'Enter') {
        e.preventDefault();
        const suggestions = elements.searchSuggestions?.querySelectorAll('.suggestion-item');
        if (suggestions && suggestions.length > 0) {
            suggestions[0].click();
        }
    }
}

// Handle location button click
async function handleLocationClick() {
    try {
        showLoading();
        
        const permission = await checkLocationPermission();
        if (permission === 'denied') {
            showError('Location access denied. Please enable location permissions and try again.');
            return;
        }
        
        const position = await getCurrentPosition();
        const locationData = await reverseGeocode(position.latitude, position.longitude);
        
        const location = locationData || {
            name: 'Current Location',
            latitude: position.latitude,
            longitude: position.longitude,
            country: '',
            admin1: ''
        };
        
        await loadWeatherData(location);
        showSuccess('Location updated successfully');
        
    } catch (error) {
        console.error('Location error:', error);
        showError(error.message || 'Failed to get location');
    } finally {
        hideLoading();
    }
}

// Handle theme toggle
function handleThemeToggle() {
    const currentTheme = appState.get().settings.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    appState.updateSettings({ theme: newTheme });
    updateChartTheme(newTheme === 'dark');
    
    showSuccess(`Switched to ${newTheme} theme`);
}

// Handle document clicks for suggestion selection
function handleDocumentClick(e) {
    const elements = getDOMElements();
    
    // Handle suggestion item clicks
    if (e.target.closest('.suggestion-item')) {
        const item = e.target.closest('.suggestion-item');
        const location = {
            name: item.dataset.name,
            country: item.dataset.country,
            admin1: item.dataset.admin1,
            latitude: parseFloat(item.dataset.lat),
            longitude: parseFloat(item.dataset.lng)
        };
        
        loadWeatherData(location);
        hideSearchSuggestions();
        elements.searchInput.value = location.name;
        elements.searchInput.blur();
    }
    
    // Handle favorite item clicks
    if (e.target.closest('.favorite-item') && !e.target.closest('.remove-favorite')) {
        const item = e.target.closest('.favorite-item');
        const location = {
            name: item.dataset.name,
            country: item.dataset.country,
            admin1: item.dataset.admin1,
            latitude: parseFloat(item.dataset.lat),
            longitude: parseFloat(item.dataset.lng)
        };
        
        loadWeatherData(location);
        toggleFavorites(false);
        elements.searchInput.value = location.name;
    }
    
    // Handle remove favorite clicks
    if (e.target.closest('.remove-favorite')) {
        e.stopPropagation();
        const button = e.target.closest('.remove-favorite');
        const locationId = button.dataset.id;
        
        appState.removeFromFavorites(locationId);
        showSuccess('Removed from favorites');
    }
    
    // Hide search suggestions when clicking outside
    if (!e.target.closest('.search-container')) {
        hideSearchSuggestions();
    }
}

// Handle window resize
function handleWindowResize() {
    resizeCharts();
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
    const elements = getDOMElements();
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        elements.searchInput?.focus();
    }
    
    // Ctrl/Cmd + , to open settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        toggleSettings(true);
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        toggleSettings(false);
        toggleFavorites(false);
    }
    
    // Ctrl/Cmd + D to toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleThemeToggle();
    }
}

// Handle online status
function handleOnline() {
    console.log('App is online');
    const state = appState.get();
    
    // Refresh data if it's stale and we have a location
    if (state.currentLocation && state.lastUpdated) {
        const lastUpdate = new Date(state.lastUpdated);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        if (lastUpdate < fiveMinutesAgo) {
            refreshWeatherData();
        }
    }
}

// Handle offline status
function handleOffline() {
    console.log('App is offline');
    showError('App is offline. Some features may not work.');
}

// Handle visibility change
function handleVisibilityChange() {
    const state = appState.get();
    
    if (!document.hidden && state.settings.autoRefresh && state.currentLocation) {
        // Check if data is stale when app becomes visible
        if (state.lastUpdated) {
            const lastUpdate = new Date(state.lastUpdated);
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            
            if (lastUpdate < tenMinutesAgo) {
                refreshWeatherData();
            }
        }
    }
}

// Initialize settings
function initializeSettings() {
    const state = appState.get();
    
    // Apply initial theme
    appState.applyTheme(state.settings.theme);
    
    // Update settings UI
    updateSettingsUI();
    
    // Subscribe to state changes
    appState.subscribe((newState, changes) => {
        if (changes.settings) {
            updateSettingsUI();
        }
    });
}

// Initialize location
async function initializeLocation() {
    const state = appState.get();
    
    // Try saved location first
    if (state.currentLocation) {
        try {
            await loadWeatherData(state.currentLocation);
            return;
        } catch (error) {
            console.warn('Failed to load weather for saved location:', error);
        }
    }
    
    // Try to get current location
    try {
        const permission = await checkLocationPermission();
        
        // If already granted, fetch location directly
        if (permission === 'granted') {
            const position = await getCurrentPosition();
            const locationData = await reverseGeocode(position.latitude, position.longitude);
            
            const location = locationData || {
                name: 'Current Location',
                latitude: position.latitude,
                longitude: position.longitude,
                country: '',
                admin1: ''
            };
            
            await loadWeatherData(location);

        } else {
            // Instead of falling back to New York, show prompt/error
            showError('Please allow location access or search for your city.');
            // Optionally: focus the search box
            const elements = getDOMElements();
            elements.searchInput?.focus();
        }
    } catch (error) {
        console.error('Failed to get initial location:', error);
        showError('Unable to get location. Please search for a city.');
    }
}


// Load weather data for a location
async function loadWeatherData(location) {
    try {
        appState.setLoading(true);
        
        // Load weather data
        const [weatherData, airQualityData] = await Promise.allSettled([
            getWeatherData(location.latitude, location.longitude),
            getAirQualityData(location.latitude, location.longitude)
        ]);
        
        const weather = weatherData.status === 'fulfilled' ? weatherData.value : null;
        const airQuality = airQualityData.status === 'fulfilled' ? airQualityData.value : null;
        
        if (!weather) {
            throw new Error('Failed to load weather data');
        }
        
        // Update app state
        appState.setCurrentWeather(location, weather, airQuality);
        
        // Update UI
        renderCurrentWeather(location, weather);
        renderWeeklyForecast(weather);
        renderAstronomy(weather);
        renderWeatherDetails(weather);
        updateHourlyChart(weather);
        
        if (airQuality) {
            renderAirQuality(airQuality);
        }
        
        // Update favorites if this location is favorited
        if (appState.isFavorite(location.latitude, location.longitude)) {
            appState.updateFavoriteWeather(`${location.latitude},${location.longitude}`, weather);
        }
        
    } catch (error) {
        console.error('Failed to load weather data:', error);
        appState.setError(error);
        showError(error.message || 'Failed to load weather data');
        throw error;
    } finally {
        appState.setLoading(false);
    }
}

// Refresh current weather data
async function refreshWeatherData() {
    const state = appState.get();
    
    if (!state.currentLocation) {
        return;
    }
    
    try {
        await loadWeatherData(state.currentLocation);
        console.log('Weather data refreshed');
    } catch (error) {
        console.error('Failed to refresh weather data:', error);
        // Don't show error for automatic refresh failures
    }
}

// Refresh current weather display with new units
function refreshCurrentWeatherDisplay() {
    const state = appState.get();
    
    if (state.currentLocation && state.currentWeather) {
        renderCurrentWeather(state.currentLocation, state.currentWeather);
        renderWeeklyForecast(state.currentWeather);
        renderWeatherDetails(state.currentWeather);
        updateHourlyChart(state.currentWeather);
        
        if (state.currentAirQuality) {
            renderAirQuality(state.currentAirQuality);
        }
    }
}

// Setup auto-refresh functionality
function setupAutoRefresh() {
    const state = appState.get();
    
    // Clear existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    
    // Setup new interval if auto-refresh is enabled
    if (state.settings.autoRefresh) {
        const intervalMs = (state.settings.refreshInterval || 10) * 60 * 1000; // Convert minutes to milliseconds
        
        refreshInterval = setInterval(() => {
            if (!document.hidden) { // Only refresh when app is visible
                refreshWeatherData();
            }
        }, intervalMs);
        
        console.log(`Auto-refresh enabled: ${state.settings.refreshInterval} minutes`);
    }
}

// Initialize service worker for PWA
async function initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
            
            // Listen for service worker updates
            registration.addEventListener('updatefound', () => {
                console.log('Service Worker update found');
            });
            
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// Cleanup function for page unload
function cleanup() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showError('Something went wrong. Please refresh the page.');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // Don't show UI error for promise rejections as they're often handled elsewhere
    e.preventDefault();
});

// Export for debugging
window.WeatherApp = {
    appState,
    loadWeatherData,
    refreshWeatherData
};
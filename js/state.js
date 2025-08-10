// Application state management
class AppState {
    constructor() {
        this.data = {
            // Current location and weather
            currentLocation: null,
            currentWeather: null,
            currentAirQuality: null,
            
            // User preferences
            settings: {
                temperatureUnit: 'celsius', // celsius or fahrenheit
                windSpeedUnit: 'kmh', // kmh, mph, ms
                timeFormat: '24', // 24 or 12
                theme: 'light', // light or dark
                autoRefresh: true,
                refreshInterval: 10 // minutes
            },
            
            // Favorites
            favorites: [],
            
            // UI state
            isLoading: false,
            lastUpdated: null,
            error: null
        };
        
        this.listeners = [];
        this.loadFromStorage();
        this.detectSystemTheme();
    }
    
    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }
    
    // Notify all listeners of state changes
    notify(changes = {}) {
        this.listeners.forEach(listener => {
            try {
                listener(this.data, changes);
            } catch (error) {
                console.error('State listener error:', error);
            }
        });
    }
    
    // Update state
    update(updates, saveToStorage = true) {
        const previousData = { ...this.data };
        
        if (typeof updates === 'function') {
            updates = updates(this.data);
        }
        
        this.data = { ...this.data, ...updates };
        
        if (saveToStorage) {
            this.saveToStorage();
        }
        
        this.notify(updates);
    }
    
    // Get current state
    get() {
        return { ...this.data };
    }
    
    // Load state from localStorage
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('weatherapp_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // Merge with defaults, preserving structure
                this.data = {
                    ...this.data,
                    settings: { ...this.data.settings, ...(parsed.settings || {}) },
                    favorites: parsed.favorites || [],
                    currentLocation: parsed.currentLocation || null
                };
            }
        } catch (error) {
            console.warn('Failed to load state from storage:', error);
        }
    }
    
    // Save state to localStorage
    saveToStorage() {
        try {
            const toSave = {
                settings: this.data.settings,
                favorites: this.data.favorites,
                currentLocation: this.data.currentLocation
            };
            
            localStorage.setItem('weatherapp_state', JSON.stringify(toSave));
        } catch (error) {
            console.warn('Failed to save state to storage:', error);
        }
    }
    
    // Detect system theme preference
    detectSystemTheme() {
        if (!('theme' in (JSON.parse(localStorage.getItem('weatherapp_state') || '{}').settings || {}))) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.updateSettings({ theme: prefersDark ? 'dark' : 'light' });
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (this.data.settings.theme === 'auto') {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    // Apply theme to document
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = theme === 'dark' ? '#000000' : '#6366F1';
        }
    }
    
    // Update settings
    updateSettings(newSettings) {
        this.update({
            settings: { ...this.data.settings, ...newSettings }
        });
        
        // Apply theme immediately if changed
        if (newSettings.theme) {
            this.applyTheme(newSettings.theme);
        }
    }
    
    // Set current location and weather
    setCurrentWeather(location, weather, airQuality = null) {
        this.update({
            currentLocation: location,
            currentWeather: weather,
            currentAirQuality: airQuality,
            lastUpdated: new Date().toISOString(),
            error: null
        });
    }
    
    // Set loading state
    setLoading(isLoading) {
        this.update({ isLoading }, false); // Don't save loading state
    }
    
    // Set error state
    setError(error) {
        this.update({
            error: error?.message || error,
            isLoading: false
        }, false); // Don't save error state
    }
    
    // Add location to favorites
    addToFavorites(location, weather = null) {
        const existing = this.data.favorites.find(fav => 
            fav.latitude === location.latitude && fav.longitude === location.longitude
        );
        
        if (!existing) {
            const favorite = {
                id: `${location.latitude},${location.longitude}`,
                name: location.name,
                country: location.country,
                admin1: location.admin1,
                latitude: location.latitude,
                longitude: location.longitude,
                addedAt: new Date().toISOString(),
                lastWeather: weather ? {
                    temperature: weather.current?.temperature_2m,
                    weatherCode: weather.current?.weather_code,
                    updatedAt: new Date().toISOString()
                } : null
            };
            
            this.update({
                favorites: [...this.data.favorites, favorite]
            });
            
            return true;
        }
        
        return false;
    }
    
    // Remove location from favorites
    removeFromFavorites(locationId) {
        this.update({
            favorites: this.data.favorites.filter(fav => fav.id !== locationId)
        });
    }
    
    // Check if location is in favorites
    isFavorite(latitude, longitude) {
        return this.data.favorites.some(fav => 
            fav.latitude === latitude && fav.longitude === longitude
        );
    }
    
    // Update favorite weather data
    updateFavoriteWeather(locationId, weather) {
        const favorites = this.data.favorites.map(fav => {
            if (fav.id === locationId) {
                return {
                    ...fav,
                    lastWeather: {
                        temperature: weather.current?.temperature_2m,
                        weatherCode: weather.current?.weather_code,
                        updatedAt: new Date().toISOString()
                    }
                };
            }
            return fav;
        });
        
        this.update({ favorites });
    }
    
    // Get formatted temperature based on unit preference
    formatTemperature(celsius) {
        if (celsius === null || celsius === undefined) return '--';
        
        if (this.data.settings.temperatureUnit === 'fahrenheit') {
            const fahrenheit = (celsius * 9/5) + 32;
            return `${Math.round(fahrenheit)}°F`;
        }
        
        return `${Math.round(celsius)}°C`;
    }
    
    // Get formatted wind speed based on unit preference
    formatWindSpeed(kmh) {
        if (kmh === null || kmh === undefined) return '--';
        
        switch (this.data.settings.windSpeedUnit) {
            case 'mph':
                return `${Math.round(kmh * 0.621371)} mph`;
            case 'ms':
                return `${Math.round(kmh * 0.277778)} m/s`;
            default:
                return `${Math.round(kmh)} km/h`;
        }
    }
    
    // Get formatted time based on format preference
    formatTime(time) {
        if (!time) return '--';
        
        const date = new Date(time);
        const format = this.data.settings.timeFormat === '12' ? 'h:mm A' : 'HH:mm';
        
        return dayjs(date).format(format);
    }
    
    // Clear all data (for reset functionality)
    reset() {
        const defaultSettings = {
            temperatureUnit: 'celsius',
            windSpeedUnit: 'kmh',
            timeFormat: '24',
            theme: 'light',
            autoRefresh: true,
            refreshInterval: 10
        };
        
        this.update({
            currentLocation: null,
            currentWeather: null,
            currentAirQuality: null,
            settings: defaultSettings,
            favorites: [],
            isLoading: false,
            lastUpdated: null,
            error: null
        });
        
        localStorage.removeItem('weatherapp_state');
    }
}

// Create and export singleton instance
export const appState = new AppState();
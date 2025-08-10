// Application state management
export class AppState {
  constructor() {
    this.currentLocation = null;
    this.currentWeather = null;
    this.favorites = this.loadFavorites();
    this.settings = this.loadSettings();
    this.isLoading = false;
    this.error = null;
    
    // Event listeners for state changes
    this.listeners = {
      locationChange: [],
      weatherChange: [],
      favoritesChange: [],
      settingsChange: [],
      loadingChange: [],
      errorChange: []
    };
  }

  // Event system
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Location management
  setCurrentLocation(location) {
    this.currentLocation = location;
    this.emit('locationChange', location);
    this.saveCurrentLocation(location);
  }

  getCurrentLocation() {
    return this.currentLocation;
  }

  saveCurrentLocation(location) {
    try {
      localStorage.setItem('weatherflow_current_location', JSON.stringify(location));
    } catch (error) {
      console.error('Failed to save current location:', error);
    }
  }

  loadCurrentLocation() {
    try {
      const saved = localStorage.getItem('weatherflow_current_location');
      if (saved) {
        this.currentLocation = JSON.parse(saved);
        return this.currentLocation;
      }
    } catch (error) {
      console.error('Failed to load current location:', error);
    }
    return null;
  }

  // Weather data management
  setCurrentWeather(weather) {
    this.currentWeather = weather;
    this.emit('weatherChange', weather);
  }

  getCurrentWeather() {
    return this.currentWeather;
  }

  // Favorites management
  addFavorite(location) {
    const exists = this.favorites.find(fav => 
      Math.abs(fav.latitude - location.latitude) < 0.01 && 
      Math.abs(fav.longitude - location.longitude) < 0.01
    );
    
    if (!exists) {
      const favorite = {
        id: Date.now().toString(),
        name: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        addedAt: new Date().toISOString()
      };
      
      this.favorites.push(favorite);
      this.saveFavorites();
      this.emit('favoritesChange', this.favorites);
      return true;
    }
    return false;
  }

  removeFavorite(locationId) {
    const index = this.favorites.findIndex(fav => fav.id === locationId);
    if (index !== -1) {
      this.favorites.splice(index, 1);
      this.saveFavorites();
      this.emit('favoritesChange', this.favorites);
      return true;
    }
    return false;
  }

  getFavorites() {
    return this.favorites;
  }

  isFavorite(location) {
    return this.favorites.some(fav => 
      Math.abs(fav.latitude - location.latitude) < 0.01 && 
      Math.abs(fav.longitude - location.longitude) < 0.01
    );
  }

  saveFavorites() {
    try {
      localStorage.setItem('weatherflow_favorites', JSON.stringify(this.favorites));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }

  loadFavorites() {
    try {
      const saved = localStorage.getItem('weatherflow_favorites');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
    return [];
  }

  // Settings management
  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    this.emit('settingsChange', { key, value, settings: this.settings });
  }

  getSetting(key, defaultValue = null) {
    return this.settings[key] ?? defaultValue;
  }

  getSettings() {
    return { ...this.settings };
  }

  saveSettings() {
    try {
      localStorage.setItem('weatherflow_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('weatherflow_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    
    // Default settings
    return {
      temperatureUnit: 'celsius',
      theme: 'auto',
      notifications: false,
      backgroundUpdates: true
    };
  }

  // Loading state management
  setLoading(isLoading) {
    this.isLoading = isLoading;
    this.emit('loadingChange', isLoading);
  }

  getLoading() {
    return this.isLoading;
  }

  // Error management
  setError(error) {
    this.error = error;
    this.emit('errorChange', error);
  }

  clearError() {
    this.error = null;
    this.emit('errorChange', null);
  }

  getError() {
    return this.error;
  }

  // Temperature unit conversion
  convertTemperature(temp, fromUnit = 'celsius', toUnit = null) {
    if (toUnit === null) {
      toUnit = this.getSetting('temperatureUnit', 'celsius');
    }
    
    if (fromUnit === toUnit) return temp;
    
    if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
      return (temp * 9/5) + 32;
    }
    
    if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
      return (temp - 32) * 5/9;
    }
    
    return temp;
  }

  formatTemperature(temp, showUnit = true) {
    if (temp === null || temp === undefined) return '--°';
    
    const unit = this.getSetting('temperatureUnit', 'celsius');
    const convertedTemp = this.convertTemperature(temp, 'celsius', unit);
    const rounded = Math.round(convertedTemp);
    
    if (showUnit) {
      return `${rounded}°${unit === 'celsius' ? 'C' : 'F'}`;
    }
    
    return `${rounded}°`;
  }

  // Wind speed conversion
  convertWindSpeed(speed, fromUnit = 'kmh', toUnit = 'kmh') {
    if (fromUnit === toUnit) return speed;
    
    // Convert from km/h to other units
    if (fromUnit === 'kmh') {
      switch (toUnit) {
        case 'mph': return speed * 0.621371;
        case 'ms': return speed / 3.6;
        case 'kn': return speed * 0.539957;
        default: return speed;
      }
    }
    
    return speed;
  }

  formatWindSpeed(speed) {
    if (speed === null || speed === undefined) return '-- km/h';
    return `${Math.round(speed)} km/h`;
  }

  // Data persistence
  clearAllData() {
    try {
      localStorage.removeItem('weatherflow_favorites');
      localStorage.removeItem('weatherflow_settings');
      localStorage.removeItem('weatherflow_current_location');
      
      this.favorites = [];
      this.settings = this.loadSettings(); // Reload defaults
      this.currentLocation = null;
      this.currentWeather = null;
      
      this.emit('favoritesChange', this.favorites);
      this.emit('settingsChange', { settings: this.settings });
      this.emit('locationChange', null);
      this.emit('weatherChange', null);
      
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }

  // Export/Import data (for future use)
  exportData() {
    return {
      favorites: this.favorites,
      settings: this.settings,
      currentLocation: this.currentLocation,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
  }

  importData(data) {
    try {
      if (data.version && data.favorites && data.settings) {
        this.favorites = data.favorites;
        this.settings = { ...this.loadSettings(), ...data.settings };
        
        if (data.currentLocation) {
          this.currentLocation = data.currentLocation;
        }
        
        this.saveFavorites();
        this.saveSettings();
        
        if (data.currentLocation) {
          this.saveCurrentLocation(data.currentLocation);
        }
        
        // Emit change events
        this.emit('favoritesChange', this.favorites);
        this.emit('settingsChange', { settings: this.settings });
        this.emit('locationChange', this.currentLocation);
        
        return true;
      }
    } catch (error) {
      console.error('Failed to import data:', error);
    }
    
    return false;
  }
}

// Export singleton instance
export const appState = new AppState();
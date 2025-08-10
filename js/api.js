// API configuration and endpoints
const API_CONFIG = {
    weather: 'https://api.open-meteo.com/v1/forecast',
    geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
    airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    timezone: 'auto'
};

// Request timeout duration
const REQUEST_TIMEOUT = 10000;

// Create a request with timeout
function createRequestWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    return fetch(url, {
        ...options,
        signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
}

// Error handling utility
function handleApiError(error, context) {
    console.error(`API Error in ${context}:`, error);
    
    if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection.');
    }
    
    if (!navigator.onLine) {
        throw new Error('No internet connection. Please check your network.');
    }
    
    throw new Error(`Failed to ${context}. Please try again.`);
}

// Geocoding API - Search for cities
export async function searchCities(query) {
    try {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const url = new URL(API_CONFIG.geocoding);
        url.searchParams.append('name', query.trim());
        url.searchParams.append('count', '8');
        url.searchParams.append('language', 'en');
        url.searchParams.append('format', 'json');

        const response = await createRequestWithTimeout(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        return data.results?.map(result => ({
            id: `${result.latitude},${result.longitude}`,
            name: result.name,
            country: result.country,
            admin1: result.admin1,
            latitude: result.latitude,
            longitude: result.longitude,
            timezone: result.timezone,
            population: result.population || 0
        })) || [];
        
    } catch (error) {
        handleApiError(error, 'search cities');
    }
}


//MOON PHASE
export function getMoonPhase(date = new Date()) {
  // Simple approximation based on known new moon
  const synodicMonth = 29.53058867; // average moon cycle in days
  const knownNewMoon = new Date('2023-01-21T20:53:00Z').getTime();
  const diffDays = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phase = (diffDays % synodicMonth + synodicMonth) % synodicMonth;

  const phases = [
    { emoji: "🌑", name: "New Moon" },
    { emoji: "🌒", name: "Waxing Crescent" },
    { emoji: "🌓", name: "First Quarter" },
    { emoji: "🌔", name: "Waxing Gibbous" },
    { emoji: "🌕", name: "Full Moon" },
    { emoji: "🌖", name: "Waning Gibbous" },
    { emoji: "🌗", name: "Last Quarter" },
    { emoji: "🌘", name: "Waning Crescent" }
  ];
  
  const index = Math.floor((phase / synodicMonth) * 8);
  return phases[index];
}


// Weather API - Get current and forecast data
export async function getWeatherData(latitude, longitude) {
    try {
        const url = new URL(API_CONFIG.weather);
        
        // Set coordinates
        url.searchParams.append('latitude', latitude);
        url.searchParams.append('longitude', longitude);
        url.searchParams.append('timezone', API_CONFIG.timezone);
        
        // Current weather parameters
        url.searchParams.append('current', [
            'temperature_2m',
            'apparent_temperature',
            'relative_humidity_2m',
            'precipitation',
            'weather_code',
            'pressure_msl',
            'wind_speed_10m',
            'wind_direction_10m',
            'uv_index'
        ].join(','));
        
        // Hourly parameters
        url.searchParams.append('hourly', [
            'temperature_2m',
            'apparent_temperature',
            'precipitation_probability',
            'precipitation',
            'weather_code',
            'pressure_msl',
            'wind_speed_10m',
            'wind_direction_10m',
            'uv_index',
            'visibility'
        ].join(','));
        
        // Daily parameters
        url.searchParams.append('daily', [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'apparent_temperature_max',
            'apparent_temperature_min',
            'sunrise',
            'sunset',
            'uv_index_max',
            'precipitation_sum',
            'rain_sum',
            'precipitation_probability_max',
            'wind_speed_10m_max',
            'wind_direction_10m_dominant'
        ].join(','));
        
        const response = await createRequestWithTimeout(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            current: data.current,
            hourly: data.hourly,
            daily: data.daily,
            timezone: data.timezone,
            elevation: data.elevation
        };
        
    } catch (error) {
        handleApiError(error, 'fetch weather data');
    }
}

// Air Quality API - Get air quality data
export async function getAirQualityData(latitude, longitude) {
    try {
        const url = new URL(API_CONFIG.airQuality);
        
        url.searchParams.append('latitude', latitude);
        url.searchParams.append('longitude', longitude);
        url.searchParams.append('timezone', API_CONFIG.timezone);
        
        // Air quality parameters
        url.searchParams.append('current', [
            'us_aqi',
            'pm10',
            'pm2_5',
            'carbon_monoxide',
            'nitrogen_dioxide',
            'sulphur_dioxide',
            'ozone'
        ].join(','));
        
        url.searchParams.append('hourly', [
            'us_aqi',
            'pm10',
            'pm2_5'
        ].join(','));

        const response = await createRequestWithTimeout(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            current: data.current,
            hourly: data.hourly
        };
        
    } catch (error) {
        handleApiError(error, 'fetch air quality data');
    }
}

// Get location data from coordinates
export async function reverseGeocode(latitude, longitude) {
    try {
        const url = new URL(API_CONFIG.geocoding);
        url.searchParams.append('latitude', latitude);
        url.searchParams.append('longitude', longitude);
        url.searchParams.append('count', '1');
        url.searchParams.append('language', 'en');
        url.searchParams.append('format', 'json');

        const response = await createRequestWithTimeout(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            return {
                name: result.name,
                country: result.country,
                admin1: result.admin1,
                latitude: result.latitude,
                longitude: result.longitude
            };
        }
        
        return null;
        
    } catch (error) {
        console.warn('Reverse geocoding failed:', error);
        return null;
    }
}

// Get user's current position
export function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let message;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access denied. Please enable location services.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out.';
                        break;
                    default:
                        message = 'An unknown error occurred while getting location.';
                        break;
                }
                reject(new Error(message));
            },
            options
        );
    });
}
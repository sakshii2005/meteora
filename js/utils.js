// Utility functions for weather app

// Weather code to emoji mapping (based on WMO Weather interpretation codes)
const weatherIcons = {
    0: '☀️', // Clear sky
    1: '🌤️', // Mainly clear
    2: '⛅', // Partly cloudy
    3: '☁️', // Overcast
    45: '🌫️', // Fog
    48: '🌫️', // Depositing rime fog
    51: '🌦️', // Light drizzle
    53: '🌦️', // Moderate drizzle
    55: '🌧️', // Dense drizzle
    56: '🌨️', // Light freezing drizzle
    57: '🌨️', // Dense freezing drizzle
    61: '🌧️', // Slight rain
    63: '🌧️', // Moderate rain
    65: '🌧️', // Heavy rain
    66: '🌨️', // Light freezing rain
    67: '🌨️', // Heavy freezing rain
    71: '❄️', // Slight snow fall
    73: '❄️', // Moderate snow fall
    75: '❄️', // Heavy snow fall
    77: '❄️', // Snow grains
    80: '🌦️', // Slight rain showers
    81: '🌧️', // Moderate rain showers
    82: '⛈️', // Violent rain showers
    85: '🌨️', // Slight snow showers
    86: '🌨️', // Heavy snow showers
    95: '⛈️', // Thunderstorm
    96: '⛈️', // Thunderstorm with slight hail
    99: '⛈️'  // Thunderstorm with heavy hail
};

// Weather descriptions
const weatherDescriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Light rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail'
};

// Get weather icon for weather code
export function getWeatherIcon(code) {
    return weatherIcons[code] || '🌤️';
}

// Get weather description for weather code
export function getWeatherDescription(code) {
    return weatherDescriptions[code] || 'Unknown';
}

// Get AQI color based on value
export function getAQIColor(aqi) {
    if (aqi <= 50) return '#10B981'; // Good (Green)
    if (aqi <= 100) return '#F59E0B'; // Moderate (Yellow)
    if (aqi <= 150) return '#F97316'; // Unhealthy for sensitive (Orange)
    if (aqi <= 200) return '#EF4444'; // Unhealthy (Red)
    if (aqi <= 300) return '#8B5CF6'; // Very unhealthy (Purple)
    return '#7F1D1D'; // Hazardous (Maroon)
}

// Get AQI description based on value
export function getAQIDescription(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
}

// Format distance with appropriate units
export function formatDistance(km) {
    if (km < 1) {
        return `${Math.round(km * 1000)}m`;
    }
    if (km < 10) {
        return `${km.toFixed(1)}km`;
    }
    return `${Math.round(km)}km`;
}

// Format time difference in human readable format
export function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    
    const now = dayjs();
    const time = dayjs(timestamp);
    const diffMinutes = now.diff(time, 'minute');
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = now.diff(time, 'hour');
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = now.diff(time, 'day');
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return time.format('MMM D');
}

// Debounce function for search input
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

// Throttle function for scroll events
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Check if device is mobile
export function isMobile() {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if device supports touch
export function supportsTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Generate unique ID
export function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Copy text to clipboard
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const success = document.execCommand('copy');
            textArea.remove();
            return success;
        }
    } catch (err) {
        console.error('Failed to copy text:', err);
        return false;
    }
}

// Format number with locale-specific formatting
export function formatNumber(number, options = {}) {
    const defaults = {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    };
    
    return new Intl.NumberFormat(navigator.language, { ...defaults, ...options }).format(number);
}

// Convert coordinates to human-readable location string
export function formatCoordinates(lat, lng, precision = 4) {
    const latDirection = lat >= 0 ? 'N' : 'S';
    const lngDirection = lng >= 0 ? 'E' : 'W';
    
    return `${Math.abs(lat).toFixed(precision)}°${latDirection}, ${Math.abs(lng).toFixed(precision)}°${lngDirection}`;
}

// Check if location permissions are granted
export async function checkLocationPermission() {
    try {
        if (!navigator.permissions) {
            return 'unavailable';
        }
        
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state; // 'granted', 'denied', or 'prompt'
    } catch (err) {
        return 'unavailable';
    }
}

// Safe JSON parse with fallback
export function safeJsonParse(str, fallback = null) {
    try {
        return JSON.parse(str);
    } catch (err) {
        return fallback;
    }
}

// Check if string is a valid URL
export function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Get browser name and version
export function getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    
    if (userAgent.includes('Firefox')) {
        browser = 'Firefox';
        version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Chrome')) {
        browser = 'Chrome';
        version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari')) {
        browser = 'Safari';
        version = userAgent.match(/Safari\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge')) {
        browser = 'Edge';
        version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || 'Unknown';
    }
    
    return { browser, version };
}

// Check if app is running in standalone mode (PWA)
export function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
}

// Format file size in human readable format
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get device pixel ratio
export function getPixelRatio() {
    return window.devicePixelRatio || 1;
}

// Check if device is in dark mode
export function prefersDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Check if device prefers reduced motion
export function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Generate cache key for data storage
export function generateCacheKey(lat, lng, type = 'weather') {
    return `${type}_${Math.round(lat * 1000)}_${Math.round(lng * 1000)}`;
}

// Check if data is expired based on timestamp
export function isDataExpired(timestamp, maxAgeMinutes = 10) {
    if (!timestamp) return true;
    
    const now = Date.now();
    const dataTime = new Date(timestamp).getTime();
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
    
    return (now - dataTime) > maxAge;
}
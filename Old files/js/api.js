// API functions for weather data
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Generic fetch with error handling and caching
async function fetchWithCache(url, cacheKey) {
  // Check cache first
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw new Error('Network request failed. Please check your connection.');
  }
}

// Search for cities
export async function searchCities(query) {
  if (!query || query.length < 2) return [];
  
  const url = `${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const cacheKey = `geocode_${query}`;
  
  try {
    const data = await fetchWithCache(url, cacheKey);
    return data.results || [];
  } catch (error) {
    console.error('City search error:', error);
    return [];
  }
}

// Get weather forecast
export async function getWeatherForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,surface_pressure,visibility',
    daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max',
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,visibility',
    timezone: 'auto',
    forecast_days: 7
  });

  const url = `${WEATHER_API}?${params}`;
  const cacheKey = `weather_${latitude}_${longitude}`;
  
  try {
    const data = await fetchWithCache(url, cacheKey);
    return processWeatherData(data);
  } catch (error) {
    console.error('Weather forecast error:', error);
    throw error;
  }
}

// Get air quality data
export async function getAirQuality(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: 'pm2_5,pm10,us_aqi',
    timezone: 'auto'
  });

  const url = `${AIR_QUALITY_API}?${params}`;
  const cacheKey = `air_quality_${latitude}_${longitude}`;
  
  try {
    const data = await fetchWithCache(url, cacheKey);
    return processAirQualityData(data);
  } catch (error) {
    console.error('Air quality error:', error);
    // Return null instead of throwing to make air quality optional
    return null;
  }
}

// Process weather data into a more usable format
function processWeatherData(data) {
  const current = data.current || {};
  const hourly = data.hourly || {};
  const daily = data.daily || {};

  // Get current weather
  const currentWeather = {
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    pressure: current.surface_pressure,
    visibility: current.visibility,
    time: current.time
  };

  // Process hourly data for next 24 hours
  const next24Hours = [];
  for (let i = 0; i < Math.min(24, hourly.time?.length || 0); i++) {
    next24Hours.push({
      time: hourly.time[i],
      temperature: hourly.temperature_2m[i],
      humidity: hourly.relative_humidity_2m[i],
      precipitationProbability: hourly.precipitation_probability[i],
      windSpeed: hourly.wind_speed_10m[i],
      pressure: hourly.surface_pressure[i],
      visibility: hourly.visibility[i]
    });
  }

  // Process daily forecast
  const dailyForecast = [];
  for (let i = 0; i < Math.min(7, daily.time?.length || 0); i++) {
    dailyForecast.push({
      date: daily.time[i],
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i],
      uvIndex: daily.uv_index_max[i],
      precipitationProbability: daily.precipitation_probability_max[i]
    });
  }

  return {
    current: currentWeather,
    hourly: next24Hours,
    daily: dailyForecast,
    timezone: data.timezone
  };
}

// Process air quality data
function processAirQualityData(data) {
  if (!data.hourly) return null;

  const hourly = data.hourly;
  const currentIndex = 0; // Use current hour
  
  return {
    pm2_5: hourly.pm2_5[currentIndex],
    pm10: hourly.pm10[currentIndex],
    usAqi: hourly.us_aqi[currentIndex],
    time: hourly.time[currentIndex]
  };
}

// Get user's location using browser geolocation
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000 // 5 minutes
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
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
          default:
            message = 'An unknown error occurred';
            break;
        }
        reject(new Error(message));
      },
      options
    );
  });
}

// Weather condition mapping
export function getWeatherIcon(temperature, precipitationProbability) {
  if (precipitationProbability > 70) return '🌧️';
  if (precipitationProbability > 40) return '⛅';
  if (temperature > 25) return '☀️';
  if (temperature > 15) return '🌤️';
  if (temperature > 0) return '❄️';
  return '🌨️';
}

// Air quality level description
export function getAQIDescription(aqi) {
  if (aqi <= 50) return { level: 'Good', color: 'text-green-600', bg: 'bg-green-100' };
  if (aqi <= 100) return { level: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  if (aqi <= 150) return { level: 'Unhealthy for Sensitive', color: 'text-orange-600', bg: 'bg-orange-100' };
  if (aqi <= 200) return { level: 'Unhealthy', color: 'text-red-600', bg: 'bg-red-100' };
  if (aqi <= 300) return { level: 'Very Unhealthy', color: 'text-purple-600', bg: 'bg-purple-100' };
  return { level: 'Hazardous', color: 'text-red-800', bg: 'bg-red-200' };
}
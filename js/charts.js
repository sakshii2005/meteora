// charts.js
import { appState } from './state.js';

let tempChart = null;
let precipitationChart = null;
let linkedHoverIndex = null; // shared hover state for cross-chart highlighting

// Chart.js defaults
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.elements.point.radius = 3;
Chart.defaults.elements.point.hoverRadius = 5;
Chart.defaults.elements.line.tension = 0.4;

//PLS I HOPE THIS WORKS
/**
 * Update or create the hourly weather chart
 * @param {Object} data - The chart data { labels: [...], temps: [...] }
 */
export function updateHourlyChart(data) {
    const ctx = document.getElementById('hourlyChart')?.getContext('2d');
    if (!ctx) return;

    // If a chart already exists, destroy it before creating a new one
    if (hourlyChart) {
        hourlyChart.destroy();
    }

    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels, // e.g. ["10 AM", "11 AM", ...]
            datasets: [{
                label: 'Temperature (°C)',
                data: data.temps, // e.g. [20, 21, 23, ...]
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#3b82f6',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.parsed.y}°C`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

/**
 * Update chart theme (light/dark mode)
 * @param {boolean} isDarkMode - true for dark mode, false for light mode
 */
export function updateChartTheme(isDarkMode) {
    if (!hourlyChart) return;

    const textColor = isDarkMode ? '#e5e7eb' : '#111827';
    const gridColor = isDarkMode ? 'rgba(229, 231, 235, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    hourlyChart.options.scales.x.ticks.color = textColor;
    hourlyChart.options.scales.y.ticks.color = textColor;
    hourlyChart.options.scales.x.grid.color = gridColor;
    hourlyChart.options.scales.y.grid.color = gridColor;
    hourlyChart.update();
}

/**
 * Resize all charts on window resize
 */
export function resizeCharts() {
    if (hourlyChart) {
        hourlyChart.resize();
    }
}


// Initialize both charts
export function initializeCharts() {
  const tempCtx = document.getElementById('temp-chart');
  const precipCtx = document.getElementById('precipitation-chart');

  if (tempCtx) tempChart = new Chart(tempCtx, getTemperatureChartConfig());
  if (precipCtx) precipitationChart = new Chart(precipCtx, getPrecipitationChartConfig());
}

// Temperature chart config
function getTemperatureChartConfig() {
  return {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Temperature', data: [] }] },
    options: {
      interaction: { mode: 'index', intersect: false },
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const weather = appState.getCurrentWeather();
              const hour = weather?.hourly?.find(h =>
                new Date(h.time).toLocaleTimeString('en', { hour: 'numeric' }) === context.label
              );
              if (!hour) return '';
              return [
                `Temp: ${appState.formatTemperature(hour.temperature)}`,
                `Humidity: ${hour.humidity}%`,
                `Wind: ${appState.formatWindSpeed(hour.windSpeed)}`
              ];
            }
          }
        }
      },
      onHover: (event, elements) => {
        if (elements.length > 0) {
          linkedHoverIndex = elements[0].index;
          precipitationChart?.setActiveElements([{ datasetIndex: 0, index: linkedHoverIndex }]);
          precipitationChart?.update('none');
        } else {
          linkedHoverIndex = null;
          precipitationChart?.setActiveElements([]);
          precipitationChart?.update('none');
        }
      }
    }
  };
}

// Precipitation chart config
function getPrecipitationChartConfig() {
  return {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Precipitation Probability', data: [] }] },
    options: {
      interaction: { mode: 'index', intersect: false },
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const weather = appState.getCurrentWeather();
              const hour = weather?.hourly?.find(h =>
                new Date(h.time).toLocaleTimeString('en', { hour: 'numeric' }) === context.label
              );
              if (!hour) return '';
              return `Precip: ${Math.round(hour.precipitationProbability)}%`;
            }
          }
        }
      },
      onHover: (event, elements) => {
        if (elements.length > 0) {
          linkedHoverIndex = elements[0].index;
          tempChart?.setActiveElements([{ datasetIndex: 0, index: linkedHoverIndex }]);
          tempChart?.update('none');
        } else {
          linkedHoverIndex = null;
          tempChart?.setActiveElements([]);
          tempChart?.update('none');
        }
      }
    }
  };
}

// Update both charts for a specific day index
export function updateCharts(weatherData, dayIndex = 0) {
  if (!weatherData || !weatherData.hourly) return;

  const selectedDate = weatherData.daily[dayIndex].date; // "YYYY-MM-DD"
  const hoursForDay = weatherData.hourly.filter(h => h.time.startsWith(selectedDate));

  if (!hoursForDay.length) {
    console.warn(`No hourly data found for date: ${selectedDate}`);
    return;
  }

  updateTemperatureChart(hoursForDay);
  updatePrecipitationChart(hoursForDay);
}

// Update temp chart
function updateTemperatureChart(hourlyData) {
  if (!tempChart || !hourlyData.length) return;

  const temps = hourlyData.map(h => h.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);

  tempChart.data.labels = hourlyData.map(h =>
    new Date(h.time).toLocaleTimeString('en', { hour: 'numeric', hour12: true })
  );
  tempChart.data.datasets[0] = {
    label: 'Temperature',
    data: temps,
    borderColor: 'rgb(59, 130, 246)',
    backgroundColor: temps.map(t => {
      const ratio = (t - minTemp) / (maxTemp - minTemp);
      const red = Math.round(255 * ratio);
      const blue = Math.round(255 * (1 - ratio));
      return `rgba(${red}, 100, ${blue}, 0.5)`;
    }),
    fill: true,
    pointBorderWidth: 2,
    pointBackgroundColor: 'rgb(59, 130, 246)'
  };

  tempChart.update();
}

// Update precipitation chart
function updatePrecipitationChart(hourlyData) {
  if (!precipitationChart || !hourlyData.length) return;

  const precipitation = hourlyData.map(h => h.precipitationProbability || 0);

  precipitationChart.data.labels = hourlyData.map(h =>
    new Date(h.time).toLocaleTimeString('en', { hour: 'numeric', hour12: true })
  );
  precipitationChart.data.datasets[0] = {
    label: 'Precipitation Probability',
    data: precipitation,
    backgroundColor: precipitation.map(p => {
      if (p < 20) return 'rgba(34, 197, 94, 0.4)';
      if (p < 50) return 'rgba(234, 179, 8, 0.6)';
      if (p < 80) return 'rgba(249, 115, 22, 0.7)';
      return 'rgba(239, 68, 68, 0.8)';
    }),
    borderWidth: 1,
    borderRadius: 4
  };

  precipitationChart.update();
}

// Destroy charts
export function destroyCharts() {
  if (tempChart) {
    tempChart.destroy();
    tempChart = null;
  }
  if (precipitationChart) {
    precipitationChart.destroy();
    precipitationChart = null;
  }
}

// Resize charts
export function resizeCharts() {
  if (tempChart) tempChart.resize();
  if (precipitationChart) precipitationChart.resize();
}

// charts.js
import { appState } from './state.js';
import Chart from 'chart.js/auto';

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

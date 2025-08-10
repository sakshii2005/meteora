// Chart.js configuration and management
import { appState } from './state.js';

let tempChart = null;
let precipitationChart = null;

// Chart.js default configuration
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.elements.point.radius = 3;
Chart.defaults.elements.point.hoverRadius = 5;
Chart.defaults.elements.line.tension = 0.4;

// Initialize charts
export function initializeCharts() {
  const tempCtx = document.getElementById('temp-chart');
  const precipCtx = document.getElementById('precipitation-chart');
  
  if (tempCtx) {
    tempChart = new Chart(tempCtx, getTemperatureChartConfig());
  }
  
  if (precipCtx) {
    precipitationChart = new Chart(precipCtx, getPrecipitationChartConfig());
  }
}

// Temperature chart configuration
function getTemperatureChartConfig() {
  return {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Temperature',
        data: [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const temp = context.parsed.y;
              return `Temperature: ${appState.formatTemperature(temp)}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 6,
            color: '#6b7280',
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(156, 163, 175, 0.2)',
          },
          ticks: {
            color: '#6b7280',
            callback: function(value) {
              return appState.formatTemperature(value);
            }
          }
        }
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart'
      }
    }
  };
}

// Precipitation chart configuration
function getPrecipitationChartConfig() {
  return {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Precipitation Probability',
        data: [],
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              return `Precipitation: ${Math.round(value)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 6,
            color: '#6b7280',
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(156, 163, 175, 0.2)',
          },
          ticks: {
            color: '#6b7280',
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart'
      }
    }
  };
}

// Update temperature chart
export function updateTemperatureChart(hourlyData) {
  if (!tempChart || !hourlyData || hourlyData.length === 0) return;

  const labels = hourlyData.slice(0, 24).map(hour => {
    const date = new Date(hour.time);
    return date.getHours() === 0 ? 
      date.toLocaleDateString('en', { month: 'short', day: 'numeric' }) :
      date.toLocaleTimeString('en', { hour: 'numeric', hour12: true });
  });

  const temperatures = hourlyData.slice(0, 24).map(hour => hour.temperature);

  tempChart.data.labels = labels;
  tempChart.data.datasets[0].data = temperatures;
  
  // Update chart colors based on temperature range
  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);
  const colors = temperatures.map(temp => {
    const ratio = (temp - minTemp) / (maxTemp - minTemp) || 0;
    const red = Math.round(255 * ratio);
    const blue = Math.round(255 * (1 - ratio));
    return `rgba(${red}, 100, ${blue}, 0.6)`;
  });
  
  tempChart.data.datasets[0].backgroundColor = colors;
  tempChart.update('active');
}

// Update precipitation chart
export function updatePrecipitationChart(hourlyData) {
  if (!precipitationChart || !hourlyData || hourlyData.length === 0) return;

  const labels = hourlyData.slice(0, 24).map(hour => {
    const date = new Date(hour.time);
    return date.getHours() === 0 ? 
      date.toLocaleDateString('en', { month: 'short', day: 'numeric' }) :
      date.toLocaleTimeString('en', { hour: 'numeric', hour12: true });
  });

  const precipitation = hourlyData.slice(0, 24).map(hour => hour.precipitationProbability || 0);

  precipitationChart.data.labels = labels;
  precipitationChart.data.datasets[0].data = precipitation;
  
  // Update bar colors based on precipitation probability
  const colors = precipitation.map(prob => {
    if (prob < 20) return 'rgba(34, 197, 94, 0.4)';
    if (prob < 50) return 'rgba(234, 179, 8, 0.6)';
    if (prob < 80) return 'rgba(249, 115, 22, 0.7)';
    return 'rgba(239, 68, 68, 0.8)';
  });
  
  precipitationChart.data.datasets[0].backgroundColor = colors;
  precipitationChart.update('active');
}

// Update both charts
export function updateCharts(weatherData) {
  if (!weatherData || !weatherData.hourly) return;
  
  updateTemperatureChart(weatherData.hourly);
  updatePrecipitationChart(weatherData.hourly);
}

// Destroy charts (cleanup)
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

// Resize charts (for responsive behavior)
export function resizeCharts() {
  if (tempChart) tempChart.resize();
  if (precipitationChart) precipitationChart.resize();
}

// Chart theme updates
export function updateChartTheme(isDark) {
  const textColor = isDark ? '#f1f5f9' : '#6b7280';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)';
  
  const updateOptions = (chart) => {
    if (!chart) return;
    
    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.y.ticks.color = textColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.update('none');
  };
  
  updateOptions(tempChart);
  updateOptions(precipitationChart);
}

// Export chart data (for accessibility/screen readers)
export function getChartDataAsText(weatherData) {
  if (!weatherData || !weatherData.hourly) return '';
  
  const hourlyData = weatherData.hourly.slice(0, 24);
  const tempUnit = appState.getSetting('temperatureUnit', 'celsius');
  
  let text = 'Hourly forecast for the next 24 hours:\n\n';
  
  hourlyData.forEach((hour, index) => {
    const time = new Date(hour.time);
    const timeStr = time.toLocaleTimeString('en', { hour: 'numeric', hour12: true });
    const temp = appState.formatTemperature(hour.temperature);
    const precip = Math.round(hour.precipitationProbability || 0);
    
    text += `${timeStr}: ${temp}, ${precip}% chance of precipitation\n`;
  });
  
  return text;
}
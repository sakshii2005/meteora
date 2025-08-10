
import { initializeDOMElements, renderHistoryCalendar, getDOMElements } from './ui.js';
import { appState } from './state.js';
import { getWeatherData } from './api.js';

async function initHistoryPage() {
  // Initialize references for the calendar elements on this page
  initializeDOMElements();

  // Apply saved theme immediately
  const settings = appState.get().settings;
  appState.applyTheme(settings.theme);

  const { currentLocation } = appState.get();
  const { historyGrid, historyMonth, historyPrev, historyNext } = getDOMElements();

  if (!currentLocation) {
    const empty = document.getElementById('history-empty');
    if (empty) empty.style.display = 'block';
    if (historyGrid) historyGrid.innerHTML = '';
    if (historyMonth) historyMonth.textContent = '—';
    if (historyPrev) historyPrev.disabled = true;
    if (historyNext) historyNext.disabled = true;
    return;
  }

  try {
    const weather = await getWeatherData(currentLocation.latitude, currentLocation.longitude);
    if (!weather?.daily) {
      throw new Error('No daily data available');
    }

    // Cache in state for consistency
    appState.setCurrentWeather(currentLocation, weather, null);

    // Render the current month calendar
    renderHistoryCalendar(weather, 0);
  } catch (err) {
    console.error(err);
    const empty = document.getElementById('history-empty');
    if (empty) {
      empty.style.display = 'block';
      empty.innerHTML = `<em>Failed to load history. ${err?.message || ''}</em>`;
    }
  }
}

initHistoryPage();
/* ============================================================
   BREEZE — Weather App Logic
   Handles search, API calls, and UI rendering
   ============================================================ */

(() => {
    'use strict';

    // ---------- DOM References ----------
    const $ = (sel) => document.querySelector(sel);
    const searchInput   = $('#search-input');
    const searchResults = $('#search-results');
    const searchLoader  = $('#search-loader');
    const welcomeState  = $('#welcome-state');
    const weatherContent = $('#weather-content');
    const errorState    = $('#error-state');
    const errorText     = $('#error-text');

    // ---------- State ----------
    let debounceTimer = null;
    let activeIndex   = -1;

    // ---------- Search ----------
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);

        if (query.length < 2) {
            closeDropdown();
            return;
        }

        debounceTimer = setTimeout(() => fetchSuggestions(query), 350);
    });

    searchInput.addEventListener('keydown', (e) => {
        const items = searchResults.querySelectorAll('li');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
            highlightItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            highlightItem(items);
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            items[activeIndex].click();
        } else if (e.key === 'Escape') {
            closeDropdown();
            searchInput.blur();
        }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) closeDropdown();
    });

    async function fetchSuggestions(query) {
        searchLoader.classList.add('active');
        try {
            const res = await fetch(`/search/${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            renderSuggestions(data);
        } catch (err) {
            console.error(err);
            closeDropdown();
        } finally {
            searchLoader.classList.remove('active');
        }
    }

    function renderSuggestions(cities) {
        searchResults.innerHTML = '';
        activeIndex = -1;

        if (!cities || !cities.length) {
            closeDropdown();
            return;
        }

        cities.slice(0, 6).forEach((city, i) => {
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.innerHTML = `
                <span class="result-city">${city.name}</span>
                <span class="result-region">${city.region ? city.region + ', ' : ''}${city.country}</span>
            `;
            li.addEventListener('click', () => selectCity(city.name));
            searchResults.appendChild(li);
        });

        searchResults.classList.add('open');
    }

    function highlightItem(items) {
        items.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
    }

    function closeDropdown() {
        searchResults.classList.remove('open');
        searchResults.innerHTML = '';
        activeIndex = -1;
    }

    // ---------- Select City ----------
    async function selectCity(city) {
        closeDropdown();
        searchInput.value = city;
        searchInput.blur();

        showLoading();

        try {
            const [currentRes, forecastRes] = await Promise.all([
                fetch(`/current/${encodeURIComponent(city)}`),
                fetch(`/forecast/${encodeURIComponent(city)}`)
            ]);

            if (!currentRes.ok || !forecastRes.ok) throw new Error('Failed to fetch weather');

            const currentData  = await currentRes.json();
            const forecastData = await forecastRes.json();

            if (currentData.error) throw new Error(currentData.error.message);
            if (forecastData.error) throw new Error(forecastData.error.message);

            renderCurrentWeather(currentData);
            renderForecast(forecastData);
            renderHourly(forecastData);

            showWeather();
        } catch (err) {
            console.error(err);
            showError(err.message || 'Could not load weather data. Please try again.');
        }
    }

    // ---------- Render Current Weather ----------
    function renderCurrentWeather(data) {
        const loc  = data.location;
        const cur  = data.current;

        $('#city-name').textContent   = loc.name;
        $('#region-name').textContent = `${loc.region ? loc.region + ', ' : ''}${loc.country}`;
        $('#current-time').textContent = formatLocalTime(loc.localtime);

        $('#temp-value').textContent  = Math.round(cur.temp_c);
        $('#temp-unit').textContent   = '°C';
        $('#condition-text').textContent = cur.condition.text;

        const iconUrl = cur.condition.icon.startsWith('//')
            ? 'https:' + cur.condition.icon
            : cur.condition.icon;
        $('#condition-icon').src = iconUrl;
        $('#condition-icon').alt = cur.condition.text;

        $('#feels-like').textContent  = `${Math.round(cur.feelslike_c)}°C`;
        $('#humidity').textContent    = `${cur.humidity}%`;
        $('#wind').textContent        = `${cur.wind_kph} km/h`;
        $('#uv-index').textContent    = cur.uv;
        $('#pressure').textContent    = `${cur.pressure_mb} mb`;
        $('#visibility').textContent  = `${cur.vis_km} km`;
    }

    // ---------- Render 3-Day Forecast ----------
    function renderForecast(data) {
        const container = $('#forecast-cards');
        container.innerHTML = '';

        data.forecast.forecastday.forEach((day, i) => {
            const date = new Date(day.date + 'T00:00:00');
            const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const iconUrl = day.day.condition.icon.startsWith('//')
                ? 'https:' + day.day.condition.icon
                : day.day.condition.icon;

            const card = document.createElement('div');
            card.className = 'forecast-card glass-card';
            card.innerHTML = `
                <span class="forecast-day">${dayName}</span>
                <img class="forecast-icon" src="${iconUrl}" alt="${day.day.condition.text}" width="44" height="44">
                <div class="forecast-temps">
                    <span class="forecast-high">${Math.round(day.day.maxtemp_c)}°</span>
                    <span class="forecast-low">${Math.round(day.day.mintemp_c)}°</span>
                </div>
                <span class="forecast-condition">${day.day.condition.text}</span>
            `;
            container.appendChild(card);
        });
    }

    // ---------- Render Hourly ----------
    function renderHourly(data) {
        const container = $('#hourly-scroll');
        container.innerHTML = '';

        const todayHours = data.forecast.forecastday[0].hour;
        const currentHour = new Date(data.location.localtime).getHours();

        todayHours.forEach((hour) => {
            const hourTime = new Date(hour.time);
            const h = hourTime.getHours();
            const isNow = h === currentHour;

            const iconUrl = hour.condition.icon.startsWith('//')
                ? 'https:' + hour.condition.icon
                : hour.condition.icon;

            const item = document.createElement('div');
            item.className = `hourly-item${isNow ? ' now' : ''}`;
            item.innerHTML = `
                <span class="hourly-time">${isNow ? 'Now' : formatHour(h)}</span>
                <img class="hourly-icon" src="${iconUrl}" alt="${hour.condition.text}" width="30" height="30">
                <span class="hourly-temp">${Math.round(hour.temp_c)}°</span>
            `;
            container.appendChild(item);
        });

        // Scroll to current hour
        const nowItem = container.querySelector('.now');
        if (nowItem) {
            setTimeout(() => {
                nowItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }, 400);
        }
    }

    // ---------- View State Helpers ----------
    function showWeather() {
        welcomeState.style.display  = 'none';
        errorState.style.display    = 'none';
        weatherContent.style.display = 'block';

        // Re-trigger animations
        weatherContent.querySelectorAll('.current-card, .forecast-section, .hourly-section').forEach((el) => {
            el.style.animation = 'none';
            el.offsetHeight; // Trigger reflow
            el.style.animation = '';
        });
    }

    function showError(msg) {
        welcomeState.style.display  = 'none';
        weatherContent.style.display = 'none';
        errorState.style.display    = 'block';
        errorText.textContent = msg;
    }

    function showLoading() {
        // Simple: just hide content momentarily
        errorState.style.display = 'none';
    }

    // ---------- Utilities ----------
    function formatLocalTime(localtime) {
        const d = new Date(localtime);
        return d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    function formatHour(h) {
        if (h === 0) return '12 AM';
        if (h < 12) return `${h} AM`;
        if (h === 12) return '12 PM';
        return `${h - 12} PM`;
    }

})();

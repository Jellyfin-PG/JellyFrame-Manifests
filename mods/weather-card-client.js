(function () {
    'use strict';

    function injectStyles() {
        if (document.getElementById('jf-weather-card-styles')) return;
        var style = document.createElement('style');
        style.id = 'jf-weather-card-styles';
        style.textContent = [
            "#jf-weather-card { display: flex; flex-direction: column; color: #fff; font-family: 'Inter', system-ui, sans-serif; transition: opacity 0.4s ease, transform 0.4s ease; }",
            ".jf-wt-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 20px; }",
            ".jf-wt-time-container { display: flex; flex-direction: column; }",
            ".jf-wt-time { font-size: 3.2rem; font-weight: 700; line-height: 1; letter-spacing: -0.02em; }",
            ".jf-wt-date { font-size: 1rem; opacity: 0.6; font-weight: 500; margin-top: 4px; letter-spacing: 0.05em; text-transform: uppercase; }",
            ".jf-wt-city { font-size: 0.85rem; opacity: 0.8; font-weight: 600; margin-top: 8px; color: #00a4dc; display: flex; align-items: center; gap: 4px; }",
            ".jf-wt-city .material-icons { font-size: 14px; }",
            ".jf-wt-current { display: flex; align-items: center; gap: 16px; text-align: right; }",
            ".jf-wt-current-icon .material-icons { font-size: 3.5rem; text-shadow: 0 0 20px rgba(255,255,255,0.2); }",
            ".jf-wt-current-temp { font-size: 2.5rem; font-weight: 600; line-height: 1; }",
            ".jf-wt-current-desc { font-size: 0.9rem; opacity: 0.6; font-weight: 500; margin-top: 4px; }",
            ".jf-wt-forecast { display: flex; justify-content: space-between; gap: 10px; }",
            ".jf-wt-day { display: flex; flex-direction: column; align-items: center; flex: 1; background: rgba(255,255,255,0.03); padding: 12px 0; border-radius: 10px; }",
            ".jf-wt-day-name { font-size: 0.8rem; opacity: 0.7; font-weight: 600; text-transform: uppercase; margin-bottom: 8px; }",
            ".jf-wt-day .material-icons { font-size: 1.8rem; margin-bottom: 8px; opacity: 0.9; }",
            ".jf-wt-day-temps { font-size: 0.9rem; font-weight: 600; display: flex; gap: 8px; }",
            ".jf-wt-high { color: #fff; }",
            ".jf-wt-low { opacity: 0.5; }",
            
            "@keyframes w-spin { 100% { transform: rotate(360deg); } }",
            "@keyframes w-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }",
            "@keyframes w-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }",
            "@keyframes w-rain { 0% { transform: translateY(-2px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(6px); opacity: 0; } }",
            ".anim-sun { animation: w-spin 20s linear infinite; color: #ffd700; }",
            ".anim-cloud { animation: w-float 4s ease-in-out infinite; color: #b0c4de; }",
            ".anim-rain { animation: w-rain 1.5s linear infinite; color: #4db8ff; }",
            ".anim-storm { animation: w-pulse 2s ease-in-out infinite; color: #a463ff; }",
            ".anim-snow { animation: w-spin 10s linear infinite; color: #ffffff; }",
            
            "@media(max-width: 768px) {",
            "  .jf-wt-time { font-size: 2.2rem; }",
            "  .jf-wt-current-icon .material-icons { font-size: 2.5rem; }",
            "  .jf-wt-current-temp { font-size: 1.8rem; }",
            "  .jf-wt-day { padding: 8px 0; }",
            "  .jf-wt-day .material-icons { font-size: 1.4rem; }",
            "  .jf-wt-day-temps { font-size: 0.8rem; flex-direction: column; gap: 2px; align-items: center; }",
            "}"
        ].join('\n');
        document.head.appendChild(style);
    }

    function getWeatherMap(code) {
        if (code === 0) return { i: 'wb_sunny', c: 'anim-sun', d: 'Clear' };
        if (code >= 1 && code <= 3) return { i: 'cloud', c: 'anim-cloud', d: 'Cloudy' };
        if (code >= 45 && code <= 48) return { i: 'foggy', c: 'anim-cloud', d: 'Fog' };
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { i: 'water_drop', c: 'anim-rain', d: 'Rain' };
        if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { i: 'ac_unit', c: 'anim-snow', d: 'Snow' };
        if (code >= 95) return { i: 'bolt', c: 'anim-storm', d: 'Storm' };
        return { i: 'wb_sunny', c: 'anim-sun', d: 'Clear' };
    }

    function buildCard(targetContainer) {
        if (document.getElementById('jf-weather-card')) return;
        
        var card = document.createElement('div');
        card.id = 'jf-weather-card';
        
        card.className = 'app col-12';
        
        card.innerHTML = [
            '<div class="jf-wt-top">',
            '  <div class="jf-wt-time-container">',
            '    <div class="jf-wt-time" id="jf-wt-clock">--:--</div>',
            '    <div class="jf-wt-date" id="jf-wt-date">--</div>',
            '    <div class="jf-wt-city" id="jf-wt-city"><span class="material-icons">location_on</span> Locating...</div>',
            '  </div>',
            '  <div class="jf-wt-current">',
            '    <div class="jf-wt-current-desc-container">',
            '      <div class="jf-wt-current-temp" id="jf-wt-temp">--°</div>',
            '      <div class="jf-wt-current-desc" id="jf-wt-desc">--</div>',
            '    </div>',
            '    <div class="jf-wt-current-icon" id="jf-wt-icon"></div>',
            '  </div>',
            '</div>',
            '<div class="jf-wt-forecast" id="jf-wt-forecast-box"></div>'
        ].join('');
        
        targetContainer.appendChild(card);
        
        updateTime();
        fetchLocationAndWeather();
    }

    function tryInject(attempts) {
        attempts = attempts || 0;
        if (document.getElementById('jf-weather-card')) return;
        if (attempts > 20) return;

        // Hunt specifically for the Layout Manager's custom grid
        var appArea = document.getElementById('app-area');

        if (!appArea) {
            setTimeout(function() { tryInject(attempts + 1); }, 500);
            return;
        }

        buildCard(appArea);
    }

    function updateTime() {
        var clockEl = document.getElementById('jf-wt-clock');
        var dateEl = document.getElementById('jf-wt-date');
        if (!clockEl || !dateEl) return;

        var now = new Date();
        
        var hours = now.getHours();
        var mins = now.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        mins = mins < 10 ? '0' + mins : mins;
        
        clockEl.textContent = hours + ':' + mins + ' ' + ampm;
        
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        dateEl.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
        
        setTimeout(updateTime, 1000 * (60 - now.getSeconds()));
    }

    function fetchLocationAndWeather() {
        fetch('https://get.geojs.io/v1/ip/geo.json')
            .then(function(res) { return res.json(); })
            .then(function(geoData) {
                var lat = geoData.latitude;
                var lon = geoData.longitude;
                
                var cityEl = document.getElementById('jf-wt-city');
                if (cityEl) {
                    cityEl.innerHTML = '<span class="material-icons">location_on</span> ' + geoData.city + ', ' + geoData.region;
                }

                return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto');
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var currentMap = getWeatherMap(data.current.weather_code);
                document.getElementById('jf-wt-temp').textContent = Math.round(data.current.temperature_2m) + '°';
                document.getElementById('jf-wt-desc').textContent = currentMap.d;
                document.getElementById('jf-wt-icon').innerHTML = '<span class="material-icons ' + currentMap.c + '">' + currentMap.i + '</span>';

                var forecastBox = document.getElementById('jf-wt-forecast-box');
                var forecastHTML = '';
                
                var shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                
                for (var i = 1; i <= 5; i++) {
                    var parts = data.daily.time[i].split('-');
                    var date = new Date(parts[0], parts[1] - 1, parts[2]);
                    var dayName = shortDays[date.getDay()];
                    
                    var dayMap = getWeatherMap(data.daily.weather_code[i]);
                    var high = Math.round(data.daily.temperature_2m_max[i]);
                    var low = Math.round(data.daily.temperature_2m_min[i]);

                    forecastHTML += [
                        '<div class="jf-wt-day">',
                        '  <div class="jf-wt-day-name">' + dayName + '</div>',
                        '  <span class="material-icons ' + dayMap.c + '">' + dayMap.i + '</span>',
                        '  <div class="jf-wt-day-temps">',
                        '    <span class="jf-wt-high">' + high + '°</span>',
                        '    <span class="jf-wt-low">' + low + '°</span>',
                        '  </div>',
                        '</div>'
                    ].join('\n');
                }
                forecastBox.innerHTML = forecastHTML;
            })
            .catch(function(e) {
                console.error(e);
                var cityEl = document.getElementById('jf-wt-city');
                if (cityEl) cityEl.innerHTML = '<span class="material-icons">error_outline</span> Location Unavailable';
            });
    }

    function init() {
        injectStyles();
        
        var checkPage = function() {
            if (window.location.hash.indexOf('home') !== -1 || window.location.hash === '' || window.location.hash === '#/') {
                tryInject(0);
            }
        };
        
        window.addEventListener('hashchange', checkPage);
        document.addEventListener('viewshow', checkPage);
        
        window.addEventListener('jfAppAreaReady', function() {
            tryInject(0);
        });
        
        checkPage();
    }

    init();

})();

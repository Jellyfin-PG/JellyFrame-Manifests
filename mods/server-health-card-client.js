(function () {
    'use strict';

    function injectStyles() {
        if (document.getElementById('jf-health-card-styles')) return;
        var style = document.createElement('style');
        style.id = 'jf-health-card-styles';
        style.textContent = [
            "#jf-health-card { display: flex; flex-direction: column; color: #fff; font-family: 'Inter', system-ui, sans-serif; transition: opacity 0.4s ease, transform 0.4s ease; background: rgba(0,0,0,0.25); padding: 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }",
            ".jf-sh-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px; }",
            ".jf-sh-title { font-size: 1.4rem; font-weight: 600; display: flex; align-items: center; gap: 8px; letter-spacing: -0.01em; }",
            ".jf-sh-title .material-icons { color: #00a4dc; font-size: 1.8rem; }",
            ".jf-sh-status { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #4caf50; }",
            ".jf-sh-dot { width: 10px; height: 10px; background-color: #4caf50; border-radius: 50%; animation: sh-pulse 2s infinite; }",
            ".jf-sh-metrics { display: flex; justify-content: space-between; gap: 15px; }",
            ".jf-sh-metric { display: flex; flex-direction: column; align-items: center; flex: 1; background: rgba(255,255,255,0.03); padding: 15px 0; border-radius: 10px; transition: background 0.2s ease; }",
            ".jf-sh-metric:hover { background: rgba(255,255,255,0.06); }",
            ".jf-sh-metric .material-icons { font-size: 2rem; margin-bottom: 8px; opacity: 0.9; color: #fff; }",
            ".jf-sh-value { font-size: 1.8rem; font-weight: 700; line-height: 1; margin-bottom: 4px; }",
            ".jf-sh-label { font-size: 0.75rem; opacity: 0.6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; }",
            
            "@keyframes sh-pulse { 0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); } 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); } }",
            
            "@media(max-width: 768px) {",
            "  .jf-sh-metrics { flex-direction: column; gap: 10px; }",
            "  .jf-sh-metric { padding: 12px 0; flex-direction: row; justify-content: space-around; }",
            "  .jf-sh-metric .material-icons { margin-bottom: 0; font-size: 1.5rem; }",
            "  .jf-sh-value { font-size: 1.4rem; margin-bottom: 0; }",
            "}"
        ].join('\n');
        document.head.appendChild(style);
    }

    function buildCard(targetContainer) {
        if (document.getElementById('jf-health-card')) return;
        
        var card = document.createElement('div');
        card.id = 'jf-health-card';
        
        card.className = 'app col-6'; 
        
        card.innerHTML = [
            '<div class="jf-sh-top">',
            '  <div class="jf-sh-title"><span class="material-icons">dns</span> Server Health</div>',
            '  <div class="jf-sh-status"><div class="jf-sh-dot"></div> Online</div>',
            '</div>',
            '<div class="jf-sh-metrics">',
            '  <div class="jf-sh-metric">',
            '    <span class="material-icons">play_circle_outline</span>',
            '    <div class="jf-sh-value" id="jf-sh-streams">0</div>',
            '    <div class="jf-sh-label">Active Streams</div>',
            '  </div>',
            '  <div class="jf-sh-metric">',
            '    <span class="material-icons">devices</span>',
            '    <div class="jf-sh-value" id="jf-sh-devices">0</div>',
            '    <div class="jf-sh-label">Connected</div>',
            '  </div>',
            '  <div class="jf-sh-metric">',
            '    <span class="material-icons">info_outline</span>',
            '    <div class="jf-sh-value" id="jf-sh-version">--</div>',
            '    <div class="jf-sh-label">Version</div>',
            '  </div>',
            '</div>'
        ].join('');
        
        targetContainer.appendChild(card);
        
        fetchServerData();
    }

    function fetchServerData() {
        if (!window.ApiClient) {
            setTimeout(fetchServerData, 1000);
            return;
        }

        window.ApiClient.getSessions().then(function(sessions) {
            var activeStreams = 0;
            var activeDevices = sessions.length;

            sessions.forEach(function(session) {
                if (session.NowPlayingItem) {
                    activeStreams++;
                }
            });

            var streamsEl = document.getElementById('jf-sh-streams');
            if (streamsEl) streamsEl.textContent = activeStreams;

            var devicesEl = document.getElementById('jf-sh-devices');
            if (devicesEl) devicesEl.textContent = activeDevices;

        }).catch(function(e) {
            console.error("Health Card - Error fetching sessions: ", e);
        });

        window.ApiClient.getPublicSystemInfo().then(function(info) {
            var versionEl = document.getElementById('jf-sh-version');
            if (versionEl && info.Version) {
                versionEl.textContent = info.Version.split('.').slice(0, 3).join('.'); 
            }
        }).catch(function(e) {
            console.error("Health Card - Error fetching system info: ", e);
        });

        setTimeout(fetchServerData, 10000);
    }

    function tryInject(attempts) {
        attempts = attempts || 0;
        if (document.getElementById('jf-health-card')) return;
        if (attempts > 20) return;

        var appArea = document.getElementById('app-area');

        if (!appArea) {
            setTimeout(function() { tryInject(attempts + 1); }, 500);
            return;
        }

        buildCard(appArea);
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

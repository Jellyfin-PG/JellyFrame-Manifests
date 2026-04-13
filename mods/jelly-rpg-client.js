// Runs in the browser. Renders the interactive Character Sheet, Realms, and Level Up toasts.
// Strictly ES5 compliant.

(function() {
    var MOD_ID = 'jelly-rpg';
    var charData = null;
    var animTimer = null;
    var toastTimer = null;
    
    function injectStyles() {
        if (document.getElementById('rpg-css')) return;
        var s = document.createElement('style');
        s.id = 'rpg-css';
        s.innerHTML = 
            '.rpg-nav-btn { display: flex; align-items: center; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 4px 12px 4px 6px; margin-right: 15px; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); transition: all 0.3s; user-select: none; } ' +
            '.rpg-nav-btn:hover { background: rgba(255,255,255,0.1); } ' +
            '.rpg-nav-btn.pulse { transform: scale(1.05); box-shadow: 0 0 15px {{XP_COLOR}}; border-color: {{XP_COLOR}}; background: rgba(0,0,0,0.8); } ' +
            '.rpg-lvl-box { background: {{XP_COLOR}}; color: #fff; width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1rem; margin-right: 10px; box-shadow: inset 0 -3px 5px rgba(0,0,0,0.3); text-shadow: 1px 1px 0 #000; } ' +
            '.rpg-nav-btn.pulse .rpg-lvl-box { box-shadow: 0 0 15px {{XP_COLOR}}; } ' +
            '.rpg-nav-info { display: flex; flex-direction: column; width: 110px; } ' +
            '.rpg-nav-class { font-size: 0.75rem; color: #ddd; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } ' +
            '.rpg-nav-btn.pulse .rpg-nav-class { color: {{XP_COLOR}}; } ' +
            '.rpg-bar-bg { width: 100%; height: 5px; background: rgba(255,255,255,0.2); border-radius: 2px; margin-top: 3px; overflow: hidden; } ' +
            '.rpg-bar-fill { height: 100%; background: {{XP_COLOR}}; transition: width 0.5s ease; } ' +
            
            '.rpg-toast-overlay { position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%) scale(0.5); opacity: 0; pointer-events: none; z-index: 999999; text-align: center; transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); } ' +
            '.rpg-toast-overlay.show { opacity: 1; transform: translate(-50%, -50%) scale(1); } ' +
            '.rpg-toast-text { font-size: 4rem; font-weight: 900; color: {{LEVEL_UP_COLOR}}; text-transform: uppercase; text-shadow: 0 5px 20px rgba(0,0,0,0.8), 0 0 30px {{LEVEL_UP_COLOR}}; font-family: Impact, sans-serif; letter-spacing: 5px; margin: 0; } ' +
            '.rpg-toast-sub { font-size: 1.5rem; color: #fff; background: rgba(0,0,0,0.8); padding: 5px 20px; border-radius: 20px; display: inline-block; margin-top: 10px; border: 2px solid {{LEVEL_UP_COLOR}}; } ' +
            
            '.rpg-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; font-family: monospace; } ' +
            '.rpg-modal.active { opacity: 1; pointer-events: auto; } ' +
            '.rpg-sheet { background: #111; width: 450px; border-radius: 4px; padding: 2rem; border: 2px solid {{XP_COLOR}}; box-shadow: 0 0 30px rgba(0,0,0,0.7); position: relative; transform: scale(0.95); transition: transform 0.2s; color: #fff; } ' +
            '.rpg-modal.active .rpg-sheet { transform: scale(1); } ' +
            '.rpg-close { position: absolute; top: 10px; right: 10px; background: none; border: none; color: #666; cursor: pointer; padding: 5px; } ' +
            '.rpg-close:hover { color: {{XP_COLOR}}; } ' +
            
            '.rpg-header { display: flex; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #333; padding-bottom: 1rem; position: relative; } ' +
            '.rpg-portrait { width: 80px; height: 80px; border-radius: 4px; border: 2px solid #555; background-size: cover; margin-right: 1.5rem; } ' +
            '.rpg-name { font-size: 1.5rem; font-weight: bold; text-transform: uppercase; margin: 0 0 5px 0; color: {{XP_COLOR}}; } ' +
            '.rpg-sub { font-size: 0.9rem; color: #aaa; margin-bottom: 4px; } ' +
            '.rpg-realm { display: inline-block; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; color: #ddd; letter-spacing: 0.5px; } ' +
            '.rpg-realm::before { content: "Realm: "; color: #888; } ' +
            
            '.rpg-pts-banner { background: rgba(255, 215, 0, 0.15); color: #ffd700; padding: 10px; text-align: center; border-radius: 4px; margin-bottom: 1.5rem; font-weight: bold; border: 1px dashed #ffd700; animation: rpgPulse 2s infinite; } ' +
            '@keyframes rpgPulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } } ' +
            
            '.rpg-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 2rem; } ' +
            '.rpg-stat-row { display: flex; align-items: center; } ' +
            '.rpg-stat-lbl { width: 35px; font-weight: bold; color: #888; } ' +
            '.rpg-stat-val { width: 30px; text-align: right; margin-right: 8px; font-weight: bold; color: #fff; } ' +
            '.rpg-stat-bar-bg { flex: 1; height: 8px; background: #222; border: 1px solid #444; position: relative; } ' +
            '.rpg-stat-bar-fill { height: 100%; background: #555; transition: width 0.3s; } ' +
            
            '.rpg-stat-row.str .rpg-stat-bar-fill { background: #e74c3c; } ' +
            '.rpg-stat-row.int .rpg-stat-bar-fill { background: #3498db; } ' +
            '.rpg-stat-row.cha .rpg-stat-bar-fill { background: #f1c40f; } ' +
            '.rpg-stat-row.dex .rpg-stat-bar-fill { background: #2ecc71; } ' +
            '.rpg-stat-row.wis .rpg-stat-bar-fill { background: #9b59b6; } ' +
            '.rpg-stat-row.con .rpg-stat-bar-fill { background: #e67e22; } ' +
            
            '.rpg-add-btn { background: #333; color: #fff; border: 1px solid #666; border-radius: 4px; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-left: 8px; cursor: pointer; font-weight: bold; line-height: 1; transition: all 0.2s; } ' +
            '.rpg-add-btn:hover { background: #ffd700; color: #000; border-color: #ffd700; transform: scale(1.1); } ' +
            
            '.rpg-footer-bar { width: 100%; height: 15px; background: #222; border: 1px solid #444; position: relative; margin-top: 5px; } ' +
            '.rpg-footer-fill { height: 100%; background: {{XP_COLOR}}; } ' +
            '.rpg-footer-txt { position: absolute; top: -18px; right: 0; font-size: 0.8rem; color: #aaa; }';
            
        document.head.appendChild(s);
        
        var toast = document.createElement('div');
        toast.id = 'rpg-level-toast';
        toast.className = 'rpg-toast-overlay';
        toast.innerHTML = '<h1 class="rpg-toast-text">LEVEL UP!</h1><div class="rpg-toast-sub">+3 Stat Points</div>';
        document.body.appendChild(toast);
    }

    function injectHeader() {
        if (!window.ApiClient) return;
        var header = document.querySelector('.headerRight') || document.querySelector('.mainHeader .flex-direction-row');
        if (!header || document.getElementById('rpg-nav-btn')) return;

        var btn = document.createElement('div');
        btn.id = 'rpg-nav-btn';
        btn.className = 'rpg-nav-btn';
        btn.innerHTML = 
            '<div class="rpg-lvl-box" id="rpg-hdr-lvl">--</div>' +
            '<div class="rpg-nav-info">' +
                '<div class="rpg-nav-class" id="rpg-hdr-cls">Loading Sheet</div>' +
                '<div class="rpg-bar-bg"><div class="rpg-bar-fill" id="rpg-hdr-bar" style="width: 0%;"></div></div>' +
            '</div>';

        if (header.firstChild) header.insertBefore(btn, header.firstChild);
        else header.appendChild(btn);

        btn.addEventListener('click', openSheet);
        fetchSheet();
    }

    function fetchSheet() {
        var userId = window.ApiClient.getCurrentUserId();
        if (!userId) return;

        fetch('/JellyFrame/mods/' + MOD_ID + '/api/sheet?userId=' + userId)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                charData = data;
                var btn = document.getElementById('rpg-nav-btn');
                if (btn) btn.setAttribute('title', 'Realm: ' + data.realm);
                updateHeaderUI(data.level, data.pClass, data.progress);
                
                var modal = document.getElementById('rpg-modal');
                if (modal && modal.classList.contains('active')) renderSheet();
            }).catch(function(e) { console.error('RPG fetch failed', e); });
    }

    window.rpgAllocatePoint = function(stat) {
        var userId = window.ApiClient.getCurrentUserId();
        if (!userId) return;
        fetch('/JellyFrame/mods/' + MOD_ID + '/api/allocate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userId, stat: stat })
        }).then(function(res) { return res.json(); }).then(function(res) {
            if (res.ok) fetchSheet(); else console.error('Allocate error', res.error);
        });
    };

    if (window.ApiClient) {
        window.ApiClient.addEventListener('message', function(e, msg) {
            if (msg.MessageType === 'JellyFrameNotification' && msg.Data && msg.Data.type === 'JellyRPG_Update') {
                var d = msg.Data;
                fetchSheet(); 
                
                var btn = document.getElementById('rpg-nav-btn');
                var clsTxt = document.getElementById('rpg-hdr-cls');
                
                if (d.data.isLevelUp) {
                    var toast = document.getElementById('rpg-level-toast');
                    if (toast) {
                        toast.classList.add('show');
                        if (toastTimer) clearTimeout(toastTimer);
                        toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 4000);
                    }
                }

                if (btn && clsTxt) {
                    btn.classList.add('pulse');
                    clsTxt.innerText = d.body; 
                    updateHeaderUI(d.data.level, null, d.data.progress);
                    
                    if (animTimer) clearTimeout(animTimer);
                    animTimer = setTimeout(function() {
                        btn.classList.remove('pulse');
                        if (charData) clsTxt.innerText = charData.pClass;
                    }, 5000);
                }
            }
        });
    }

    function updateHeaderUI(lvl, pClass, progress) {
        var elLvl = document.getElementById('rpg-hdr-lvl');
        var elCls = document.getElementById('rpg-hdr-cls');
        var elBar = document.getElementById('rpg-hdr-bar');

        if (elLvl) elLvl.innerText = lvl;
        if (elCls && pClass) elCls.innerText = pClass;
        if (elBar) elBar.style.width = progress + '%';
    }

    function openSheet() {
        var modal = document.getElementById('rpg-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'rpg-modal';
            modal.className = 'rpg-modal';
            modal.innerHTML = '<div class="rpg-sheet" onclick="event.stopPropagation()"><button class="rpg-close material-icons" onclick="document.getElementById(\'rpg-modal\').classList.remove(\'active\')">close</button><div id="rpg-sheet-content"></div></div>';
            modal.addEventListener('click', function() { modal.classList.remove('active'); });
            document.body.appendChild(modal);
        }
        fetchSheet();
        setTimeout(renderSheet, 100); 
        modal.classList.add('active');
    }

    function getStatBarHtml(label, key, val, maxVal, cssClass, hasPts) {
        var pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        var addBtn = hasPts ? '<button class="rpg-add-btn" title="Allocate Point" onclick="window.rpgAllocatePoint(\'' + key + '\')">+</button>' : '';
        return '<div class="rpg-stat-row ' + cssClass + '">' +
                   '<div class="rpg-stat-lbl">' + label + '</div>' +
                   '<div class="rpg-stat-val">' + val + '</div>' +
                   '<div class="rpg-stat-bar-bg"><div class="rpg-stat-bar-fill" style="width: ' + pct + '%"></div></div>' +
                   addBtn +
               '</div>';
    }

    function renderSheet() {
        var content = document.getElementById('rpg-sheet-content');
        if (!charData || !charData.stats) return;
        
        var d = charData;
        var s = d.stats;
        var userId = window.ApiClient.getCurrentUserId();
        var imgUrl = window.ApiClient.getUserImageUrl(userId, { type: 'Primary' });

        var maxStat = Math.max(s.str, s.int, s.cha, s.dex, s.wis, s.con, 10); 
        var hasPts = d.availablePoints > 0;
        var ptsBanner = hasPts ? '<div class="rpg-pts-banner">UNSPENT STAT POINTS: ' + d.availablePoints + '</div>' : '';

        content.innerHTML = 
            '<div class="rpg-header">' +
                '<div class="rpg-portrait" style="background-image: url(\'' + imgUrl + '\')"></div>' +
                '<div>' +
                    '<h2 class="rpg-name">Player</h2>' +
                    '<div class="rpg-sub">LEVEL ' + d.level + ' ' + d.pClass + '</div>' +
                    '<div class="rpg-realm">' + d.realm + '</div>' +
                '</div>' +
            '</div>' +
            ptsBanner +
            '<div class="rpg-stats">' +
                getStatBarHtml('STR', 'str', s.str, maxStat, 'str', hasPts) +
                getStatBarHtml('DEX', 'dex', s.dex, maxStat, 'dex', hasPts) +
                getStatBarHtml('INT', 'int', s.int, maxStat, 'int', hasPts) +
                getStatBarHtml('WIS', 'wis', s.wis, maxStat, 'wis', hasPts) +
                getStatBarHtml('CHA', 'cha', s.cha, maxStat, 'cha', hasPts) +
                getStatBarHtml('CON', 'con', s.con, maxStat, 'con', hasPts) +
            '</div>' +
            '<div style="margin-top: 1rem;">' +
                '<div style="font-weight:bold; color:#888; font-size:0.8rem;">EXPERIENCE POINTS</div>' +
                '<div class="rpg-footer-bar">' +
                    '<div class="rpg-footer-fill" style="width: ' + d.progress + '%"></div>' +
                    '<div class="rpg-footer-txt">' + d.xp.toLocaleString() + ' / ' + d.nextXp.toLocaleString() + '</div>' +
                '</div>' +
            '</div>';
    }

    injectStyles();
    setInterval(injectHeader, 2000);

})();

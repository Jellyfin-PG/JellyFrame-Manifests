// Runs in the browser. Renders the interactive tabs, tooltips, and prestige mechanic.
// Strictly ES5 compliant.

(function() {
    var MOD_ID = 'jelly-rpg';
    var charData = null;
    var animTimer = null;
    var toastTimer = null;
    var activeTab = 'character';
    
    function injectStyles() {
        if (document.getElementById('rpg-css')) return;
        var s = document.createElement('style');
        s.id = 'rpg-css';
        s.innerHTML = 
            '.rpg-nav-btn { position: relative; display: flex; align-items: center; justify-content: center; background: transparent; margin-right: 15px; cursor: pointer; transition: transform 0.2s; user-select: none; width: 42px; height: 42px; } ' +
            '.rpg-nav-btn:hover { transform: scale(1.05); } ' +
            '.rpg-nav-btn.pulse { transform: scale(1.15); } ' +
            '.rpg-ring-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: visible; } ' +
            '.rpg-ring-bg { fill: none; stroke: rgba(128,128,128,0.4); stroke-width: 3.5; stroke-linecap: round; stroke-dasharray: 75, 100; transform: rotate(135deg); transform-origin: 50% 50%; } ' +
            '.rpg-ring-fill { fill: none; stroke: {{XP_COLOR}}; stroke-width: 3.5; stroke-linecap: round; transform: rotate(135deg); transform-origin: 50% 50%; transition: stroke-dasharray 0.5s ease-out; } ' +
            '.rpg-hdr-lvl { color: {{XP_COLOR}}; font-weight: 900; font-size: 1.1rem; line-height: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.6); position: relative; z-index: 2; margin-top: -2px; } ' +
            '.rpg-nav-btn.pulse .rpg-hdr-lvl { text-shadow: 0 0 12px {{XP_COLOR}}; } ' +
            '.rpg-xp-float { position: absolute; top: -10px; color: {{XP_COLOR}}; font-weight: bold; font-size: 0.8rem; pointer-events: none; opacity: 1; transform: translateY(-20px); transition: all 1.5s ease-out; text-shadow: 0 1px 3px rgba(0,0,0,0.8); z-index: 100; white-space: nowrap; } ' +
            '.rpg-xp-float.fade { opacity: 0; transform: translateY(-40px); } ' +
            
            '.rpg-toast-overlay { position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%) scale(0.5); opacity: 0; pointer-events: none; z-index: 999999; text-align: center; transition: all 0.5s; } ' +
            '.rpg-toast-overlay.show { opacity: 1; transform: translate(-50%, -50%) scale(1); } ' +
            '.rpg-toast-text { font-size: 4rem; font-weight: 900; color: {{LEVEL_UP_COLOR}}; text-transform: uppercase; text-shadow: 0 5px 20px rgba(0,0,0,0.8), 0 0 30px {{LEVEL_UP_COLOR}}; margin: 0; } ' +
            '.rpg-toast-sub { font-size: 1.5rem; color: #fff; background: rgba(0,0,0,0.8); padding: 5px 20px; border-radius: 20px; display: inline-block; margin-top: 10px; border: 2px solid {{LEVEL_UP_COLOR}}; } ' +
            
            '.rpg-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; font-family: monospace; } ' +
            '.rpg-modal.active { opacity: 1; pointer-events: auto; } ' +
            '.rpg-sheet { background-color: #111; background-position: center; background-repeat: repeat; width: 450px; border-radius: 8px; padding: 1.5rem; border: 2px solid {{XP_COLOR}}; box-shadow: 0 0 30px rgba(0,0,0,0.7); position: relative; transform: scale(0.95); transition: transform 0.2s; color: #fff; display: flex; flex-direction: column; max-height: 90vh; } ' +
            '.rpg-modal.active .rpg-sheet { transform: scale(1); } ' +
            '.rpg-close { position: absolute; top: 10px; right: 10px; background: none; border: none; color: #666; cursor: pointer; padding: 5px; } ' +
            '.rpg-close:hover { color: {{XP_COLOR}}; } ' +
            
            '.rpg-tabs { display: flex; border-bottom: 1px solid #333; margin-bottom: 1.5rem; } ' +
            '.rpg-tab-btn { flex: 1; background: transparent; border: none; color: #888; padding: 10px; cursor: pointer; font-family: inherit; font-size: 1rem; font-weight: bold; border-bottom: 3px solid transparent; transition: all 0.2s; } ' +
            '.rpg-tab-btn:hover { color: #fff; } ' +
            '.rpg-tab-btn.active { color: {{XP_COLOR}}; border-bottom-color: {{XP_COLOR}}; } ' +
            '.rpg-tab-content { overflow-y: auto; padding-right: 5px; } ' +
            '.rpg-tab-content::-webkit-scrollbar { width: 6px; } ' +
            '.rpg-tab-content::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; } ' +
            
            '.rpg-header { display: flex; align-items: center; margin-bottom: 1rem; position: relative; } ' +
            '.rpg-portrait { width: 70px; height: 70px; border-radius: 4px; border: 2px solid #555; background-size: cover; margin-right: 1.2rem; } ' +
            '.rpg-name { font-size: 1.4rem; font-weight: bold; text-transform: uppercase; margin: 0 0 2px 0; color: {{XP_COLOR}}; display: flex; align-items: center; gap: 8px; } ' +
            '.rpg-prestige-badge { background: linear-gradient(45deg, #ffd700, #ff8c00); color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; font-weight: 900; } ' +
            '.rpg-sub { font-size: 0.85rem; color: #aaa; margin-bottom: 6px; } ' +
            '.rpg-realm { display: inline-block; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; color: #ddd; } ' +
            '.rpg-realm::before { content: "Realm: "; color: #888; } ' +
            
            '.rpg-pts-banner { background: rgba(255, 215, 0, 0.15); color: #ffd700; padding: 10px; text-align: center; border-radius: 4px; margin-bottom: 1rem; font-weight: bold; border: 1px dashed #ffd700; animation: rpgPulse 2s infinite; } ' +
            '@keyframes rpgPulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } } ' +
            
            '.rpg-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 1rem; } ' +
            '.rpg-stat-row { display: flex; align-items: center; } ' +
            '.rpg-stat-lbl { width: 65px; font-weight: bold; color: #888; display: flex; align-items: center; gap: 4px; cursor: help; } ' +
            '.rpg-stat-val { width: 25px; text-align: right; margin-right: 8px; font-weight: bold; color: #fff; } ' +
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
            
            '.rpg-prestige-btn { width: 100%; background: linear-gradient(to right, #ffd700, #ff8c00); color: #000; border: none; padding: 10px; border-radius: 4px; font-weight: 900; font-size: 1.1rem; cursor: pointer; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px; transition: transform 0.2s; } ' +
            '.rpg-prestige-btn:hover { transform: scale(1.02); } ' +
            
            '.rpg-banner-select { width: 100%; background: #222; color: #fff; border: 1px solid #444; padding: 8px; border-radius: 4px; margin-top: 10px; margin-bottom: 15px; font-family: monospace; outline: none; } ' +
            
            '.rpg-footer-bar { width: 100%; height: 12px; background: #222; border: 1px solid #444; position: relative; margin-top: 5px; border-radius: 6px; overflow: hidden; } ' +
            '.rpg-footer-fill { height: 100%; background: {{XP_COLOR}}; } ' +
            '.rpg-footer-txt { position: absolute; top: -16px; right: 0; font-size: 0.75rem; color: #aaa; }';
            
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
            '<svg viewBox="0 0 36 36" class="rpg-ring-svg">' +
                '<circle class="rpg-ring-bg" cx="18" cy="18" r="15.915"></circle>' +
                '<circle class="rpg-ring-fill" id="rpg-hdr-bar" cx="18" cy="18" r="15.915" style="stroke-dasharray: 0, 100;"></circle>' +
            '</svg>' +
            '<div class="rpg-hdr-lvl" id="rpg-hdr-lvl">--</div>';

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
                if (btn) btn.setAttribute('title', data.pClass + ' • ' + data.realm);
                updateHeaderUI(data.level, data.progress);
                if (document.getElementById('rpg-modal') && document.getElementById('rpg-modal').classList.contains('active')) {
                    renderTabContent();
                }
            }).catch(function(e) { console.error('RPG fetch failed', e); });
    }

    window.rpgSwitchTab = function(tab) {
        activeTab = tab;
        document.getElementById('rpg-tab-char').classList.toggle('active', tab === 'character');
        document.getElementById('rpg-tab-quests').classList.toggle('active', tab === 'quests');
        renderTabContent();
    };

    window.rpgAllocatePoint = function(stat) {
        var userId = window.ApiClient.getCurrentUserId();
        if (!userId) return;
        fetch('/JellyFrame/mods/' + MOD_ID + '/api/allocate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userId, stat: stat })
        }).then(function(res) { return res.json(); }).then(function(res) {
            if (res.ok) fetchSheet();
        });
    };

    window.rpgPrestige = function() {
        if (!confirm("Are you sure you want to Prestige?\n\nThis resets your Level and Stats to 1, but grants a permanent +10% XP Multiplier per rank and a prestigious badge next to your name. Trophies and History are kept.")) return;
        var userId = window.ApiClient.getCurrentUserId();
        fetch('/JellyFrame/mods/' + MOD_ID + '/api/prestige', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userId })
        }).then(function(res) { return res.json(); }).then(function(res) {
            if (res.ok) { fetchSheet(); alert("You have Prestiged! Glory awaits."); }
        });
    };

    window.rpgEquipBanner = function(bannerId) {
        var userId = window.ApiClient.getCurrentUserId();
        fetch('/JellyFrame/mods/' + MOD_ID + '/api/equip_banner', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: userId, bannerId: bannerId })
        }).then(function(res) { return res.json(); }).then(function(res) {
            if (res.ok) fetchSheet();
        });
    };

    if (window.ApiClient) {
        window.ApiClient.addEventListener('message', function(e, msg) {
            if (msg.MessageType === 'JellyFrameNotification' && msg.Data && msg.Data.type === 'JellyRPG_Update') {
                var d = msg.Data;
                fetchSheet(); 
                var btn = document.getElementById('rpg-nav-btn');
                
                if (d.data.isLevelUp) {
                    var toast = document.getElementById('rpg-level-toast');
                    if (toast) {
                        toast.classList.add('show');
                        if (toastTimer) clearTimeout(toastTimer);
                        toastTimer = setTimeout(function() { toast.classList.remove('show'); }, 4000);
                    }
                }
                if (btn) {
                    btn.classList.add('pulse');
                    var floater = document.createElement('div');
                    floater.className = 'rpg-xp-float';
                    floater.innerText = d.body;
                    btn.appendChild(floater);
                    void floater.offsetWidth;
                    floater.classList.add('fade');
                    setTimeout(function() { if (floater.parentNode) floater.parentNode.removeChild(floater); }, 1500);
                    updateHeaderUI(d.data.level, d.data.progress);
                    if (animTimer) clearTimeout(animTimer);
                    animTimer = setTimeout(function() { btn.classList.remove('pulse'); }, 5000);
                }
            }
        });
    }

    function updateHeaderUI(lvl, progress) {
        var elLvl = document.getElementById('rpg-hdr-lvl');
        var elBar = document.getElementById('rpg-hdr-bar');
        if (elLvl) elLvl.innerText = lvl;
        if (elBar) elBar.style.strokeDasharray = (progress * 0.75).toFixed(2) + ', 100';
    }

    function openSheet() {
        var modal = document.getElementById('rpg-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'rpg-modal';
            modal.className = 'rpg-modal';
            modal.innerHTML = 
                '<div class="rpg-sheet" onclick="event.stopPropagation()">' +
                    '<button class="rpg-close material-icons" onclick="document.getElementById(\'rpg-modal\').classList.remove(\'active\')">close</button>' +
                    '<div class="rpg-tabs">' +
                        '<button id="rpg-tab-char" class="rpg-tab-btn active" onclick="window.rpgSwitchTab(\'character\')">Character</button>' +
                        '<button id="rpg-tab-quests" class="rpg-tab-btn" onclick="window.rpgSwitchTab(\'quests\')">Quests & Trophies</button>' +
                    '</div>' +
                    '<div id="rpg-tab-content" class="rpg-tab-content"></div>' +
                '</div>';
            modal.addEventListener('click', function() { modal.classList.remove('active'); });
            document.body.appendChild(modal);
        }
        fetchSheet();
        setTimeout(renderTabContent, 100); 
        modal.classList.add('active');
    }

    function getStatBarHtml(icon, label, tooltip, key, val, maxVal, cssClass, hasPts) {
        var pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        var addBtn = hasPts ? '<button class="rpg-add-btn" title="Allocate Point" onclick="window.rpgAllocatePoint(\'' + key + '\')">+</button>' : '';
        return '<div class="rpg-stat-row ' + cssClass + '">' +
                   '<div class="rpg-stat-lbl" title="' + tooltip + '"><span>' + icon + '</span> ' + label + '</div>' +
                   '<div class="rpg-stat-val">' + val + '</div>' +
                   '<div class="rpg-stat-bar-bg"><div class="rpg-stat-bar-fill" style="width: ' + pct + '%"></div></div>' +
                   addBtn +
               '</div>';
    }

    function romanize(num) {
        var lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1}, roman = '', i;
        for (i in lookup) { while (num >= lookup[i]) { roman += i; num -= lookup[i]; } }
        return roman;
    }

    var BANNER_SVGS = {
        'default': 'none',
        'iron_hex': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'28\' height=\'49\' viewBox=\'0 0 28 49\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg id=\'hexagons\' fill=\'%23ffffff\' fill-opacity=\'0.03\' fill-rule=\'nonzero\'%3E%3Cpath d=\'M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.31zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        'arcane_runes': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg fill=\'%238a2be2\' fill-opacity=\'0.05\'%3E%3Cpath opacity=\'.5\' d=\'M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z\'/%3E%3Cpath d=\'M6 5V0H5v5H0v1h5v94h1V6h94V5H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        'prestige_gold': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Cg fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffd700\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        'obsidian_matrix': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 8 8\'%3E%3Cg fill=\'%23ff0000\' fill-opacity=\'0.1\'%3E%3Cpath fill-rule=\'evenodd\' d=\'M0 0h4v4H0V0zm4 4h4v4H4V4z\'/%3E%3C/g%3E%3C/svg%3E")'
    };

    var BANNER_NAMES = {
        'default': 'None',
        'iron_hex': 'Iron Hexagons (Lv. 25)',
        'arcane_runes': 'Arcane Runes (Lv. 50)',
        'prestige_gold': 'Golden Valor (Prestige 1)',
        'obsidian_matrix': 'Obsidian Matrix (Prestige 2)'
    };

    function renderTabContent() {
        var content = document.getElementById('rpg-tab-content');
        if (!charData) return;
        var d = charData;
        
        var sheetEl = document.querySelector('.rpg-sheet');
        if (sheetEl) {
            sheetEl.style.backgroundImage = BANNER_SVGS[d.equippedBanner] || 'none';
        }

        if (activeTab === 'character') {
            var userId = window.ApiClient.getCurrentUserId();
            var imgUrl = window.ApiClient.getUserImageUrl(userId, { type: 'Primary' });
            var maxStat = Math.max(d.stats.str, d.stats.int, d.stats.cha, d.stats.dex, d.stats.wis, d.stats.con, 10); 
            var hasPts = d.availablePoints > 0;
            var ptsBanner = hasPts ? '<div class="rpg-pts-banner">UNSPENT STAT POINTS: ' + d.availablePoints + '</div>' : '';
            var presBadge = d.prestige > 0 ? '<span class="rpg-prestige-badge" title="Prestige Rank ' + d.prestige + ' (+' + (d.prestige*10) + '% XP)">' + romanize(d.prestige) + '</span>' : '';

            var html = 
                '<div class="rpg-header">' +
                    '<div class="rpg-portrait" style="background-image: url(\'' + imgUrl + '\')"></div>' +
                    '<div>' +
                        '<h2 class="rpg-name">Player ' + presBadge + '</h2>' +
                        '<div class="rpg-sub">LEVEL ' + d.level + ' ' + d.pClass + '</div>' +
                        '<div class="rpg-realm">' + d.realm + '</div>' +
                    '</div>' +
                '</div>' +
                ptsBanner +
                '<div class="rpg-stats">' +
                    getStatBarHtml('⚔️', 'STR', 'Governs Action, Adventure, and War', 'str', d.stats.str, maxStat, 'str', hasPts) +
                    getStatBarHtml('🏹', 'DEX', 'Governs Animation, Family, and Kids', 'dex', d.stats.dex, maxStat, 'dex', hasPts) +
                    getStatBarHtml('🧠', 'INT', 'Governs Sci-Fi, Mystery, and Documentary', 'int', d.stats.int, maxStat, 'int', hasPts) +
                    getStatBarHtml('📜', 'WIS', 'Governs Drama, History, and Fantasy', 'wis', d.stats.wis, maxStat, 'wis', hasPts) +
                    getStatBarHtml('🎭', 'CHA', 'Governs Comedy, Romance, and Music', 'cha', d.stats.cha, maxStat, 'cha', hasPts) +
                    getStatBarHtml('🛡️', 'CON', 'Governs Horror and Suspense', 'con', d.stats.con, maxStat, 'con', hasPts) +
                '</div>' +
                '<div style="margin-top: 1rem;">' +
                    '<div style="font-weight:bold; color:#888; font-size:0.8rem;">EXPERIENCE POINTS</div>' +
                    '<div class="rpg-footer-bar">' +
                        '<div class="rpg-footer-fill" style="width: ' + d.progress + '%"></div>' +
                        '<div class="rpg-footer-txt">' + d.xp.toLocaleString() + ' / ' + d.nextXp.toLocaleString() + '</div>' +
                    '</div>' +
                '</div>';
            
            if (d.level >= 100) {
                html += '<button class="rpg-prestige-btn" onclick="window.rpgPrestige()">★ Prestige ★</button>';
            }

            content.innerHTML = html;
        } 
        else if (activeTab === 'quests') {
            var html = '<h3 style="margin-top:0; color:{{XP_COLOR}};">Daily Bounties</h3>';
            if (d.quests && d.quests.tasks && d.quests.tasks.length > 0) {
                for(var i=0; i<d.quests.tasks.length; i++) {
                    var q = d.quests.tasks[i];
                    var pct = Math.min((q.progress / q.goal) * 100, 100);
                    var color = q.done ? '#2ecc71' : '{{XP_COLOR}}';
                    html += '<div style="background:rgba(0,0,0,0.4); padding:10px; border-radius:6px; margin-bottom:10px; border-left: 3px solid ' + color + ';">' +
                            '<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>' + q.desc + '</span><span style="color:#aaa;">' + q.progress + '/' + q.goal + '</span></div>' +
                            '<div style="width:100%; height:4px; background:#222; border-radius:2px; overflow:hidden;"><div style="height:100%; width:' + pct + '%; background:' + color + ';"></div></div>' +
                            '</div>';
                }
            }
            
            html += '<h3 style="margin-top:1.5rem; color:{{XP_COLOR}}; margin-bottom:0.5rem;">Profile Banner</h3>';
            html += '<select class="rpg-banner-select" onchange="window.rpgEquipBanner(this.value)">';
            for(var b=0; b<d.unlockedBanners.length; b++) {
                var bid = d.unlockedBanners[b];
                var sel = (d.equippedBanner === bid) ? 'selected' : '';
                html += '<option value="' + bid + '" ' + sel + '>' + (BANNER_NAMES[bid] || bid) + '</option>';
            }
            html += '</select>';
            
            html += '<h3 style="margin-top:1.5rem; color:{{XP_COLOR}};">Trophy Case</h3>';
            if (d.achievements && d.achievements.length > 0) {
                html += '<div style="display:flex; flex-wrap:wrap; gap:8px;">';
                for(var j=0; j<d.achievements.length; j++) {
                    html += '<span style="background:rgba(255,215,0,0.1); border:1px solid #ffd700; color:#ffd700; padding:4px 10px; border-radius:12px; font-size:0.75rem;">🏆 ' + d.achievements[j] + '</span>';
                }
                html += '</div>';
            } else {
                html += '<div style="color:#888; font-size:0.9rem;">Keep watching media to unlock Trophies and massive XP rewards!</div>';
            }
            content.innerHTML = html;
        }
    }

    injectStyles();
    setInterval(injectHeader, 2000);

})();

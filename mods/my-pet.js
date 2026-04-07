(function () {
    'use strict';

    if (window.__jfVirtualPetLoaded) return;
    window.__jfVirtualPetLoaded = true;

    var APP_ID = 'jf-pet-app';
    var PREF_KEY = 'JellyPetState';
    
    var state = {
        active: false,
        type: '🐶',
        name: 'My Pet',
        hunger: 100,
        happy: 100,
        clean: 100,
        poops: 0,
        poopProgress: 0,
        lastUpdate: Date.now()
    };

    var PET_TYPES = ['🐶', '🐱', '🐰', '🦊', '🐧', '🐉', '👽'];

    var PetStore = {
        load: function(cb) {
            if (!window.ApiClient) { cb(false); return; }
            var userId = ApiClient.getCurrentUserId();
            var token = ApiClient.accessToken();
            var serverUrl = ApiClient.serverAddress();

            if (!userId || !token) { cb(false); return; }

            fetch(serverUrl + '/DisplayPreferences/' + PREF_KEY + '?userId=' + userId + '&client=web', {
                headers: { 'X-Emby-Authorization': 'MediaBrowser Token="' + token + '"' }
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data.CustomPrefs && data.CustomPrefs.State) {
                    var saved = JSON.parse(data.CustomPrefs.State);
                    for (var key in saved) { state[key] = saved[key]; }
                    cb(true);
                } else {
                    cb(false);
                }
            })
            .catch(function() { cb(false); });
        },
        
        save: function() {
            if (!window.ApiClient) return;
            var userId = ApiClient.getCurrentUserId();
            var token = ApiClient.accessToken();
            var serverUrl = ApiClient.serverAddress();

            if (!userId || !token) return;
            
            fetch(serverUrl + '/DisplayPreferences/' + PREF_KEY + '?userId=' + userId + '&client=web', {
                headers: { 'X-Emby-Authorization': 'MediaBrowser Token="' + token + '"' }
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data) data = { CustomPrefs: {} };
                if (!data.CustomPrefs) data.CustomPrefs = {};
                
                data.CustomPrefs.State = JSON.stringify(state);
                data.Id = PREF_KEY;
                
                return fetch(serverUrl + '/DisplayPreferences/' + PREF_KEY + '?userId=' + userId + '&client=web', {
                    method: 'POST',
                    headers: { 
                        'X-Emby-Authorization': 'MediaBrowser Token="' + token + '"',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
            });
        }
    };

    var PetEngine = {
        calculateDecay: function() {
            var now = Date.now();
            var diffMs = now - state.lastUpdate;
            var diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours <= 0) return;

            state.hunger = Math.max(0, state.hunger - (diffHours * 80));
            state.happy = Math.max(0, state.happy - (diffHours * 50));
            
            state.clean = Math.max(0, state.clean - (diffHours * 30));

            state.poopProgress = (state.poopProgress || 0) + diffHours;
            var newPoops = Math.floor(state.poopProgress / 0.5);
            if (newPoops > 0) {
                state.poops = Math.min(5, state.poops + newPoops);
                state.poopProgress -= (newPoops * 0.5);
            }

            if (state.poops > 0) {
                state.clean = Math.max(0, state.clean - (diffHours * 40 * state.poops));
            }
            
            if (state.hunger < 30) state.happy = Math.max(0, state.happy - (diffHours * 30));
            if (state.clean < 30) state.happy = Math.max(0, state.happy - (diffHours * 30));

            state.lastUpdate = now;
        },

        feed: function() {
            this.calculateDecay();
            if (state.hunger >= 100) return;
            state.hunger = Math.min(100, state.hunger + 35);
            state.clean = Math.max(0, state.clean - 2);
            PetUI.animate('eat');
            PetUI.spawnParticle('🍖');
            this.triggerSave();
        },

        play: function() {
            this.calculateDecay();
            if (state.happy >= 100) return;
            state.happy = Math.min(100, state.happy + 30);
            state.hunger = Math.max(0, state.hunger - 10);
            state.clean = Math.max(0, state.clean - 5);
            PetUI.animate('jump');
            PetUI.spawnParticle('🎾');
            this.triggerSave();
        },

        pet: function() {
            this.calculateDecay();
            if (state.happy >= 100) return;
            state.happy = Math.min(100, state.happy + 15);
            PetUI.animate('bounce');
            PetUI.spawnParticle('❤️');
            this.triggerSave();
        },

        clean: function() {
            this.calculateDecay();
            if (state.poops === 0 && state.clean >= 100) return;
            state.poops = 0;
            state.clean = 100;
            state.happy = Math.max(0, state.happy - 15);
            PetUI.animate('bounce');
            PetUI.spawnParticle('✨');
            this.triggerSave();
        },

        triggerSave: function() {
            PetUI.updateBars();
            PetUI.renderStage();
            PetStore.save();
        }
    };

    var PetUI = {
        injectCSS: function() {
            if (document.getElementById('jf-pet-styles')) return;
            var style = document.createElement('style');
            style.id = 'jf-pet-styles';
            style.textContent = [
                "#" + APP_ID + " { display: flex; flex-direction: column; height: 100%; min-height: 300px; }",
                ".jf-pet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }",
                ".jf-pet-name { font-size: 1.3rem; font-weight: bold; color: #fff; margin: 0; }",
                ".jf-pet-stats { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }",
                ".jf-pet-stat-row { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 600; color: #ccc; }",
                ".jf-pet-stat-label { width: 60px; text-transform: uppercase; letter-spacing: 0.05em; }",
                ".jf-pet-bar-bg { flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }",
                ".jf-pet-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease, background 0.3s ease; }",
                
                ".jf-pet-stage { flex: 1; background: linear-gradient(to bottom, rgba(0,164,220,0.1) 0%, rgba(20,20,20,0.4) 100%); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 120px; cursor: pointer; }",
                ".jf-pet-char { font-size: 5rem; user-select: none; transition: filter 0.3s; z-index: 10; position: relative; }",
                ".jf-pet-char.sad { filter: grayscale(0.8) brightness(0.8); transform: scaleY(0.9) translateY(5px); }",
                
                ".jf-pet-poop { font-size: 1.5rem; position: absolute; bottom: 10px; user-select: none; }",
                ".jf-pet-particle { position: absolute; font-size: 1.5rem; pointer-events: none; animation: floatUp 1s ease-out forwards; z-index: 20; }",
                
                ".jf-pet-controls { display: flex; gap: 10px; margin-top: 15px; justify-content: center; flex-wrap: wrap; }",
                ".jf-pet-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 0.9rem; transition: 0.2s; display: flex; align-items: center; gap: 6px; }",
                ".jf-pet-btn:hover { background: #00a4dc; border-color: #00a4dc; transform: translateY(-2px); }",
                
                ".jf-pet-setup { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; gap: 20px; }",
                ".jf-pet-grid { display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; }",
                ".jf-pet-choice { font-size: 3rem; cursor: pointer; padding: 10px; border-radius: 16px; background: rgba(255,255,255,0.05); transition: 0.2s; }",
                ".jf-pet-choice:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }",

                "@keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-50px) scale(1.5); } }",
                "@keyframes petJump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }",
                "@keyframes petEat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2, 0.8); } }",
                "@keyframes petBounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }",
                
                ".anim-jump { animation: petJump 0.4s ease-in-out; }",
                ".anim-eat { animation: petEat 0.3s ease-in-out 2; }",
                ".anim-bounce { animation: petBounce 0.3s ease-in-out; }"
            ].join('\n');
            document.head.appendChild(style);
        },

        buildContainer: function(target) {
            if (document.getElementById(APP_ID)) return null;
            var app = document.createElement('div');
            app.id = APP_ID;
            app.className = 'app col-12';
            target.appendChild(app);
            return app;
        },

        renderSetup: function(container) {
            container.innerHTML = '';
            var setup = document.createElement('div');
            setup.className = 'jf-pet-setup';
            
            var title = document.createElement('h3');
            title.textContent = 'Adopt a Pet';
            title.style.margin = '0';
            setup.appendChild(title);

            var grid = document.createElement('div');
            grid.className = 'jf-pet-grid';
            
            PET_TYPES.forEach(function(emoji) {
                var btn = document.createElement('div');
                btn.className = 'jf-pet-choice';
                btn.textContent = emoji;
                btn.onclick = function(e) {
                    e.stopPropagation();
                    state.active = true;
                    state.type = emoji;
                    state.hunger = 100; state.happy = 100; state.clean = 100; state.poops = 0;
                    state.lastUpdate = Date.now();
                    PetStore.save();
                    PetUI.renderMain(container);
                };
                grid.appendChild(btn);
            });

            setup.appendChild(grid);
            container.appendChild(setup);
        },

        renderMain: function(container) {
            container.innerHTML = [
                '<div class="jf-pet-header">',
                '  <h3 class="jf-pet-name">' + state.name + '</h3>',
                '</div>',
                '<div class="jf-pet-stats">',
                '  <div class="jf-pet-stat-row"><div class="jf-pet-stat-label">Food</div><div class="jf-pet-bar-bg"><div id="jf-pet-bar-food" class="jf-pet-bar-fill"></div></div></div>',
                '  <div class="jf-pet-stat-row"><div class="jf-pet-stat-label">Happy</div><div class="jf-pet-bar-bg"><div id="jf-pet-bar-happy" class="jf-pet-bar-fill"></div></div></div>',
                '  <div class="jf-pet-stat-row"><div class="jf-pet-stat-label">Clean</div><div class="jf-pet-bar-bg"><div id="jf-pet-bar-clean" class="jf-pet-bar-fill"></div></div></div>',
                '</div>',
                '<div id="jf-pet-stage" class="jf-pet-stage">',
                '  <div id="jf-pet-char" class="jf-pet-char">' + state.type + '</div>',
                '</div>',
                '<div class="jf-pet-controls">',
                '  <button id="jf-pet-btn-pet" class="jf-pet-btn">👋 Pet</button>',
                '  <button id="jf-pet-btn-feed" class="jf-pet-btn">🍖 Feed</button>',
                '  <button id="jf-pet-btn-play" class="jf-pet-btn">🎾 Play</button>',
                '  <button id="jf-pet-btn-clean" class="jf-pet-btn">🧹 Clean</button>',
                '</div>'
            ].join('\n');

            var stage = document.getElementById('jf-pet-stage');
            stage.onclick = function(e) { e.stopPropagation(); PetEngine.pet(); };
            
            var btnPet = document.getElementById('jf-pet-btn-pet');
            if (btnPet) btnPet.onclick = function(e) { e.stopPropagation(); PetEngine.pet(); };

            var btnFeed = document.getElementById('jf-pet-btn-feed');
            if (btnFeed) btnFeed.onclick = function(e) { e.stopPropagation(); PetEngine.feed(); };

            var btnPlay = document.getElementById('jf-pet-btn-play');
            if (btnPlay) btnPlay.onclick = function(e) { e.stopPropagation(); PetEngine.play(); };

            var btnClean = document.getElementById('jf-pet-btn-clean');
            if (btnClean) btnClean.onclick = function(e) { e.stopPropagation(); PetEngine.clean(); };

            this.updateBars();
            this.renderStage();
        },

        getBarColor: function(val) {
            if (val > 60) return '#4ade80';
            if (val > 25) return '#facc15';
            return '#f87171';
        },

        updateBars: function() {
            var food = document.getElementById('jf-pet-bar-food');
            var happy = document.getElementById('jf-pet-bar-happy');
            var clean = document.getElementById('jf-pet-bar-clean');

            if (food) { food.style.width = state.hunger + '%'; food.style.backgroundColor = this.getBarColor(state.hunger); }
            if (happy) { happy.style.width = state.happy + '%'; happy.style.backgroundColor = this.getBarColor(state.happy); }
            if (clean) { clean.style.width = state.clean + '%'; clean.style.backgroundColor = this.getBarColor(state.clean); }
            
            var char = document.getElementById('jf-pet-char');
            if (char) {
                if (state.hunger < 30 || state.happy < 30 || state.clean < 30) {
                    char.classList.add('sad');
                } else {
                    char.classList.remove('sad');
                }
            }
        },

        renderStage: function() {
            var stage = document.getElementById('jf-pet-stage');
            if (!stage) return;
            
            var existing = stage.querySelectorAll('.jf-pet-poop');
            existing.forEach(function(el) { el.remove(); });

            for (var i = 0; i < Math.floor(state.poops); i++) {
                var poop = document.createElement('div');
                poop.className = 'jf-pet-poop';
                poop.textContent = '💩';
                poop.style.left = (10 + (i * 20) + Math.random() * 10) + '%';
                stage.appendChild(poop);
            }
        },

        animate: function(animClass) {
            var char = document.getElementById('jf-pet-char');
            if (!char) return;
            char.classList.remove('anim-jump', 'anim-eat', 'anim-bounce');
            void char.offsetWidth;
            char.classList.add('anim-' + animClass);
        },

        spawnParticle: function(emoji) {
            var stage = document.getElementById('jf-pet-stage');
            if (!stage) return;
            var part = document.createElement('div');
            part.className = 'jf-pet-particle';
            part.textContent = emoji;
            part.style.left = 'calc(50% + ' + ((Math.random() * 40) - 20) + 'px)';
            part.style.top = '40%';
            stage.appendChild(part);
            setTimeout(function() { part.remove(); }, 1000);
        }
    };

    var timer = null;

    function startLoop() {
        if (timer) clearInterval(timer);
        timer = setInterval(function() {
            if (state.active) {
                PetEngine.calculateDecay();
                PetUI.updateBars();
                PetUI.renderStage();
                PetStore.save();
                
                if (Math.random() > 0.7 && state.happy > 30 && state.hunger > 30) {
                    PetUI.animate('bounce');
                    if (Math.random() > 0.5) PetUI.spawnParticle('✨');
                }
            }
        }, 10000);
    }

    function initApp() {
        var appArea = document.getElementById('app-area');
        if (!appArea) return;
        
        if (document.getElementById(APP_ID)) return;

        PetUI.injectCSS();
        var container = PetUI.buildContainer(appArea);

        PetStore.load(function(success) {
            if (success && state.active) {
                PetEngine.calculateDecay();
                PetUI.renderMain(container);
                PetStore.save();
            } else {
                PetUI.renderSetup(container);
            }
            startLoop();
        });
    }

    window.addEventListener('jfAppAreaReady', initApp);

    var checkGrid = function() {
        if (document.getElementById('app-area')) initApp();
    };
    document.addEventListener('viewshow', checkGrid);
    setTimeout(checkGrid, 1000);

})();

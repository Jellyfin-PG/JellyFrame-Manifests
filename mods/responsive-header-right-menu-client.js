// Responsive Header Dropdown Mod
// Moves crowded header icons into a slide-out "More Options" menu on small screens.
// Strictly ES5 compliant for JellyFrame compatibility. Highly optimized.

(function() {
    var MOBILE_BREAKPOINT = 800;
    var isProcessing = false;
    var lastChildCount = 0;
    var lastIsMobile = null;
    var resizeTimeout = null;
    
    function injectStyles() {
        if (document.getElementById('jf-resp-header-css')) return;
        var s = document.createElement('style');
        s.id = 'jf-resp-header-css';
        s.innerHTML = 
            '#jf-more-wrap { position: relative; display: none; align-items: center; margin-left: 5px; z-index: 99999; } ' +
            '@media (max-width: ' + MOBILE_BREAKPOINT + 'px) { #jf-more-wrap { display: flex; } } ' +
            
            '#jf-more-btn { background: transparent; border: none; color: inherit; cursor: pointer; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s; outline: none; } ' +
            '#jf-more-btn:hover { background: rgba(255,255,255,0.1); } ' +
            
            '#jf-more-menu { position: fixed; top: 70px; right: 15px; background: var(--lighterGradientPoint, var(--theme-background, #1a1a1a)); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); opacity: 0; pointer-events: none; transform: translateY(-10px); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); min-width: 220px; backdrop-filter: blur(10px); z-index: 999999 !important; max-height: calc(100vh - 90px); overflow-y: auto; overflow-x: hidden; } ' +
            '#jf-more-menu.open { opacity: 1; pointer-events: auto; transform: translateY(0); } ' +
            '#jf-more-menu::-webkit-scrollbar { width: 6px; } ' +
            '#jf-more-menu::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; } ' +
            
            '#jf-more-menu > * { display: flex !important; align-items: center !important; height: 48px !important; width: 100%; justify-content: flex-start !important; padding: 0 15px !important; margin: 0 !important; border-radius: 6px; box-sizing: border-box; flex-shrink: 0; } ' +
            '#jf-more-menu > *:hover { background: rgba(255,255,255,0.08); } ' +
            '#jf-more-menu .material-icons { margin-right: 15px; font-size: 1.3rem; } ' +
            
            '#jf-more-menu > .hide { display: none !important; } ' +
            '#jf-more-menu > .headerSelectedPlayer:empty { display: none !important; } ' +
            
            '#jf-more-menu .headerButton::after { content: attr(title); font-family: sans-serif; font-size: 1rem; font-weight: 500; white-space: nowrap; } ' +
            
            '#jf-more-menu #jf-header-ping { background: transparent; border: none; }';
            
        document.head.appendChild(s);
        
        document.addEventListener('click', function(e) {
            var btn = document.getElementById('jf-more-btn');
            var menu = document.getElementById('jf-more-menu');
            if (btn && menu && menu.classList.contains('open')) {
                if (!menu.contains(e.target) && !btn.contains(e.target)) {
                    menu.classList.remove('open');
                }
            }
        });
    }
    
    function manageResponsiveHeader() {
        if (isProcessing) return;
        
        var headerRight = document.querySelector('.headerRight') || document.querySelector('.mainHeader .flex-direction-row');
        if (!headerRight) return;
        
        var isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        var menu = document.getElementById('jf-more-menu');
        var wrap = document.getElementById('jf-more-wrap');
        
        var currentChildCount = headerRight.children.length + (menu ? menu.children.length : 0);
        if (wrap && lastIsMobile === isMobile && lastChildCount === currentChildCount) {
            return; 
        }
        
        isProcessing = true;
        
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'jf-more-wrap';
            wrap.innerHTML = '<button id="jf-more-btn" class="material-icons">more_vert</button>';
            headerRight.appendChild(wrap);
            
            menu = document.createElement('div');
            menu.id = 'jf-more-menu';
            document.body.appendChild(menu);
            
            document.getElementById('jf-more-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                menu.classList.toggle('open');
            });
        }
        
        var children = Array.prototype.slice.call(headerRight.children);
        var menuChildren = Array.prototype.slice.call(menu.children);
        
        function shouldCollapse(el) {
            if (el.id === 'jf-more-wrap' || el.id === 'jrpg-badge-wrap' || el.id === 'rpg-nav-btn') return false;
            
            if (el.classList && el.classList.contains('headerSearchButton')) return false;
            
            if (el.matches) {
                return el.matches('.headerButton, #jf-header-ping, .headerSelectedPlayer');
            }
            return false;
        }
        
        if (isMobile) {
            for (var i = 0; i < children.length; i++) {
                var el = children[i];
                if (shouldCollapse(el)) {
                    menu.appendChild(el);
                }
            }
        } else {
            for (var j = 0; j < menuChildren.length; j++) {
                var mel = menuChildren[j];
                headerRight.insertBefore(mel, wrap);
            }
            menu.classList.remove('open');
        }
        
        lastIsMobile = isMobile;
        lastChildCount = headerRight.children.length + menu.children.length;
        isProcessing = false;
    }
    
    injectStyles();
    
    setInterval(manageResponsiveHeader, 1000);
    
    window.addEventListener('resize', function() {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(manageResponsiveHeader, 100);
    });

})();

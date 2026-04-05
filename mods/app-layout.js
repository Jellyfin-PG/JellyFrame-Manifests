(function () {
    'use strict';

    var APP_AREA_ID = "app-area";
    var TARGET_SELECTOR = ".homeSectionsContainer, .home-sections, [data-role='page'].type-home .sections, #homeTab .sections";
    
    var sectionTitle = '{{SECTION_TITLE}}' || 'Apps';
    if (sectionTitle === '{{SECTION_TITLE}}') {
        sectionTitle = 'Apps';
    }

    var Core = {
        init: function(target) {
            if (document.getElementById('jf-app-wrapper')) return;
            
            this.injectCSS();
            this.buildDOM(target);
            
            var event;
            if (typeof CustomEvent === 'function') {
                event = new CustomEvent('jfAppAreaReady', { detail: { container: document.getElementById(APP_AREA_ID) } });
            } else {
                event = document.createEvent('CustomEvent');
                event.initCustomEvent('jfAppAreaReady', true, true, { container: document.getElementById(APP_AREA_ID) });
            }
            window.dispatchEvent(event);
        },
        
        injectCSS: function() {
            if (document.getElementById('jf-app-core-styles')) return;
            var style = document.createElement('style');
            style.id = 'jf-app-core-styles';
            
            var gridCols = '';
            for (var i = 1; i <= 12; i++) { 
                gridCols += "\n#" + APP_AREA_ID + " .col-" + i + " { grid-column: span " + i + " !important; width: auto !important; }"; 
            }
            
            style.textContent = [
                // Core Grid Styles
                "#" + APP_AREA_ID + "-wrapper { width: 100%; margin-top: 20px; }",
                ".jf-app-header { display: flex; justify-content: space-between; align-items: center; padding: 0 38px; margin-bottom: -15px; }",
                ".jf-app-title { color: #fff; font-size: 1.6rem; font-weight: 600; margin: 0; font-family: 'Inter', system-ui, sans-serif; letter-spacing: 0.5px; }",
                "#" + APP_AREA_ID + " { display: grid !important; grid-template-columns: repeat(12, 1fr) !important; gap: 20px !important; padding: 38px !important; width: 100% !important; box-sizing: border-box !important; position: relative; }",
                ".app { background: rgba(20, 20, 20, 0.6); backdrop-filter: blur(25px) saturate(1.4); -webkit-backdrop-filter: blur(25px) saturate(1.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 18px; padding: 24px; color: #fff; box-shadow: 0 12px 40px rgba(0,0,0,0.5); font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box !important; grid-column: span 12; min-width: 0; position: relative; transition: transform 0.2s, box-shadow 0.2s; z-index: 1; }",
                "@media (min-width: 720px) { " + gridCols + " }"
            ].join('\n');
            document.head.appendChild(style);
        },
        
        buildDOM: function(target) {
            var wrapper = document.createElement('div');
            wrapper.id = 'jf-app-wrapper';

            var header = document.createElement('div');
            header.className = 'jf-app-header';

            var title = document.createElement('h2');
            title.className = 'jf-app-title';
            title.textContent = sectionTitle;

            header.appendChild(title);

            var appArea = document.createElement('div');
            appArea.id = APP_AREA_ID;

            wrapper.appendChild(header);
            wrapper.appendChild(appArea);
            target.parentNode.insertBefore(wrapper, target);
        }
    };

    var findAndInject = function() {
        if (window.location.hash.indexOf('home') !== -1 || window.location.pathname === "/") {
            var target = document.querySelector(TARGET_SELECTOR);
            if (target) Core.init(target);
        }
    };

    new MutationObserver(findAndInject).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('viewshow', findAndInject);
    findAndInject();

})();

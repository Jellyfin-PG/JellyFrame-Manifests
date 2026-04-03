/**
 * Jellyfin App Framework - CORE
 * Injects the Grid Container and all CSS Sizing Rules.
 */
(function () {
    'use strict';

    const APP_AREA_ID = "app-area";
    const TARGET_SELECTOR = ".homeSectionsContainer, .home-sections, [data-role='page'].type-home .sections, #homeTab .sections";

    const generateGridCSS = () => {
        let styles = '';
        for (let i = 1; i <= 12; i++) {
            styles += `
                #${APP_AREA_ID} .col-${i} { 
                    grid-column: span ${i} !important; 
                    width: auto !important;
                }
            `;
        }
        return styles;
    };

    const CSS = `
        /* The Grid Parent */
        #${APP_AREA_ID} {
            display: grid !important;
            grid-template-columns: repeat(12, 1fr) !important;
            gap: 20px !important;
            padding: 38px !important; /* Your specific requirement */
            width: 100% !important;
            box-sizing: border-box !important;
        }

        /* The Base App Class (Visual Style) */
        .app {
            background: rgba(20, 20, 20, 0.6);
            backdrop-filter: blur(25px) saturate(1.4);
            -webkit-backdrop-filter: blur(25px) saturate(1.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 18px;
            padding: 24px;
            color: #fff;
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
            font-family: 'Inter', system-ui, sans-serif;
            box-sizing: border-box !important;
            grid-column: span 12; /* Mobile default */
            min-width: 0;
        }

        /* Responsive Sizing (Desktop Only) */
        @media (min-width: 720px) {
            ${generateGridCSS()}
        }

        /* Fix for Material Icons used by apps */
        .material-icons { font-family: 'Material Icons'; vertical-align: middle; }
    `;

    function injectFramework() {
        const target = document.querySelector(TARGET_SELECTOR);
        if (!target || document.getElementById(APP_AREA_ID)) return;

        if (!document.getElementById('jf-framework-styles')) {
            const style = document.createElement('style');
            style.id = 'jf-framework-styles';
            style.textContent = CSS;
            document.head.appendChild(style);
        }

        const appArea = document.createElement('div');
        appArea.id = APP_AREA_ID;
        target.parentNode.insertBefore(appArea, target);
        
        console.log("[Framework] Grid system injected.");
    }

    const run = () => {
        if (window.location.hash.includes('home') || window.location.pathname === "/") {
            let attempts = 0;
            const check = setInterval(() => {
                const target = document.querySelector(TARGET_SELECTOR);
                if (target) { clearInterval(check); injectFramework(); }
                if (attempts++ > 40) clearInterval(check);
            }, 250);
        }
    };

    window.addEventListener('hashchange', run);
    document.addEventListener('viewshow', run);
    run();
})();

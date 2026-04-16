(function () {
    'use strict';

    const PLUGIN_ID = 'jf-video-tuner';
    const MENU_ID = 'jf-tuner-menu';
    const SVG_ID = 'jf-tuner-svg';
    const BUTTON_ID = 'jf-video-tuner-btn';
    const STYLE_ID = 'jf-tuner-styles';

    function ensureSvgEngine() {
        if (document.getElementById(SVG_ID)) return;
        const svg = document.createElement('div');
        svg.id = SVG_ID;
        svg.style.cssText = 'position:absolute; width:0; height:0; overflow:hidden; pointer-events:none;';
        svg.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="jf-spatial-sharpen" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
                        <feConvolveMatrix 
                            id="jf-kernel" 
                            order="3" 
                            kernelMatrix="0 0 0 0 1 0 0 0 0" 
                            edgeMode="duplicate"
                            preserveAlpha="true"
                        />
                    </filter>
                </defs>
            </svg>`;
        document.body.appendChild(svg);
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${MENU_ID} {
                position: fixed;
                right: 16px;
                bottom: 140px;
                width: min(280px, calc(100vw - 32px));
                max-height: calc(100vh - 160px);
                overflow-y: auto;
                overflow-x: hidden;
                background: rgba(12, 12, 12, 0.95);
                border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                padding: 16px;
                border-radius: 12px;
                color: #eee;
                z-index: 2147483647;
                display: none;
                box-shadow: 0 -10px 40px rgba(0,0,0,0.6);
                font-family: sans-serif;
                font-size: 14px;
                opacity: 0;
                transform: translateY(10px);
                transition: opacity 0.2s, transform 0.2s;
                box-sizing: border-box;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.25) transparent;
            }
            #${MENU_ID}::-webkit-scrollbar { width: 6px; }
            #${MENU_ID}::-webkit-scrollbar-track { background: transparent; }
            #${MENU_ID}::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.25);
                border-radius: 3px;
            }
            #${MENU_ID} .jf-row { margin-bottom: 14px; }
            #${MENU_ID} .jf-row-head {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                color: #aaa;
                font-size: 12px;
                font-weight: 600;
            }
            #${MENU_ID} input[type="range"] {
                width: 100%;
                cursor: pointer;
                height: 4px;
                background: rgba(255,255,255,0.2);
                border-radius: 2px;
                appearance: none;
                -webkit-appearance: none;
                accent-color: #00a4dc;
                margin: 0;
                box-sizing: border-box;
            }
            #${MENU_ID} .jf-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            #${MENU_ID} .jf-header strong {
                color: #fff;
                font-size: 15px;
            }
            #${MENU_ID} .jf-close {
                cursor: pointer;
                font-size: 20px;
                padding: 0 8px;
                opacity: 0.7;
                line-height: 1;
                /* Bigger tap target on touch devices */
                min-width: 28px;
                text-align: center;
            }
            #${MENU_ID} .jf-divider {
                height: 1px;
                background: rgba(255,255,255,0.1);
                margin: 10px 0;
            }
            #${MENU_ID} .jf-reset {
                width: 100%;
                padding: 10px;
                background: rgba(255,255,255,0.1);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                margin-top: 5px;
                font-size: 12px;
                text-transform: uppercase;
                transition: background 0.2s;
                box-sizing: border-box;
            }
            #${MENU_ID} .jf-reset:hover,
            #${MENU_ID} .jf-reset:focus {
                background: rgba(255,255,255,0.2);
            }

            @media (max-height: 520px) {
                #${MENU_ID} {
                    bottom: 80px;
                    max-height: calc(100vh - 100px);
                    padding: 12px;
                    font-size: 13px;
                }
                #${MENU_ID} .jf-row { margin-bottom: 10px; }
                #${MENU_ID} .jf-header {
                    margin-bottom: 10px;
                    padding-bottom: 8px;
                }
                #${MENU_ID} .jf-divider { margin: 6px 0; }
                #${MENU_ID} .jf-reset { padding: 8px; }
            }

            @media (max-width: 480px) {
                #${MENU_ID} {
                    right: 8px;
                    left: 8px;
                    width: auto;
                    max-width: none;
                }
            }

            @media (max-height: 400px) {
                #${MENU_ID} {
                    bottom: 60px;
                    top: 12px;
                    max-height: none;
                    height: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function neutralizeInterference() {
        if (document.documentElement.getAttribute('vq-enabled')) {
            document.documentElement.removeAttribute('vq-enabled');
        }
        const badStyle = document.getElementById('video-filter-adjuster-styles');
        if (badStyle) badStyle.remove();
    }

    function applyFilters() {
        neutralizeInterference();
        const video = document.querySelector('video') || document.querySelector('.htmlvideoplayer');
        if (!video) return;

        const sharpInput = document.getElementById('jf-in-sharp');
        if (!sharpInput) return;

        const sharpVal = parseFloat(sharpInput.value);
        const smoothVal = parseFloat(document.getElementById('jf-in-smooth').value);
        const brightVal = document.getElementById('jf-in-bright').value;
        const contrastVal = document.getElementById('jf-in-contrast').value;
        const satVal = document.getElementById('jf-in-sat').value;
        const hueVal = document.getElementById('jf-in-hue').value;

        // Handle Convolution Matrix (Sharpening)
        const kernelEl = document.getElementById('jf-kernel');
        if (kernelEl) {
            if (sharpVal === 0) {
                // Identity Matrix (No effect) to save processing power
                kernelEl.setAttribute('kernelMatrix', '0 0 0 0 1 0 0 0 0');
            } else {
                // Calculate Laplacian Sharpen Kernel
                // The logic: Center pixel increases, neighbors decrease. Sum must = 1 to keep brightness.
                // Factor scales 0-100 to a reasonable convolution weight (0.0 to 1.5)
                const factor = sharpVal / 70;
                const n = -factor;          // Neighbor weight (negative)
                const c = 1 + (4 * factor); // Center weight (positive)

                // Construct 3x3 Matrix string:
                //  0  n  0
                //  n  c  n
                //  0  n  0
                const matrix = `0 ${n} 0 ${n} ${c} ${n} 0 ${n} 0`;
                kernelEl.setAttribute('kernelMatrix', matrix);
            }
        }

        const blurPx = smoothVal * 0.015;

        let filterString = `brightness(${brightVal}%) contrast(${contrastVal}%) saturate(${satVal}%) hue-rotate(${hueVal}deg)`;

        if (sharpVal > 0) {
            filterString += ` url(#jf-spatial-sharpen)`;
        }
        if (smoothVal > 0) {
            filterString += ` blur(${blurPx}px)`;
        }

        video.style.filter = filterString;
        video.style.setProperty('filter', filterString, 'important');

        document.getElementById('jf-val-sharp').innerText = `${sharpVal}%`;
        document.getElementById('jf-val-smooth').innerText = `${smoothVal}%`;
        document.getElementById('jf-val-bright').innerText = `${brightVal}%`;
        document.getElementById('jf-val-contrast').innerText = `${contrastVal}%`;
        document.getElementById('jf-val-sat').innerText = `${satVal}%`;
        document.getElementById('jf-val-hue').innerText = `${hueVal}°`;
    }

    function buildMenu() {
        if (document.getElementById(MENU_ID)) return;
        ensureStyles();

        const menu = document.createElement('div');
        menu.id = MENU_ID;

        const row = (id, label, min, max, val, step, unit = '%') => `
            <div class="jf-row">
                <div class="jf-row-head">
                    <span>${label}</span><span id="jf-val-${id.split('-')[2]}">${val}${unit}</span>
                </div>
                <input type="range" id="${id}" min="${min}" max="${max}" value="${val}" step="${step}">
            </div>`;

        menu.innerHTML = `
            <div class="jf-header">
                <strong>Video Tuner</strong>
                <span id="jf-close-btn" class="jf-close">&times;</span>
            </div>
            
            ${row('jf-in-sharp', 'SHARPNESS', 0, 100, 0, 5)}
            ${row('jf-in-smooth', 'DENOISE / SMOOTH', 0, 100, 0, 5)}
            
            <div class="jf-divider"></div>
            
            ${row('jf-in-contrast', 'CONTRAST', 0, 200, 100, 5)}
            ${row('jf-in-bright', 'BRIGHTNESS', 0, 200, 100, 5)}
            ${row('jf-in-sat', 'SATURATION', 0, 200, 100, 5)}
            ${row('jf-in-hue', 'HUE SHIFT', -180, 180, 0, 10, '°')}

            <button id="jf-reset-btn" class="jf-reset">Reset Defaults</button>
        `;
        document.body.appendChild(menu);

        ['sharp', 'smooth', 'bright', 'contrast', 'sat', 'hue'].forEach(k => {
            const el = document.getElementById(`jf-in-${k}`);
            el.addEventListener('input', applyFilters);
        });

        document.getElementById('jf-close-btn').onclick = () => toggleMenu(false);

        document.getElementById('jf-reset-btn').onclick = () => {
            document.getElementById('jf-in-sharp').value = 0;
            document.getElementById('jf-in-smooth').value = 0;
            document.getElementById('jf-in-bright').value = 100;
            document.getElementById('jf-in-contrast').value = 100;
            document.getElementById('jf-in-sat').value = 100;
            document.getElementById('jf-in-hue').value = 0;
            applyFilters();
        };
    }

    function toggleMenu(show) {
        const menu = document.getElementById(MENU_ID);
        if (!menu) return;
        if (show === undefined) show = menu.style.display === 'none' || menu.style.display === '';
        if (show) {
            menu.style.display = 'block';
            requestAnimationFrame(() => {
                menu.style.opacity = '1';
                menu.style.transform = 'translateY(0)';
            });
            applyFilters();
        } else {
            menu.style.opacity = '0';
            menu.style.transform = 'translateY(10px)';
            setTimeout(() => { menu.style.display = 'none'; }, 200);
        }
    }

    function manageButtonVisibility() {
        const isVideoPage = window.location.hash.includes('video');
        const existingBtn = document.getElementById(BUTTON_ID);

        if (!isVideoPage) {
            if (existingBtn) existingBtn.remove();
            const menu = document.getElementById(MENU_ID);
            if (menu) menu.style.display = 'none';
            return;
        }

        if (existingBtn) return;

        const osdContainers = document.querySelectorAll('.buttons.focuscontainer-x');
        
        osdContainers.forEach(container => {
            if (container.querySelector('#' + BUTTON_ID)) return;

            const btn = document.createElement('button');
            btn.id = BUTTON_ID;
            btn.setAttribute('is', 'paper-icon-button-light');
            btn.className = "paper-icon-button-light btnVideoTuner autoSize paper-icon-button-light";
            btn.title = "Video Tuner";
            
            btn.innerHTML = '<span class="largePaperIconButton material-icons image" aria-hidden="true"></span>';
            
            btn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                buildMenu();
                toggleMenu();
            };

            const settingsBtn = container.querySelector('.btnVideoOsdSettings');
            if (settingsBtn) {
                container.insertBefore(btn, settingsBtn);
            } else {
                container.appendChild(btn);
            }
        });
    }

    function init() {
        if (!document.body) return;
        ensureSvgEngine();
        ensureStyles();
        manageButtonVisibility();
        if (document.querySelector('video')) neutralizeInterference();
    }

    const start = () => {
        const observer = new MutationObserver(() => init());
        observer.observe(document.body, { childList: true, subtree: true });
        init();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();

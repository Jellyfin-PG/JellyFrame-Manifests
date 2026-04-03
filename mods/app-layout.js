(function () {
    'use strict';

    const APP_AREA_ID = "app-area";
    const TARGET_SELECTOR = ".homeSectionsContainer, .home-sections, [data-role='page'].type-home .sections, #homeTab .sections";
    const STORAGE_KEY = "jf-app-layout-state";

    let isEditMode = false;
    
    const sectionTitle = '{{SECTION_TITLE}}' || 'Apps';

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
        #jf-app-wrapper {
            width: 100%;
            margin-top: 20px;
        }

        .jf-app-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 38px;
            margin-bottom: -15px;
        }

        .jf-app-title {
            color: #fff;
            font-size: 1.6rem;
            font-weight: 600;
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            letter-spacing: 0.5px;
        }

        .jf-toggle-edit {
            background: rgba(20, 20, 20, 0.6);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 8px;
            padding: 8px 16px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
        }

        .jf-toggle-edit:hover { 
            background: rgba(255, 255, 255, 0.1); 
            border-color: rgba(255, 255, 255, 0.4);
            transform: translateY(-1px); 
        }

        .jf-toggle-edit.active { 
            background: #f87171; 
            border-color: #f87171; 
        }

        #${APP_AREA_ID} {
            display: grid !important;
            grid-template-columns: repeat(12, 1fr) !important;
            gap: 20px !important;
            padding: 38px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            position: relative;
        }

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
            grid-column: span 12;
            min-width: 0;
            position: relative;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .jf-edit-mode .app {
            border: 2px dashed #00a4dc !important;
            cursor: grab;
            user-select: none;
        }
        
        .jf-edit-mode .app:active { cursor: grabbing; }
        
        .jf-edit-mode .app.dragging {
            opacity: 0.4;
            transform: scale(0.98);
            box-shadow: 0 20px 50px rgba(0,164,220,0.4);
        }

        .jf-app-controls {
            display: none;
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 16px;
            z-index: 1000;
            align-items: center;
            justify-content: center;
            gap: 15px;
            backdrop-filter: blur(4px);
        }

        .jf-edit-mode .app:hover .jf-app-controls { display: flex; }

        .jf-ctrl-btn {
            background: #00a4dc;
            color: #fff;
            border: none;
            border-radius: 50%;
            width: 44px; height: 44px;
            font-size: 1.5rem;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: 0.2s;
        }
        .jf-ctrl-btn:hover { background: #0082b3; transform: scale(1.1); }
        .jf-ctrl-label { font-size: 1.2rem; font-weight: bold; width: 80px; text-align: center; }

        @media (min-width: 720px) { ${generateGridCSS()} }
    `;

    function getSavedLayout() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } 
        catch (e) { return {}; }
    }

    function saveLayout() {
        const layout = {};
        const apps = Array.from(document.querySelectorAll(`#${APP_AREA_ID} .app`));
        
        apps.forEach((app, index) => {
            if (!app.id) return;
            const match = app.className.match(/col-(\d+)/);
            const colSize = match ? parseInt(match[1]) : 12;
            layout[app.id] = { order: index, col: colSize };
            
            app.style.order = index; 
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
        console.log(layout);
    }

    function applySavedState(app) {
        if (!app.id) return;
        const layout = getSavedLayout();
        const saved = layout[app.id];

        if (saved) {
            app.style.order = saved.order;
            app.className = app.className.replace(/\bcol-\d+\b/g, '').trim();
            app.classList.add(`col-${saved.col}`);
        } else {
            app.style.order = 999; 
        }
    }

    function attachControls(app) {
        if (app.querySelector('.jf-app-controls')) return;

        const ctrl = document.createElement('div');
        ctrl.className = 'jf-app-controls';
        
        app.draggable = true;

        const updateLabel = () => {
            const match = app.className.match(/col-(\d+)/);
            return match ? match[1] : '12';
        };

        ctrl.innerHTML = `
            <button class="jf-ctrl-btn minus">-</button>
            <div class="jf-ctrl-label">Size: <span>${updateLabel()}</span></div>
            <button class="jf-ctrl-btn plus">+</button>
        `;

        const adjustSize = (change) => {
            const match = app.className.match(/col-(\d+)/);
            let current = match ? parseInt(match[1]) : 12;
            let next = current + change;
            
            if (next >= 1 && next <= 12) {
                app.className = app.className.replace(/\bcol-\d+\b/g, '').trim();
                app.classList.add(`col-${next}`);
                ctrl.querySelector('span').textContent = next;
                saveLayout();
            }
        };

        ctrl.querySelector('.minus').onclick = (e) => { e.stopPropagation(); adjustSize(-1); };
        ctrl.querySelector('.plus').onclick = (e) => { e.stopPropagation(); adjustSize(1); };

        app.appendChild(ctrl);
    }

    function initDragAndDrop(container) {
        let draggedApp = null;

        container.addEventListener('dragstart', (e) => {
            if (!isEditMode || !e.target.classList.contains('app')) {
                e.preventDefault(); return;
            }
            draggedApp = e.target;
            setTimeout(() => draggedApp.classList.add('dragging'), 0);
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!isEditMode || !draggedApp) return;

            const targetApp = e.target.closest('.app:not(.dragging)');
            if (targetApp) {
                const rect = targetApp.getBoundingClientRect();
                const next = (e.clientX - rect.left) / (rect.right - rect.left) > 0.5;
                container.insertBefore(draggedApp, next && targetApp.nextSibling || targetApp);
            }
        });

        container.addEventListener('dragend', () => {
            if (draggedApp) {
                draggedApp.classList.remove('dragging');
                draggedApp = null;
                saveLayout();
            }
        });
    }

    function injectFramework(target) {
        if (document.getElementById('jf-app-wrapper')) return;

        if (!document.getElementById('jf-framework-styles')) {
            const style = document.createElement('style');
            style.id = 'jf-framework-styles';
            style.textContent = CSS;
            document.head.appendChild(style);
        }

        const wrapper = document.createElement('div');
        wrapper.id = 'jf-app-wrapper';

        const header = document.createElement('div');
        header.className = 'jf-app-header';

        const title = document.createElement('h2');
        title.className = 'jf-app-title';
        title.textContent = sectionTitle;

        const editBtn = document.createElement('button');
        editBtn.id = 'jf-edit-btn';
        editBtn.className = 'jf-toggle-edit';
        editBtn.innerHTML = '⚙️';

        const appArea = document.createElement('div');
        appArea.id = APP_AREA_ID;

        editBtn.onclick = () => {
            isEditMode = !isEditMode;
            appArea.classList.toggle('jf-edit-mode', isEditMode);
            editBtn.classList.toggle('active', isEditMode);
            editBtn.innerHTML = isEditMode ? '💾' : '⚙️';
        };

        header.appendChild(title);
        header.appendChild(editBtn);
        wrapper.appendChild(header);
        wrapper.appendChild(appArea);

        target.parentNode.insertBefore(wrapper, target);

        initDragAndDrop(appArea);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('app')) {
                        applySavedState(node);
                        attachControls(node);
                    }
                });
            });
        });
        observer.observe(appArea, { childList: true });

        window.dispatchEvent(new CustomEvent('jfAppAreaReady', { detail: { container: appArea } }));
    }

    const findAndInject = () => {
        if (window.location.hash.includes('home') || window.location.pathname === "/") {
            const target = document.querySelector(TARGET_SELECTOR);
            if (target) injectFramework(target);
        }
    };

    new MutationObserver(findAndInject).observe(document.body, { childList: true, subtree: true });
    
    document.addEventListener('viewshow', findAndInject);
    findAndInject();

})();

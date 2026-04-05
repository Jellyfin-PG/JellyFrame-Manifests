(function () {
    'use strict';

    var APP_AREA_ID = "app-area";
    var TARGET_SELECTOR = ".homeSectionsContainer, .home-sections, [data-role='page'].type-home .sections, #homeTab .sections";
    var STORAGE_KEY_APPS = "jf-app-layout-state";
    var STORAGE_KEY_SECTIONS = "jf-sections-layout-state";

    var isEditMode = false;
    var globalIsDragging = false;
    var sectionTitle = '{{SECTION_TITLE}}' || 'Apps';
    
    if (sectionTitle === '{{SECTION_TITLE}}') {
        sectionTitle = 'Apps';
    }

    function generateGridCSS() {
        var styles = '';
        for (var i = 1; i <= 12; i++) {
            styles += "\n#" + APP_AREA_ID + " .col-" + i + " { grid-column: span " + i + " !important; width: auto !important; }";
        }
        return styles;
    }

    var CSS = [
        "#jf-app-wrapper { width: 100%; margin-top: 20px; }",
        ".jf-app-header { display: flex; justify-content: space-between; align-items: center; padding: 0 38px; margin-bottom: -15px; }",
        ".jf-app-title { color: #fff; font-size: 1.6rem; font-weight: 600; margin: 0; font-family: 'Inter', system-ui, sans-serif; letter-spacing: 0.5px; }",
        ".jf-toggle-edit { background: rgba(20, 20, 20, 0.6); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border-radius: 8px; padding: 8px 16px; font-size: 0.95rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; position: relative; z-index: 10; }", /* Lowered z-index to 10 so header overlaps it */
        ".jf-toggle-edit:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.4); transform: translateY(-1px); }",
        ".jf-toggle-edit.active { background: #f87171; border-color: #f87171; }",
        "#" + APP_AREA_ID + " { display: grid !important; grid-template-columns: repeat(12, 1fr) !important; gap: 20px !important; padding: 38px !important; width: 100% !important; box-sizing: border-box !important; position: relative; }",
        ".app { background: rgba(20, 20, 20, 0.6); backdrop-filter: blur(25px) saturate(1.4); -webkit-backdrop-filter: blur(25px) saturate(1.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 18px; padding: 24px; color: #fff; box-shadow: 0 12px 40px rgba(0,0,0,0.5); font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box !important; grid-column: span 12; min-width: 0; position: relative; transition: transform 0.2s, box-shadow 0.2s; z-index: 1; }",
        
        ".jf-edit-mode .app, .jf-edit-mode div.verticalSection { border: 2px dashed #00a4dc !important; cursor: grab; user-select: none; }",
        ".jf-edit-mode div.verticalSection { padding: 10px; border-radius: 12px; background: rgba(20,20,20,0.3); transition: transform 0.2s, opacity 0.2s; margin-bottom: 10px; position: relative; z-index: 1; }",
        
        ".jf-edit-mode div.verticalSection.hide, .jf-edit-mode div.verticalSection[style*='display: none'] { display: block !important; opacity: 0.6; min-height: 60px; }",
        
        ".jf-edit-mode .app:active, .jf-edit-mode div.verticalSection:active { cursor: grabbing; }",
        ".jf-edit-mode .app.dragging, .jf-edit-mode div.verticalSection.dragging { opacity: 0.4; transform: scale(0.98); box-shadow: 0 20px 50px rgba(0,164,220,0.4); position: relative; z-index: 99999 !important; }",
        
        ".jf-edit-mode .app::after, .jf-edit-mode div.verticalSection::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 500; display: block; }",
        
        ".jf-app-controls { display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); border-radius: 16px; z-index: 600; align-items: center; justify-content: center; gap: 15px; backdrop-filter: blur(4px); }",
        ".jf-edit-mode .app:hover .jf-app-controls { display: flex; }",
        ".jf-ctrl-btn { background: #00a4dc; color: #fff; border: none; border-radius: 50%; width: 44px; height: 44px; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }",
        ".jf-ctrl-btn:hover { background: #0082b3; transform: scale(1.1); }",
        ".jf-ctrl-label { font-size: 1.2rem; font-weight: bold; width: 80px; text-align: center; }",
        
        ".jf-reorderable { display: flex !important; flex-direction: column !important; }",
        
        ".jf-reorderable > div:not(.verticalSection) { display: contents !important; }",
        
        "@media (min-width: 720px) { " + generateGridCSS() + " }"
    ].join('\n');

    var scrollInterval = null;
    var currentScrollSpeed = 0;

    function performScroll(amount) {
        var scrolled = false;
        var scrollers = [
            document.querySelector('.mainAnimatedPages'),
            document.querySelector('.page'),
            document.scrollingElement
        ];
        
        for (var i = 0; i < scrollers.length; i++) {
            var sc = scrollers[i];
            if (sc && sc.scrollHeight > sc.clientHeight) {
                sc.scrollTop += amount;
                scrolled = true;
                break;
            }
        }
        
        if (!scrolled) {
            window.scrollBy(0, amount);
        }
    }

    function handleEdgeScroll(e) {
        if (!isEditMode || !globalIsDragging) return;
        var edgeSize = 150; 
        var vHeight = window.innerHeight || document.documentElement.clientHeight;
        
        if (e.clientY < edgeSize) {
            currentScrollSpeed = -20;
            startScrolling();
        } else if (e.clientY > vHeight - edgeSize) {
            currentScrollSpeed = 20;
            startScrolling();
        } else {
            stopScrolling();
        }
    }

    function startScrolling() {
        if (!scrollInterval) {
            scrollInterval = setInterval(function() {
                performScroll(currentScrollSpeed);
            }, 16);
        }
    }

    function stopScrolling() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    }

    document.addEventListener('dragover', handleEdgeScroll);
    document.addEventListener('dragend', stopScrolling);
    document.addEventListener('wheel', function(e) {
        if (!isEditMode || !globalIsDragging) return;
        performScroll(e.deltaY);
    }, { passive: true });

    function getSavedAppsLayout() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY_APPS)) || {}; } 
        catch (e) { return {}; }
    }

    function saveAppsLayout() {
        var layout = {};
        var apps = [].slice.call(document.querySelectorAll("#" + APP_AREA_ID + " .app"));
        
        apps.sort(function(a, b) {
            var orderA = parseInt(a.style.order || a.getAttribute('data-order') || 0, 10);
            var orderB = parseInt(b.style.order || b.getAttribute('data-order') || 0, 10);
            return orderA - orderB;
        });
        
        apps.forEach(function(app, index) {
            if (!app.id) return;
            var match = app.className.match(/\bcol-(\d+)\b/);
            var colSize = match ? parseInt(match[1], 10) : 12;
            layout[app.id] = { order: index, col: colSize };
            
            app.setAttribute('data-order', index);
            app.style.order = index; 
        });

        localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(layout));
    }

    function applyAppsState(app) {
        if (!app.id) return;
        var layout = getSavedAppsLayout();
        var saved = layout[app.id];

        if (saved) {
            app.className = app.className.replace(/\bcol-\d+\b/g, '').trim();
            app.classList.add('col-' + saved.col);
            app.setAttribute('data-order', saved.order);
            app.style.order = saved.order;
        } else {
            app.setAttribute('data-order', 999); 
            app.style.order = 999;
        }
    }

    function getSavedSectionsLayout() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY_SECTIONS)) || {}; } 
        catch (e) { return {}; }
    }

    function saveSectionsLayout(target) {
        var layout = {};
        var sections = [].slice.call(target.querySelectorAll('div.verticalSection'));
        
        sections.sort(function(a, b) {
            var orderA = parseInt(a.style.order || a.getAttribute('data-order') || 0, 10);
            var orderB = parseInt(b.style.order || b.getAttribute('data-order') || 0, 10);
            return orderA - orderB;
        });

        sections.forEach(function(sec, index) {
            var secId = sec.getAttribute('data-jf-section-id');
            if (!secId) {
                var titleEl = sec.querySelector('.sectionTitle');
                secId = titleEl ? 'sec-' + titleEl.textContent.trim().replace(/\W+/g, '-') : 'sec-' + index;
                sec.setAttribute('data-jf-section-id', secId);
            }
            layout[secId] = { order: index };
            sec.setAttribute('data-order', index);
            sec.style.order = index;
        });
        localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(layout));
    }

    function applySectionsState(target) {
        if (!target) return;
        target.classList.add('jf-reorderable'); 
        
        var layout = getSavedSectionsLayout();
        var sections = [].slice.call(target.querySelectorAll('div.verticalSection'));

        sections.forEach(function(sec, index) {
            var secId = sec.getAttribute('data-jf-section-id');
            if (!secId) {
                var titleEl = sec.querySelector('.sectionTitle');
                secId = titleEl ? 'sec-' + titleEl.textContent.trim().replace(/\W+/g, '-') : 'sec-' + index;
                sec.setAttribute('data-jf-section-id', secId);
            }
            
            var expectedOrder = layout[secId] !== undefined ? layout[secId].order : 999;
            sec.setAttribute('data-order', expectedOrder);
            sec.style.order = expectedOrder;
        });
    }

    function initDragAndDrop(container, itemSelector, onSave) {
        var draggedItem = null;

        container.addEventListener('dragstart', function(e) {
            if (e.target.closest('.jf-app-controls')) {
                e.preventDefault();
                return;
            }

            var item = e.target.closest(itemSelector);
            if (!isEditMode || !item || !container.contains(item)) return;
            draggedItem = item;
            globalIsDragging = true;
            
            var items = [].slice.call(container.querySelectorAll(itemSelector));
            
            items.sort(function(a, b) {
                return parseInt(a.style.order || a.getAttribute('data-order') || 0, 10) - parseInt(b.style.order || b.getAttribute('data-order') || 0, 10);
            });
            items.forEach(function(el, i) {
                el.style.order = i;
                el.setAttribute('data-order', i);
            });
            
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', 'jf-dragging');
            }
            
            setTimeout(function() {
                if (draggedItem) draggedItem.classList.add('dragging');
            }, 0);
        });

        container.addEventListener('dragover', function(e) {
            e.preventDefault();
            if (!isEditMode || !draggedItem) return;
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

            var items = [].slice.call(container.querySelectorAll(itemSelector));
            items.sort(function(a, b) { 
                return parseInt(a.style.order || 0, 10) - parseInt(b.style.order || 0, 10); 
            });

            var draggedIdx = items.indexOf(draggedItem);
            if (draggedIdx === -1) return;

            var isVertical = itemSelector.indexOf('verticalSection') !== -1;
            var newIdx = draggedIdx;

            if (!isVertical) {
                var minDistance = Infinity;
                var targetIdx = -1;

                for (var i = 0; i < items.length; i++) {
                    if (i === draggedIdx) continue;
                    var rect = items[i].getBoundingClientRect();
                    var cx = rect.left + (rect.width / 2);
                    var cy = rect.top + (rect.height / 2);
                    
                    var dist = Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2);
                    if (dist < minDistance) {
                        minDistance = dist;
                        targetIdx = i;
                    }
                }

                if (targetIdx !== -1) {
                    var targetRect = items[targetIdx].getBoundingClientRect();
                    var isAfter = false;
                    var tCx = targetRect.left + (targetRect.width / 2);
                    var tCy = targetRect.top + (targetRect.height / 2);

                    if (Math.abs(e.clientY - tCy) > targetRect.height / 2) {
                        isAfter = e.clientY > tCy;
                    } else {
                        isAfter = e.clientX > tCx;
                    }

                    if (draggedIdx < targetIdx && isAfter) {
                        newIdx = targetIdx;
                    } else if (draggedIdx > targetIdx && !isAfter) {
                        newIdx = targetIdx;
                    }
                }

            } else {
                for (var j = 0; j < items.length; j++) {
                    if (j === draggedIdx) continue;

                    var vRect = items[j].getBoundingClientRect();
                    var centerY = vRect.top + (vRect.height / 2);
                    
                    if (draggedIdx < j && e.clientY > centerY) {
                        newIdx = j; 
                    } 
                    else if (draggedIdx > j && e.clientY < centerY) {
                        newIdx = j; 
                        break; 
                    }
                }
            }

            if (newIdx !== draggedIdx) {
                items.splice(draggedIdx, 1);
                items.splice(newIdx, 0, draggedItem);
                
                items.forEach(function(el, k) {
                    if (el.style.order != k) el.style.order = k;
                    el.setAttribute('data-order', k);
                });
            }
        });

        container.addEventListener('dragend', function() {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                if (onSave) onSave(container);
            }
            globalIsDragging = false;
            stopScrolling();
        });
    }

    function attachControls(app) {
        if (app.querySelector('.jf-app-controls')) return;

        var ctrl = document.createElement('div');
        ctrl.className = 'jf-app-controls';
        
        var updateLabel = function() {
            var match = app.className.match(/\bcol-(\d+)\b/);
            return match ? match[1] : '12';
        };

        ctrl.innerHTML = [
            '<button class="jf-ctrl-btn minus">-</button>',
            '<div class="jf-ctrl-label">Size: <span>' + updateLabel() + '</span></div>',
            '<button class="jf-ctrl-btn plus">+</button>'
        ].join('');

        var adjustSize = function(change) {
            var allowedSizes = [3, 6, 9, 12];
            var match = app.className.match(/\bcol-(\d+)\b/);
            var current = match ? parseInt(match[1], 10) : 12;
            
            var closest = allowedSizes.reduce(function(a, b) {
                return Math.abs(b - current) < Math.abs(a - current) ? b : a;
            });
            var nextIndex = allowedSizes.indexOf(closest) + change;
            
            if (nextIndex >= 0 && nextIndex < allowedSizes.length) {
                var next = allowedSizes[nextIndex];
                app.className = app.className.replace(/\bcol-\d+\b/g, '').trim();
                app.classList.add('col-' + next);
                ctrl.querySelector('span').textContent = next;
                saveAppsLayout();
            }
        };

        ctrl.querySelector('.minus').onclick = function(e) { e.stopPropagation(); adjustSize(-1); };
        ctrl.querySelector('.plus').onclick = function(e) { e.stopPropagation(); adjustSize(1); };

        app.appendChild(ctrl);
    }

    function injectFramework(target) {
        if (document.getElementById('jf-app-wrapper')) return;

        if (!document.getElementById('jf-framework-styles')) {
            var style = document.createElement('style');
            style.id = 'jf-framework-styles';
            style.textContent = CSS;
            document.head.appendChild(style);
        }

        var wrapper = document.createElement('div');
        wrapper.id = 'jf-app-wrapper';

        var header = document.createElement('div');
        header.className = 'jf-app-header';

        var title = document.createElement('h2');
        title.className = 'jf-app-title';
        title.textContent = sectionTitle;

        var editBtn = document.createElement('button');
        editBtn.id = 'jf-edit-btn';
        editBtn.className = 'jf-toggle-edit';
        editBtn.innerHTML = '⚙️';

        var appArea = document.createElement('div');
        appArea.id = APP_AREA_ID;

        editBtn.onclick = function() {
            isEditMode = !isEditMode;
            appArea.classList.toggle('jf-edit-mode', isEditMode);
            target.classList.toggle('jf-edit-mode', isEditMode);
            editBtn.classList.toggle('active', isEditMode);
            editBtn.innerHTML = isEditMode ? '💾' : '⚙️';

            var apps = [].slice.call(appArea.querySelectorAll('.app'));
            apps.forEach(function(el) { el.draggable = isEditMode; });

            var sections = [].slice.call(target.querySelectorAll('div.verticalSection'));
            sections.forEach(function(el) { el.draggable = isEditMode; });

            if (!isEditMode) {
                saveAppsLayout();
                saveSectionsLayout(target);
            }
        };

        header.appendChild(title);
        header.appendChild(editBtn);
        wrapper.appendChild(header);
        wrapper.appendChild(appArea);

        target.parentNode.insertBefore(wrapper, target);

        initDragAndDrop(appArea, '.app', saveAppsLayout);
        initDragAndDrop(target, 'div.verticalSection', function(cont) { saveSectionsLayout(cont); });

        var appObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(m) {
                [].slice.call(m.addedNodes).forEach(function(node) {
                    if (node.nodeType === 1 && node.classList.contains('app')) {
                        applyAppsState(node);
                        attachControls(node);
                    }
                });
            });
        });
        appObserver.observe(appArea, { childList: true });

        var targetObserver = new MutationObserver(function(mutations) {
            var needsApply = false;
            mutations.forEach(function(m) {
                [].slice.call(m.addedNodes).forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.matches && node.matches('div.verticalSection')) {
                            needsApply = true;
                        } else if (node.querySelector && node.querySelector('div.verticalSection')) {
                            needsApply = true;
                        }
                    }
                });
            });
            
            if (needsApply) {
                applySectionsState(target);
                if (isEditMode) {
                    var sections = [].slice.call(target.querySelectorAll('div.verticalSection'));
                    sections.forEach(function(el) { el.draggable = true; });
                }
            }
        });
        targetObserver.observe(target, { childList: true, subtree: true });

        applySectionsState(target);

        var event;
        if (typeof CustomEvent === 'function') {
            event = new CustomEvent('jfAppAreaReady', { detail: { container: appArea } });
        } else {
            event = document.createEvent('CustomEvent');
            event.initCustomEvent('jfAppAreaReady', true, true, { container: appArea });
        }
        window.dispatchEvent(event);
    }

    var findAndInject = function() {
        if (window.location.hash.indexOf('home') !== -1 || window.location.pathname === "/") {
            var target = document.querySelector(TARGET_SELECTOR);
            if (target) injectFramework(target);
        }
    };

    new MutationObserver(findAndInject).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('viewshow', findAndInject);
    findAndInject();

})();

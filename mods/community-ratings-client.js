(function () {

    var MOD_ID = 'community-ratings';
    var API = '/JellyFrame/mods/' + MOD_ID + '/api';

    var currentUserId = null;
    var cache = {};
    var CACHE_TTL = 30000;
    var activePopup = null;
    var activePopupItem = null;

    var SKIP_TYPES = {
        'CollectionFolder': true, 'UserView': true,
        'Folder': true, 'Channel': true, 'ChannelFolderItem': true
    };

    function boot() {
        resolveUser(function () {
            injectGlobalStyles();
            startObserver();
            watchNavigation();
        });
    }

    function resolveUser(cb) {
        function attempt(tries) {
            if (typeof ApiClient !== 'undefined') {
                try {
                    var p = ApiClient.getCurrentUser();
                    if (p && typeof p.then === 'function') {
                        p.then(function (u) {
                            if (u && u.Id) { currentUserId = u.Id; }
                            cb();
                        }).catch(function () { cb(); });
                        return;
                    }
                    if (p && p.Id) { currentUserId = p.Id; }
                    cb();
                    return;
                } catch (e) { }
            }
            if (tries > 0) {
                setTimeout(function () { attempt(tries - 1); }, 400);
            } else {
                cb();
            }
        }
        attempt(25);
    }

    function injectGlobalStyles() {
        if (document.getElementById('cr-styles')) { return; }
        var s = document.createElement('style');
        s.id = 'cr-styles';
        s.textContent = [
            '.jf-unified-badge-container {',
            '  position: absolute;',
            '  top: 8px; left: 8px;',
            '  display: flex;',
            '  flex-direction: column;',
            '  gap: 6px;',
            '  z-index: 11;',
            '  pointer-events: none;',
            '}',
            '.jf-rating-badge {',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 5px;',
            '  padding: 4px 10px;',
            '  border-radius: 6px;',
            '  font-size: 0.75rem;',
            '  font-weight: 800;',
            '  color: #fff;',
            '  box-shadow: 0 4px 10px rgba(0,0,0,0.5);',
            '  backdrop-filter: blur(8px);',
            '  -webkit-backdrop-filter: blur(8px);',
            '  border: 1px solid rgba(255,255,255,0.2);',
            '  text-transform: uppercase;',
            '  letter-spacing: 0.5px;',
            '  line-height: 1;',
            '  width: fit-content;',
            '}',
            '.cr-detail { display: inline-flex; align-items: center; overflow: visible !important; }',
            '.cr-popup {',
            '  position: fixed;',
            '  z-index: 99999;',
            '  background: var(--darkerGradientPoint, var(--theme-paper-color, #1c1c1c));',
            '  border: 1px solid var(--theme-border-color, rgba(255,255,255,0.12));',
            '  border-radius: 14px;',
            '  padding: 16px 18px 14px;',
            '  box-shadow: 0 8px 40px rgba(0,0,0,0.5);',
            '  min-width: 240px;',
            '  opacity: 0;',
            '  transform: translateY(6px) scale(0.97);',
            '  transition: opacity 0.15s, transform 0.15s;',
            '  pointer-events: none;',
            '}',
            '.cr-popup.cr-popup-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }',
            '.cr-popup-title { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--theme-text-color-secondary, rgba(255,255,255,0.35)); font-family: sans-serif; margin-bottom: 12px; }',
            '.cr-popup-score-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 14px; }',
            '.cr-popup-avg { font-size: 36px; font-weight: 700; color: var(--theme-accent-color, #fbbf24); font-family: sans-serif; line-height: 1; }',
            '.cr-popup-avg-denom { font-size: 14px; color: var(--theme-text-color-secondary, rgba(255,255,255,0.3)); font-family: sans-serif; }',
            '.cr-popup-votes { font-size: 11px; color: var(--theme-text-color-secondary, rgba(255,255,255,0.38)); font-family: sans-serif; margin-left: auto; }',
            '.cr-slider-wrap { position: relative; margin-bottom: 6px; }',
            '.cr-slider-stars { display: flex; justify-content: space-between; margin-bottom: 6px; }',
            '.cr-slider-star { font-size: 14px; color: var(--theme-border-color, rgba(255,255,255,0.15)); line-height: 1; transition: color 0.1s; }',
            '.cr-slider-star.lit { color: var(--theme-accent-color, #fbbf24); }',
            '.cr-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; background: var(--theme-border-color, rgba(255,255,255,0.1)); outline: none; cursor: pointer; margin: 0; }',
            '.cr-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--theme-accent-color, #fbbf24); cursor: pointer; box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent-color, #fbbf24) 20%, transparent); transition: box-shadow 0.15s; }',
            '.cr-slider::-webkit-slider-thumb:hover { box-shadow: 0 0 0 6px color-mix(in srgb, var(--theme-accent-color, #fbbf24) 25%, transparent); }',
            '.cr-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--theme-accent-color, #fbbf24); cursor: pointer; border: none; }',
            '.cr-slider-val { text-align: center; font-size: 13px; font-family: sans-serif; color: var(--theme-text-color-secondary, rgba(255,255,255,0.5)); margin-top: 8px; }',
            '.cr-slider-val strong { color: var(--theme-text-color, #fff); font-size: 15px; }',
            '.cr-popup-actions { display: flex; gap: 8px; margin-top: 14px; }',
            '.cr-btn { flex: 1; padding: 7px 0; border-radius: 7px; font-size: 12px; font-family: sans-serif; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.15s; }',
            '.cr-btn:hover { opacity: 0.85; }',
            '.cr-btn-submit { background: var(--theme-accent-color, #fbbf24); color: var(--theme-button-text-color, #000); }',
            '.cr-btn-clear { background: var(--theme-paper-item-hover-color, rgba(255,255,255,0.08)); color: var(--theme-text-color-secondary, rgba(255,255,255,0.55)); border: 1px solid var(--theme-border-color, rgba(255,255,255,0.1)) !important; }',
            '.cr-detail-rate-btn {',
            '  display: inline-flex;',
            '  align-items: center;',
            '  gap: 4px;',
            '  cursor: pointer;',
            '  user-select: none;',
            '  transition: background 0.12s, opacity 0.12s;',
            '  position: relative;',
            '  overflow: visible !important;',
            '}',
            '.cr-detail-rate-btn:hover { background: rgba(255,255,255,0.11); opacity: 0.85; }',
            '.cr-detail-rate-btn .crb-star { font-size: 11px; color: var(--theme-accent-color, #fbbf24); line-height: 1; }',
            '.cr-detail-rate-btn .crb-avg { font-size: 12px; font-weight: 700; color: var(--theme-text-color, #fff); line-height: 1; }',
            '.cr-detail-rate-btn .crb-null { font-size: 12px; color: rgba(255,255,255,0.3); line-height: 1; }',
            '.crb-you {',
            '  display: inline-block;',
            '  background: var(--theme-accent-color, #fbbf24);',
            '  color: #000;',
            '  font-size: 9px;',
            '  font-weight: 800;',
            '  font-family: sans-serif;',
            '  line-height: 1;',
            '  padding: 2px 4px;',
            '  border-radius: 3px;',
            '  pointer-events: none;',
            '  margin-left: 3px;',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function apiGet(path, cb) {
        fetch(API + path)
            .then(function (r) { return r.json(); })
            .then(function (d) { cb(null, d); })
            .catch(function (e) { cb(e, null); });
    }

    function apiPost(path, body, cb) {
        fetch(API + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (r) { return r.json(); })
            .then(function (d) { cb(null, d); })
            .catch(function (e) { cb(e, null); });
    }

    function apiDelete(path, cb) {
        fetch(API + path, { method: 'DELETE' })
            .then(function (r) { return r.json(); })
            .then(function (d) { cb(null, d); })
            .catch(function (e) { cb(e, null); });
    }

    function fetchRating(itemId, cb) {
        var c = cache[itemId];
        if (c && (Date.now() - c.ts) < CACHE_TTL) { cb(c); return; }

        var done = 0;
        var result = { avg: null, count: 0, userRating: null, ts: Date.now() };

        function finish() {
            done++;
            if (done >= (currentUserId ? 2 : 1)) {
                cache[itemId] = result;
                cb(result);
            }
        }

        apiGet('/rating/' + itemId, function (err, d) {
            if (!err && d) { result.avg = d.avg; result.count = d.count || 0; }
            finish();
        });

        if (currentUserId) {
            apiGet('/rating/' + itemId + '/user/' + currentUserId, function (err, d) {
                if (!err && d) { result.userRating = d.rating; }
                finish();
            });
        }
    }

    function invalidate(itemId) { delete cache[itemId]; }

    function closePopup() {
        if (!activePopup) { return; }
        activePopup.classList.remove('cr-popup-open');
        var p = activePopup;
        setTimeout(function () { if (p.parentNode) { p.parentNode.removeChild(p); } }, 160);
        activePopup = null;
        activePopupItem = null;
    }

    function openPopup(anchor, itemId) {
        if (activePopupItem === itemId) { closePopup(); return; }
        closePopup();
        activePopupItem = itemId;

        var popup = document.createElement('div');
        popup.className = 'cr-popup';
        document.body.appendChild(popup);
        activePopup = popup;

        function position() {
            var rect = anchor.getBoundingClientRect();
            var pw = popup.offsetWidth || 260;
            var ph = popup.offsetHeight || 220;
            var left = rect.left;
            var top = rect.bottom + 8;
            if (left + pw > window.innerWidth - 12) { left = window.innerWidth - pw - 12; }
            if (top + ph > window.innerHeight - 12) { top = rect.top - ph - 8; }
            popup.style.left = Math.max(12, left) + 'px';
            popup.style.top = Math.max(12, top) + 'px';
            requestAnimationFrame(function () { popup.classList.add('cr-popup-open'); });
        }

        function render(data) {
            popup.innerHTML = '';

            var title = document.createElement('div');
            title.className = 'cr-popup-title';
            title.textContent = 'Community Rating';
            popup.appendChild(title);

            var scoreRow = document.createElement('div');
            scoreRow.className = 'cr-popup-score-row';
            if (data.count > 0 && data.avg !== null) {
                scoreRow.innerHTML = '<span class="cr-popup-avg">' + data.avg +
                    '<span class="cr-popup-avg-denom"> /10</span></span>' +
                    '<span class="cr-popup-votes">' + data.count +
                    (data.count === 1 ? ' rating' : ' ratings') + '</span>';
            } else {
                scoreRow.innerHTML = '<span style="font-size:13px;font-family:sans-serif;color:var(--theme-text-color-secondary,rgba(255,255,255,0.3))">No ratings yet</span>';
            }
            popup.appendChild(scoreRow);

            if (!currentUserId) { position(); return; }

            var sliderWrap = document.createElement('div');
            sliderWrap.className = 'cr-slider-wrap';

            var starsRow = document.createElement('div');
            starsRow.className = 'cr-slider-stars';
            for (var i = 0; i < 5; i++) {
                var sp = document.createElement('span');
                sp.className = 'cr-slider-star';
                sp.textContent = '\u2605';
                starsRow.appendChild(sp);
            }
            sliderWrap.appendChild(starsRow);

            var slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'cr-slider';
            slider.min = '0';
            slider.max = '5';
            slider.step = '0.25';
            slider.value = String(data.userRating !== null ? (data.userRating / 2) : 0);
            sliderWrap.appendChild(slider);

            var valLabel = document.createElement('div');
            valLabel.className = 'cr-slider-val';
            popup.appendChild(sliderWrap);
            popup.appendChild(valLabel);

            function updateSliderUI(val) {
                var stars = starsRow.querySelectorAll('.cr-slider-star');
                for (var i = 0; i < stars.length; i++) {
                    stars[i].className = 'cr-slider-star' + (i < val ? ' lit' : '');
                }
                var ac = getComputedStyle(document.documentElement).getPropertyValue('--theme-accent-color').trim() || '#fbbf24';
                var bg = getComputedStyle(document.documentElement).getPropertyValue('--theme-border-color').trim() || 'rgba(255,255,255,0.1)';
                slider.style.background = 'linear-gradient(to right,' + ac + ' ' + ((val / 5) * 100) + '%,' + bg + ' ' + ((val / 5) * 100) + '%)';
                valLabel.innerHTML = val === 0
                    ? '<span style="color:var(--theme-text-color-secondary,rgba(255,255,255,0.3))">No rating</span>'
                    : '<strong>' + val + '</strong> / 5 &nbsp;&middot;&nbsp; ' + (val * 2) + ' out of 10';
            }

            updateSliderUI(parseFloat(slider.value));
            slider.oninput = function () { updateSliderUI(parseFloat(slider.value)); };

            var actions = document.createElement('div');
            actions.className = 'cr-popup-actions';

            var submitBtn = document.createElement('button');
            submitBtn.className = 'cr-btn cr-btn-submit';
            submitBtn.textContent = data.userRating !== null ? 'Update' : 'Rate';
            submitBtn.onclick = function () {
                var val = parseFloat(slider.value);
                if (val === 0) { return; }
                invalidate(itemId);
                apiPost('/rating/' + itemId, { userId: currentUserId, rating: val * 2 }, function (err, d) {
                    if (!err && d && d.ok) {
                        var fresh = {
                            avg: d.aggregate ? d.aggregate.avg : null,
                            count: d.aggregate ? d.aggregate.count : 0,
                            userRating: val * 2,
                            ts: Date.now()
                        };
                        cache[itemId] = fresh;
                        refreshCardBadge(itemId, fresh);
                        refreshDetailWidget(itemId, fresh);
                        closePopup();
                    }
                });
            };

            var clearBtn = document.createElement('button');
            clearBtn.className = 'cr-btn cr-btn-clear';
            clearBtn.textContent = 'Clear';
            clearBtn.style.display = data.userRating !== null ? '' : 'none';
            clearBtn.onclick = function () {
                invalidate(itemId);
                apiDelete('/rating/' + itemId + '/user/' + currentUserId, function (err, d) {
                    var fresh = { avg: null, count: 0, userRating: null, ts: Date.now() };
                    if (!err && d && d.aggregate) {
                        fresh.avg = d.aggregate.avg || null;
                        fresh.count = d.aggregate.count || 0;
                    }
                    cache[itemId] = fresh;
                    refreshCardBadge(itemId, fresh);
                    refreshDetailWidget(itemId, fresh);
                    closePopup();
                });
            };

            actions.appendChild(submitBtn);
            actions.appendChild(clearBtn);
            popup.appendChild(actions);
            position();
        }

        fetchRating(itemId, render);
    }

    document.addEventListener('click', function (e) {
        if (activePopup && !activePopup.contains(e.target) && !e.target.closest('.cr-detail-rate-btn')) {
            closePopup();
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { closePopup(); }
    });

    function getOrCreateBadgeContainer(cardBox) {
        var existing = cardBox.querySelector('.jf-unified-badge-container');
        if (existing) { return existing; }
        var c = document.createElement('div');
        c.className = 'jf-unified-badge-container';
        cardBox.appendChild(c);
        return c;
    }

    function processCard(card) {
        if (card.getAttribute('data-cr')) { return; }
        card.setAttribute('data-cr', '1');

        var cardType = card.getAttribute('data-type') || '';
        if (SKIP_TYPES[cardType]) { return; }

        var itemId = card.getAttribute('data-id');
        if (!itemId || itemId === 'undefined') {
            var cl = card.querySelector('a.cardContent[data-id], a.cardImageContainer[data-id]');
            if (cl) { itemId = cl.getAttribute('data-id'); }
        }
        if (!itemId || itemId === 'undefined') { return; }

        var cardBox = card.querySelector('.cardBox');
        if (!cardBox) { return; }

        fetchRating(itemId, function (data) {
            if (!data.count || data.avg === null) { return; }
            if (card.querySelector('.cr-card-badge')) { return; }
            cardBox.style.position = 'relative';
            var container = getOrCreateBadgeContainer(cardBox);
            var badge = document.createElement('div');
            badge.className = 'jf-rating-badge cr-card-badge';
            badge.style.cssText = 'background:linear-gradient(135deg,rgba(251,191,36,0.97),rgba(215,160,10,0.97));color:#000;border-color:rgba(0,0,0,0.1)';
            badge.innerHTML = '<svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:currentColor;flex-shrink:0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
                '<span>' + data.avg + '</span>' +
                '<span style="opacity:0.55;font-size:0.65rem">(' + data.count + ')</span>';
            container.appendChild(badge);
        });
    }

    function refreshCardBadge(itemId, data) {
        var cards = document.querySelectorAll('.card[data-id="' + itemId + '"], .itemCard[data-id="' + itemId + '"]');
        for (var i = 0; i < cards.length; i++) {
            var badge = cards[i].querySelector('.cr-card-badge');
            if (data.count > 0 && data.avg !== null) {
                if (!badge) {
                    var cb = cards[i].querySelector('.cardBox');
                    if (!cb) { continue; }
                    cb.style.position = 'relative';
                    var cont = getOrCreateBadgeContainer(cb);
                    badge = document.createElement('div');
                    badge.className = 'jf-rating-badge cr-card-badge';
                    badge.style.cssText = 'background:linear-gradient(135deg,rgba(251,191,36,0.97),rgba(215,160,10,0.97));color:#000;border-color:rgba(0,0,0,0.1)';
                    cont.appendChild(badge);
                }
                badge.innerHTML = '<svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:currentColor;flex-shrink:0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
                    '<span>' + data.avg + '</span>' +
                    '<span style="opacity:0.55;font-size:0.65rem">(' + data.count + ')</span>';
            } else {
                if (badge) { badge.parentNode.removeChild(badge); }
            }
        }
    }

    function scanCards() {
        var cards = document.querySelectorAll('.card:not([data-cr]), .itemCard:not([data-cr])');
        for (var i = 0; i < cards.length; i++) { processCard(cards[i]); }
    }

    function getDetailItemId() {
        var href = window.location.href || '';
        var m = href.match(/[?&]id=([a-f0-9]+)/i);
        if (m) { return m[1]; }
        var hash = window.location.hash || '';
        m = hash.match(/[?&]id=([a-f0-9]+)/i);
        if (m) { return m[1]; }
        return null;
    }

    function isDetailPage() {
        var href = window.location.href.toLowerCase();
        return !!(document.querySelector('.itemDetailPage') ||
            href.indexOf('itemdetails') !== -1 ||
            href.indexOf('details?') !== -1);
    }

    function injectDetailWidget() {
        if (!isDetailPage()) { return; }

        var itemId = getDetailItemId();
        if (!itemId) { return; }

        var containers = document.querySelectorAll('.itemMiscInfo-primary, .itemMiscInfo');

        if (containers.length === 0) {
            var anchors = document.querySelectorAll('.starRatingContainer, .nameOverflowContainer');
            for (var j = 0; j < anchors.length; j++) {
                var anchor = anchors[j];
                if (anchor.parentNode.querySelector('.cr-detail[data-cr-detail="' + itemId + '"]')) { continue; }
                var w = document.createElement('div');
                w.className = 'cr-detail mediaInfoItem';
                w.setAttribute('data-cr-detail', itemId);
                anchor.parentNode.insertBefore(w, anchor.nextSibling || null);

                (function (widget, id) {
                    fetchRating(id, function (data) {
                        renderDetailWidget(widget, id, data);
                    });
                })(w, itemId);
            }
            return;
        }

        for (var i = 0; i < containers.length; i++) {
            var container = containers[i];

            if (container.querySelector('.cr-detail[data-cr-detail="' + itemId + '"]')) {
                continue;
            }

            var widget = document.createElement('div');
            widget.className = 'cr-detail mediaInfoItem';
            widget.setAttribute('data-cr-detail', itemId);
            container.appendChild(widget);

            (function (w, id) {
                fetchRating(id, function (data) {
                    renderDetailWidget(w, id, data);
                });
            })(widget, itemId);
        }
    }

    function renderDetailWidget(widget, itemId, data) {
        widget.innerHTML = '';

        var btn = document.createElement('div');
        btn.className = 'cr-detail-rate-btn mediaInfoText mediaInfoOfficialRating';
        btn.setAttribute('title', data.count > 0
            ? 'Community: ' + data.avg + '/10 (' + data.count + ' ratings)' + (data.userRating !== null ? '  •  Yours: ' + data.userRating + '/10' : '  •  Click to rate')
            : 'No ratings yet — click to rate');

        if (data.count > 0 && data.avg !== null) {
            btn.innerHTML = '<span class="crb-star">&#9733;</span><span class="crb-avg">' + data.avg + '</span>';
        } else {
            btn.innerHTML = '<span class="crb-star">&#9733;</span><span class="crb-null">&mdash;</span>';
        }

        if (currentUserId && data.userRating !== null) {
            var dot = document.createElement('span');
            dot.className = 'crb-you';
            dot.textContent = data.userRating;
            btn.appendChild(dot);
        }

        if (currentUserId) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                openPopup(btn, itemId);
            });
        } else {
            btn.style.cursor = 'default';
        }

        widget.appendChild(btn);
    }

    function refreshDetailWidget(itemId, data) {
        var widgets = document.querySelectorAll('.cr-detail[data-cr-detail="' + itemId + '"]');
        for (var i = 0; i < widgets.length; i++) {
            renderDetailWidget(widgets[i], itemId, data);
        }
    }

    var scanScheduled = false;
    function scheduleScan() {
        if (scanScheduled) { return; }
        scanScheduled = true;
        setTimeout(function () {
            scanScheduled = false;
            scanCards();
            injectDetailWidget();
        }, 80);
    }

    function startObserver() {
        scheduleScan();
        var mo = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType !== 1) { continue; }
                    var tag = n.tagName ? n.tagName.toLowerCase() : '';
                    if (tag === 'div' || tag === 'a' || tag === 'section' || tag === 'main') {
                        scheduleScan();
                        break;
                    }
                }
            }
        });
        mo.observe(document.body, { childList: true, subtree: true });
    }

    function watchNavigation() {
        var lastHref = '';

        function onNavChange() {
            var currentHref = window.location.href;
            if (currentHref === lastHref) { return; }
            lastHref = currentHref;

            closePopup();

            var old = document.querySelectorAll('.cr-detail[data-cr-detail]');
            for (var i = 0; i < old.length; i++) {
                if (old[i].parentNode) { old[i].parentNode.removeChild(old[i]); }
            }

            setTimeout(function () {
                scanCards();
                injectDetailWidget();
            }, 350);
        }

        window.addEventListener('hashchange', onNavChange);
        window.addEventListener('popstate', onNavChange);

        document.addEventListener('viewshow', function () {
            setTimeout(function () {
                scanCards();
                injectDetailWidget();
            }, 100);
        });

        var origPush = history.pushState;
        history.pushState = function () {
            origPush.apply(history, arguments);
            setTimeout(onNavChange, 100);
        };

        var origReplace = history.replaceState;
        history.replaceState = function () {
            origReplace.apply(history, arguments);
            setTimeout(onNavChange, 100);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();            } else {
                cb();
            }
        }
        attempt(25);
    }

    function injectGlobalStyles() {
        if (document.getElementById('cr-styles')) { return; }
        var s = document.createElement('style');
        s.id = 'cr-styles';
        s.textContent = [
            '.cr-card-badge {',
            '  position: absolute;',
            '  bottom: 0; left: 0; right: 0;',
            '  padding: 20px 7px 5px;',
            '  background: linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 100%);',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 3px;',
            '  pointer-events: none;',
            '  z-index: 3;',
            '  box-sizing: border-box;',
            '}',
            '.cr-stars {',
            '  display: flex;',
            '  gap: 1px;',
            '}',
            '.cr-s {',
            '  font-size: 10px;',
            '  line-height: 1;',
            '  color: #fbbf24;',
            '  text-shadow: 0 1px 4px rgba(0,0,0,0.7);',
            '}',
            '.cr-s.cr-empty { color: rgba(255,255,255,0.22); }',
            '.cr-votes {',
            '  font-size: 9px;',
            '  color: rgba(255,255,255,0.62);',
            '  font-family: sans-serif;',
            '  margin-left: 3px;',
            '  text-shadow: 0 1px 3px rgba(0,0,0,0.8);',
            '}',
            '.cr-detail {',
            '  display: flex;',
            '  flex-direction: column;',
            '  gap: 5px;',
            '  margin: 14px 0 6px;',
            '  font-family: sans-serif;',
            '}',
            '.cr-detail-head {',
            '  display: flex;',
            '  align-items: baseline;',
            '  gap: 8px;',
            '}',
            '.cr-score-big {',
            '  font-size: 32px;',
            '  font-weight: 700;',
            '  color: #fbbf24;',
            '  line-height: 1;',
            '}',
            '.cr-score-denom {',
            '  font-size: 14px;',
            '  color: rgba(255,255,255,0.38);',
            '  font-weight: 400;',
            '}',
            '.cr-detail-votes {',
            '  font-size: 12px;',
            '  color: rgba(255,255,255,0.48);',
            '}',
            '.cr-detail-label {',
            '  font-size: 10px;',
            '  letter-spacing: 0.12em;',
            '  text-transform: uppercase;',
            '  color: rgba(255,255,255,0.38);',
            '  margin-bottom: 2px;',
            '}',
            '.cr-rate-label {',
            '  font-size: 11px;',
            '  color: rgba(255,255,255,0.42);',
            '  font-family: sans-serif;',
            '  margin-top: 6px;',
            '}',
            '.cr-rate-label.cr-rated { color: #fbbf24; }',
            '.cr-irow {',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 5px;',
            '  margin-top: 2px;',
            '}',
            '.cr-istar {',
            '  font-size: 26px;',
            '  cursor: pointer;',
            '  color: rgba(255,255,255,0.2);',
            '  transition: color 0.1s, transform 0.1s;',
            '  user-select: none;',
            '  line-height: 1;',
            '}',
            '.cr-istar.on { color: #fbbf24; transform: scale(1.12); }',
            '.cr-istar:hover { color: #fbbf24; transform: scale(1.18); }',
            '.cr-clear {',
            '  background: none;',
            '  border: 1px solid rgba(255,255,255,0.15);',
            '  color: rgba(255,255,255,0.42);',
            '  border-radius: 3px;',
            '  padding: 2px 10px;',
            '  font-size: 11px;',
            '  cursor: pointer;',
            '  font-family: sans-serif;',
            '  margin-left: 6px;',
            '  transition: all 0.15s;',
            '}',
            '.cr-clear:hover { border-color: rgba(255,255,255,0.35); color: #fff; }'
        ].join('\n');
        document.head.appendChild(s);
    }

    function apiGet(path, cb) {
        fetch(API + path)
            .then(function(r) { return r.json(); })
            .then(function(d) { cb(null, d); })
            .catch(function(e) { cb(e, null); });
    }

    function apiPost(path, body, cb) {
        fetch(API + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function(r) { return r.json(); })
          .then(function(d) { cb(null, d); })
          .catch(function(e) { cb(e, null); });
    }

    function apiDelete(path, cb) {
        fetch(API + path, { method: 'DELETE' })
            .then(function(r) { return r.json(); })
            .then(function(d) { cb(null, d); })
            .catch(function(e) { cb(e, null); });
    }

    function fetchRating(itemId, cb) {
        var c = cache[itemId];
        if (c && (Date.now() - c.ts) < CACHE_TTL) { cb(c); return; }

        var done = 0;
        var result = { avg: null, count: 0, userRating: null, ts: Date.now() };

        function finish() {
            done++;
            if (done === 2 || (done === 1 && !currentUserId)) {
                cache[itemId] = result;
                cb(result);
            }
        }

        apiGet('/rating/' + itemId, function(err, d) {
            if (!err && d) {
                result.avg   = d.avg;
                result.count = d.count || 0;
            }
            finish();
        });

        if (currentUserId) {
            apiGet('/rating/' + itemId + '/user/' + currentUserId, function(err, d) {
                if (!err && d) { result.userRating = d.rating; }
                finish();
            });
        }
    }

    function invalidate(itemId) { delete cache[itemId]; }

    function starsHtml(avg) {
        var html = '';
        var val = avg / 2;
        for (var i = 1; i <= 5; i++) {
            if (val >= i) {
                html += '<span class="cr-s">&#9733;</span>';
            } else if (val >= i - 0.5) {
                html += '<span class="cr-s">&#9734;</span>';
            } else {
                html += '<span class="cr-s cr-empty">&#9733;</span>';
            }
        }
        return html;
    }

    function processCard(card) {
        if (card.getAttribute('data-cr')) { return; }
        card.setAttribute('data-cr', '1');

        var link = card.querySelector('a[data-id], button[data-id], [data-id]');
        if (!link) { return; }
        var itemId = link.getAttribute('data-id');
        if (!itemId || itemId === 'undefined') { return; }

        var imgContainer = card.querySelector('.cardImageContainer');
        if (!imgContainer) { return; }

        imgContainer.style.position = 'relative';
        imgContainer.style.overflow = 'hidden';

        var badge = document.createElement('div');
        badge.className = 'cr-card-badge';
        badge.style.display = 'none';
        imgContainer.appendChild(badge);

        fetchRating(itemId, function(data) {
            if (data.count > 0 && data.avg !== null) {
                badge.innerHTML = '<div class="cr-stars">' + starsHtml(data.avg) + '</div>' +
                                  '<span class="cr-votes">(' + data.count + ')</span>';
                badge.style.display = 'flex';
            }
        });
    }

    function scanCards() {
        var cards = document.querySelectorAll('.card:not([data-cr]), .itemCard:not([data-cr])');
        for (var i = 0; i < cards.length; i++) {
            processCard(cards[i]);
        }
    }

    function getDetailItemId() {
        var hash = window.location.hash || '';
        var m = hash.match(/[?&]id=([a-f0-9]+)/i);
        if (m) { return m[1]; }
        m = window.location.href.match(/[?&]id=([a-f0-9]+)/i);
        if (m) { return m[1]; }
        return null;
    }

    function isDetailPage() {
        return !!(document.querySelector('.itemDetailPage') ||
                  (window.location.hash && window.location.hash.indexOf('itemdetails') !== -1));
    }

    function injectDetailWidget() {
        if (!isDetailPage()) { return; }

        var itemId = getDetailItemId();
        if (!itemId) { return; }

        if (document.querySelector('[data-cr-detail="' + itemId + '"]')) { return; }

        var anchor = document.querySelector('.itemRatingContainer') ||
                     document.querySelector('.itemMiscInfo.itemMiscInfo-top') ||
                     document.querySelector('.itemMiscInfo') ||
                     document.querySelector('.nameOverflowContainer');

        if (!anchor) { return; }

        var widget = document.createElement('div');
        widget.className = 'cr-detail';
        widget.setAttribute('data-cr-detail', itemId);

        if (anchor.nextSibling) {
            anchor.parentNode.insertBefore(widget, anchor.nextSibling);
        } else {
            anchor.parentNode.appendChild(widget);
        }

        fetchRating(itemId, function(data) {
            renderDetailWidget(widget, itemId, data);
        });
    }

    function renderDetailWidget(widget, itemId, data) {
        widget.innerHTML = '';

        var label = document.createElement('div');
        label.className = 'cr-detail-label';
        label.textContent = 'Community Rating';
        widget.appendChild(label);

        var head = document.createElement('div');
        head.className = 'cr-detail-head';

        if (data.count > 0 && data.avg !== null) {
            head.innerHTML = '<span class="cr-score-big">' + data.avg +
                             '<span class="cr-score-denom"> / 10</span></span>' +
                             '<span class="cr-detail-votes">' + data.count +
                             (data.count === 1 ? ' rating' : ' ratings') + '</span>';
        } else {
            head.innerHTML = '<span class="cr-detail-votes" style="font-family:sans-serif;font-size:13px;color:rgba(255,255,255,0.4)">No ratings yet</span>';
        }
        widget.appendChild(head);

        if (!currentUserId) { return; }

        var rateLabel = document.createElement('div');
        rateLabel.className = 'cr-rate-label' + (data.userRating !== null ? ' cr-rated' : '');
        rateLabel.textContent = data.userRating !== null
            ? 'Your rating: ' + data.userRating + ' / 10'
            : 'Rate this:';
        widget.appendChild(rateLabel);

        var irow = document.createElement('div');
        irow.className = 'cr-irow';
        widget.appendChild(irow);

        var committed = data.userRating !== null ? Math.round(data.userRating / 2) : 0;
        var submitTimer = null;

        function buildInteractive(highlight) {
            irow.innerHTML = '';
            for (var n = 1; n <= 5; n++) {
                (function(idx) {
                    var star = document.createElement('span');
                    star.className = 'cr-istar' + (idx <= highlight ? ' on' : '');
                    star.textContent = '\u2605';
                    star.onmouseenter = function() { buildInteractive(idx); };
                    star.onmouseleave = function() { buildInteractive(committed); };
                    star.onclick = function() {
                        committed = idx;
                        buildInteractive(committed);

                        var ratingVal = idx * 2;
                        rateLabel.className = 'cr-rate-label cr-rated';
                        rateLabel.textContent = 'Your rating: ' + ratingVal + ' / 10';

                        if (submitTimer) { clearTimeout(submitTimer); }
                        submitTimer = setTimeout(function() {
                            invalidate(itemId);
                            apiPost('/rating/' + itemId, { userId: currentUserId, rating: ratingVal }, function(err, d) {
                                if (!err && d && d.ok && d.aggregate) {
                                    var fresh = {
                                        avg: d.aggregate.avg,
                                        count: d.aggregate.count,
                                        userRating: ratingVal,
                                        ts: Date.now()
                                    };
                                    cache[itemId] = fresh;
                                    renderDetailWidget(widget, itemId, fresh);
                                    refreshCardBadge(itemId, fresh);
                                }
                            });
                        }, 350);
                    };
                    irow.appendChild(star);
                })(n);
            }

            if (committed > 0) {
                var clearBtn = document.createElement('button');
                clearBtn.className = 'cr-clear';
                clearBtn.textContent = 'Clear';
                clearBtn.onclick = function() {
                    if (submitTimer) { clearTimeout(submitTimer); }
                    invalidate(itemId);
                    apiDelete('/rating/' + itemId + '/user/' + currentUserId, function(err, d) {
                        var fresh = { avg: null, count: 0, userRating: null, ts: Date.now() };
                        if (!err && d && d.aggregate) {
                            fresh.avg   = d.aggregate.avg || null;
                            fresh.count = d.aggregate.count || 0;
                        }
                        cache[itemId] = fresh;
                        committed = 0;
                        renderDetailWidget(widget, itemId, fresh);
                        refreshCardBadge(itemId, fresh);
                    });
                };
                irow.appendChild(clearBtn);
            }
        }

        buildInteractive(committed);
    }

    function refreshCardBadge(itemId, data) {
        var links = document.querySelectorAll('[data-id="' + itemId + '"]');
        for (var i = 0; i < links.length; i++) {
            var card = links[i].closest('.card, .itemCard');
            if (!card) { continue; }
            var badge = card.querySelector('.cr-card-badge');
            if (!badge) { continue; }
            if (data.count > 0 && data.avg !== null) {
                badge.innerHTML = '<div class="cr-stars">' + starsHtml(data.avg) + '</div>' +
                                  '<span class="cr-votes">(' + data.count + ')</span>';
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    var scanScheduled = false;
    function scheduleScan() {
        if (scanScheduled) { return; }
        scanScheduled = true;
        setTimeout(function() {
            scanScheduled = false;
            scanCards();
            injectDetailWidget();
        }, 80);
    }

    function startObserver() {
        scheduleScan();
        var mo = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType !== 1) { continue; }
                    var tag = n.tagName ? n.tagName.toLowerCase() : '';
                    if (tag === 'div' || tag === 'a' || tag === 'section' || tag === 'main') {
                        scheduleScan();
                        break;
                    }
                }
            }
        });
        mo.observe(document.body, { childList: true, subtree: true });
    }

    function watchNavigation() {
        var lastHash = '';
        function onHashChange() {
            var h = window.location.hash;
            if (h === lastHash) { return; }
            lastHash = h;
            var old = document.querySelectorAll('[data-cr-detail]');
            for (var i = 0; i < old.length; i++) {
                old[i].removeAttribute('data-cr-detail');
                if (old[i].parentNode) { old[i].parentNode.removeChild(old[i]); }
            }
            setTimeout(function() {
                scanCards();
                injectDetailWidget();
            }, 350);
        }
        window.addEventListener('hashchange', onHashChange);
        var origPush = history.pushState;
        history.pushState = function() {
            origPush.apply(history, arguments);
            setTimeout(onHashChange, 350);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();

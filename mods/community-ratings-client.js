(function() {

    var MOD_ID = 'community-ratings';
    var API    = '/JellyFrame/mods/' + MOD_ID + '/api';

    var currentUserId = null;
    var cache = {};
    var CACHE_TTL = 30000;

    function boot() {
        resolveUser(function() {
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
                        p.then(function(u) {
                            if (u && u.Id) { currentUserId = u.Id; }
                            cb();
                        }).catch(function() { cb(); });
                        return;
                    }
                    if (p && p.Id) { currentUserId = p.Id; }
                    cb();
                    return;
                } catch(e) {}
            }
            if (tries > 0) {
                setTimeout(function() { attempt(tries - 1); }, 400);
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

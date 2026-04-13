(function () {
    var MOD_ID = 'hot-library';
    var API = '/JellyFrame/mods/' + MOD_ID + '/api';

    var currentUserId = null;
    var queue = [];
    var queueTimer = null;
    var cache = {};

    var SKIP_TYPES = {
        'CollectionFolder': true, 'UserView': true,
        'Folder': true, 'Channel': true, 'ChannelFolderItem': true,
        'Person': true, 'Genre': true, 'Studio': true
    };

    function boot() {
        resolveUser(function () {
            injectStyles();
            startObserver();
            scanCards();
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

    function injectStyles() {
        if (document.getElementById('jf-hot-library-styles')) { return; }

        var css = [
            '.cardScalable { position: relative; }',
            '.cardScalable::after {',
            '  content: "";',
            '  position: absolute;',
            '  top: 0; left: 0; right: 0; bottom: 0;',
            '  pointer-events: none;',
            '  border-radius: inherit;',
            '  transition: box-shadow 0.4s ease, border 0.4s ease;',
            '  z-index: 5;',
            '}',
            '@keyframes pulseScorch {',
            '  0%, 100% { box-shadow: inset 0 0 10px 2px rgba(239, 68, 68, 0.7); }',
            '  50% { box-shadow: inset 0 0 16px 4px rgba(239, 68, 68, 0.95); }',
            '}',
            '@keyframes pulseWarm {',
            '  0%, 100% { box-shadow: inset 0 0 8px 1px rgba(234, 179, 8, 0.6); }',
            '  50% { box-shadow: inset 0 0 12px 2px rgba(234, 179, 8, 0.85); }',
            '}',
            '@keyframes pulseCold {',
            '  0%, 100% { box-shadow: inset 0 0 5px 1px rgba(56, 189, 248, 0.4); }',
            '  50% { box-shadow: inset 0 0 8px 2px rgba(56, 189, 248, 0.65); }',
            '}',
            '.jf-heat-scorch .cardScalable::after {',
            '  border: 1.5px solid rgba(239, 68, 68, 0.8) !important;',
            '  animation: pulseScorch 2s ease-in-out infinite;',
            '}',
            '.jf-heat-warm .cardScalable::after {',
            '  border: 1.5px solid rgba(234, 179, 8, 0.7) !important;',
            '  animation: pulseWarm 3s ease-in-out infinite;',
            '}',
            '.jf-heat-cold .cardScalable::after {',
            '  border: 1px solid rgba(56, 189, 248, 0.5) !important;',
            '  animation: pulseCold 4s ease-in-out infinite;',
            '}'
        ].join('\n');

        var s = document.createElement('style');
        s.id = 'jf-hot-library-styles';
        s.textContent = css;
        document.head.appendChild(s);
    }

    function processQueue() {
        if (!queue.length || !currentUserId) return;
        var batch = queue.slice();
        queue = [];

        fetch(API + '/heat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: batch, userId: currentUserId })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.heat) {
                    for (var id in data.heat) {
                        cache[id] = data.heat[id];
                        applyHeat(id, data.heat[id]);
                    }
                }
            })
            .catch(function (e) { console.error('Heat fetch error', e); });
    }

    function queueCard(id) {
        if (cache[id] !== undefined) {
            applyHeat(id, cache[id]);
            return;
        }
        if (queue.indexOf(id) === -1) {
            queue.push(id);
        }
        clearTimeout(queueTimer);
        queueTimer = setTimeout(processQueue, 200);
    }

    function applyHeat(id, playCount) {
        var cards = document.querySelectorAll('.card[data-id="' + id + '"], .itemCard[data-id="' + id + '"]');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];

            card.classList.remove('jf-heat-scorch', 'jf-heat-warm', 'jf-heat-cold');

            if (playCount >= 5) {
                card.classList.add('jf-heat-scorch');
            } else if (playCount >= 1) {
                card.classList.add('jf-heat-warm');
            } else {
                card.classList.add('jf-heat-cold');
            }

            card.setAttribute('data-heat-applied', '1');
            card.removeAttribute('data-heat-queued');
        }
    }

    function scanCards() {
        var cards = document.querySelectorAll('.card:not([data-heat-queued]):not([data-heat-applied]), .itemCard:not([data-heat-queued]):not([data-heat-applied])');

        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var type = card.getAttribute('data-type') || '';

            if (SKIP_TYPES[type]) {
                card.setAttribute('data-heat-applied', 'skip');
                continue;
            }

            var id = card.getAttribute('data-id');
            if (!id) {
                var inner = card.querySelector('[data-id]');
                if (inner) id = inner.getAttribute('data-id');
            }

            if (id && id !== 'undefined') {
                card.setAttribute('data-heat-queued', '1');
                queueCard(id);
            } else {
                card.setAttribute('data-heat-applied', 'invalid');
            }
        }
    }

    function startObserver() {
        var mo = new MutationObserver(function (mutations) {
            var shouldScan = false;
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType === 1 && (n.classList.contains('card') || n.querySelector('.card'))) {
                        shouldScan = true;
                        break;
                    }
                }
                if (shouldScan) break;
            }
            if (shouldScan) {
                setTimeout(scanCards, 50);
            }
        });
        mo.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();

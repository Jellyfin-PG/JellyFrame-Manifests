jf.onStart(function() {
    jf.log.info('Community Ratings started');
    if (jf.store.get('ratings') === null) {
        jf.store.set('ratings', '{}');
    }
});

jf.onStop(function() {
    jf.log.info('Community Ratings stopped');
});

function loadRatings() {
    try {
        return JSON.parse(jf.store.get('ratings') || '{}');
    } catch(e) {
        return {};
    }
}

function saveRatings(map) {
    jf.store.set('ratings', JSON.stringify(map));
}

function recalcItem(itemId) {
    var map = loadRatings();
    var users = jf.jellyfin.getUsers() || [];
    var total = 0;
    var count = 0;
    for (var i = 0; i < users.length; i++) {
        var uid = users[i].id;
        var raw = jf.userStore.get(uid, 'rating:' + itemId);
        if (raw !== null) {
            var val = parseFloat(raw);
            if (!isNaN(val) && val >= 0 && val <= 10) {
                total += val;
                count++;
            }
        }
    }
    if (count > 0) {
        map[itemId] = { total: total, count: count, avg: Math.round((total / count) * 10) / 10 };
    } else {
        delete map[itemId];
    }
    saveRatings(map);
    return map[itemId] || null;
}

jf.routes.get('/rating/:itemId', function(req, res) {
    var itemId = req.pathParams['itemId'];
    if (!itemId) {
        return res.status(400).json({ error: 'itemId required' });
    }
    var map = loadRatings();
    var entry = map[itemId] || null;
    return res.json({
        itemId: itemId,
        avg: entry ? entry.avg : null,
        count: entry ? entry.count : 0
    });
});

jf.routes.get('/rating/:itemId/user/:userId', function(req, res) {
    var itemId = req.pathParams['itemId'];
    var userId = req.pathParams['userId'];
    if (!itemId || !userId) {
        return res.status(400).json({ error: 'itemId and userId required' });
    }
    var raw = jf.userStore.get(userId, 'rating:' + itemId);
    var rating = raw !== null ? parseFloat(raw) : null;
    return res.json({
        itemId: itemId,
        userId: userId,
        rating: (rating !== null && !isNaN(rating)) ? rating : null
    });
});

jf.routes.post('/rating/:itemId', function(req, res) {
    var itemId = req.pathParams['itemId'];
    var body = req.body || {};
    var userId = body.userId ? String(body.userId) : null;
    var ratingRaw = body.rating;

    if (!itemId || !userId) {
        return res.status(400).json({ error: 'itemId and userId required' });
    }

    if (ratingRaw === null || ratingRaw === undefined || String(ratingRaw) === 'null') {
        jf.userStore.delete(userId, 'rating:' + itemId);
        var agg = recalcItem(itemId);
        return res.json({ ok: true, cleared: true, aggregate: agg });
    }

    var rating = parseFloat(String(ratingRaw));
    if (isNaN(rating) || rating < 0 || rating > 10) {
        return res.status(400).json({ error: 'rating must be 0-10' });
    }
    rating = Math.round(rating * 2) / 2;

    jf.userStore.set(userId, 'rating:' + itemId, String(rating));
    var agg = recalcItem(itemId);
    return res.json({ ok: true, rating: rating, aggregate: agg });
});

jf.routes.delete('/rating/:itemId/user/:userId', function(req, res) {
    var itemId = req.pathParams['itemId'];
    var userId = req.pathParams['userId'];
    if (!itemId || !userId) {
        return res.status(400).json({ error: 'itemId and userId required' });
    }
    jf.userStore.delete(userId, 'rating:' + itemId);
    var agg = recalcItem(itemId);
    return res.json({ ok: true, aggregate: agg });
});

jf.routes.get('/ratings/top', function(req, res) {
    var limit = parseInt(req.query['limit'] || '20', 10);
    if (isNaN(limit) || limit < 1) { limit = 20; }
    if (limit > 100) { limit = 100; }

    var map = loadRatings();
    var entries = [];
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var e = map[id];
        if (e && e.count > 0) {
            entries.push({ itemId: id, avg: e.avg, count: e.count });
        }
    }
    entries.sort(function(a, b) {
        if (b.avg !== a.avg) { return b.avg - a.avg; }
        return b.count - a.count;
    });
    return res.json({ items: entries.slice(0, limit), total: entries.length });
});

jf.routes.get('/ratings/user/:userId', function(req, res) {
    var userId = req.pathParams['userId'];
    if (!userId) {
        return res.status(400).json({ error: 'userId required' });
    }
    var allKeys = jf.userStore.keys(userId);
    var ratings = [];
    for (var i = 0; i < allKeys.length; i++) {
        var key = allKeys[i];
        if (key.indexOf('rating:') === 0) {
            var itemId = key.substring('rating:'.length);
            var raw = jf.userStore.get(userId, key);
            var val = raw !== null ? parseFloat(raw) : null;
            if (val !== null && !isNaN(val)) {
                ratings.push({ itemId: itemId, rating: val });
            }
        }
    }
    return res.json({ userId: userId, ratings: ratings, count: ratings.length });
});

// Standard ordered list of ratings from lowest to highest
var ratingOrder = ['G', 'TVY', 'TVG', 'TVY7', 'TVY7FV', 'PG', 'TVPG', 'PG13', 'TV14', 'R', 'TVMA', 'NC17'];

function isRatingAllowed(rating, maxRating) {
    if (!rating) {
        return true;
    }
    var r = rating.toUpperCase().replace(/-/g, '').replace(/_/g, '').replace(/ /g, '');
    
    var maxIdx = ratingOrder.indexOf(maxRating);
    if (maxIdx === -1) {
        maxIdx = ratingOrder.indexOf('PG13');
    }
    
    var allowed = ratingOrder.slice(0, maxIdx + 1);
    
    for (var i = 0; i < allowed.length; i++) {
        if (r === allowed[i]) {
            return true;
        }
    }
    return false;
}

function handlePlaybackStarted(data) {
    var sessionId = data.sessionId;
    var itemId = data.itemId;

    var sessions = jf.jellyfin.getSessions() || [];
    var session = null;
    for (var i = 0; i < sessions.length; i++) {
        if (sessions[i].id === sessionId) {
            session = sessions[i];
            break;
        }
    }

    if (!session) {
        return;
    }

    var userId = session.userId;
    var pDataStr = jf.userStore.get(userId, 'parental');
    if (!pDataStr) {
        return;
    }

    var pData = JSON.parse(pDataStr);
    if (!pData.locked) {
        return;
    }

    var item = jf.jellyfin.getItem(itemId, userId);
    if (!item) {
        return;
    }

    var maxRating = pData.maxRating || 'PG13';
    if (!isRatingAllowed(item.officialRating, maxRating)) {
        jf.log.info('Parental lock: blocking playback of item ' + itemId + ' for user ' + userId);
        jf.jellyfin.stopPlayback(sessionId);
        jf.jellyfin.sendMessageToSession(sessionId, 'Parental Lock', 'This content exceeds your maximum allowed rating.', 5000);
    }
}

jf.onStart(function() {
    jf.jellyfin.on('playback.started', handlePlaybackStarted);
    jf.log.info('Parental Lock mod started.');
});

jf.onStop(function() {
    jf.jellyfin.off('playback.started');
    jf.log.info('Parental Lock mod stopped.');
});

jf.routes.get('/status', function(req, res) {
    var userId = req.query['userId'] ? String(req.query['userId']) : null;
    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    var dataStr = jf.userStore.get(userId, 'parental');
    if (!dataStr) {
        return res.json({ isSetup: false, isLocked: false, maxRating: 'PG13' });
    }
    var data = JSON.parse(dataStr);
    
    return res.json({ isSetup: true, isLocked: data.locked, maxRating: data.maxRating || 'PG13' });
});

jf.routes.post('/setup', function(req, res) {
    var body = req.body;
    if (!body) {
        return res.status(400).json({ error: 'Missing body' });
    }
    var userId = body.userId ? String(body.userId) : null;
    var pin = body.pin ? String(body.pin) : null;
    var maxRating = body.maxRating ? String(body.maxRating) : 'PG13';

    if (!userId || !pin || pin.length !== 4) {
        return res.status(400).json({ error: 'Missing userId or invalid PIN' });
    }

    var existing = jf.userStore.get(userId, 'parental');
    if (existing) {
        return res.status(400).json({ error: 'Already setup' });
    }

    jf.userStore.set(userId, 'parental', JSON.stringify({ 
        pin: pin, 
        locked: true, 
        maxRating: maxRating 
    }));
    
    return res.json({ ok: true, isLocked: true });
});

jf.routes.post('/unlock', function(req, res) {
    var body = req.body;
    if (!body) {
        return res.status(400).json({ error: 'Missing body' });
    }
    var userId = body.userId ? String(body.userId) : null;
    var pin = body.pin ? String(body.pin) : null;

    if (!userId || !pin) {
        return res.status(400).json({ error: 'Missing args' });
    }

    var dataStr = jf.userStore.get(userId, 'parental');
    if (!dataStr) {
        return res.status(400).json({ error: 'Not setup' });
    }
    
    var data = JSON.parse(dataStr);
    if (data.pin !== pin) {
        return res.status(401).json({ error: 'Invalid PIN' });
    }

    data.locked = false;
    jf.userStore.set(userId, 'parental', JSON.stringify(data));
    return res.json({ ok: true, isLocked: false });
});

jf.routes.post('/lock', function(req, res) {
    var body = req.body;
    if (!body) {
        return res.status(400).json({ error: 'Missing body' });
    }
    var userId = body.userId ? String(body.userId) : null;

    if (!userId) {
        return res.status(400).json({ error: 'Missing args' });
    }

    var dataStr = jf.userStore.get(userId, 'parental');
    if (!dataStr) {
        return res.status(400).json({ error: 'Not setup' });
    }
    
    var data = JSON.parse(dataStr);
    data.locked = true;
    jf.userStore.set(userId, 'parental', JSON.stringify(data));
    return res.json({ ok: true, isLocked: true });
});

jf.routes.post('/remove', function(req, res) {
    var body = req.body;
    if (!body) {
        return res.status(400).json({ error: 'Missing body' });
    }
    var userId = body.userId ? String(body.userId) : null;
    var pin = body.pin ? String(body.pin) : null;

    if (!userId || !pin) {
        return res.status(400).json({ error: 'Missing args' });
    }

    var dataStr = jf.userStore.get(userId, 'parental');
    if (!dataStr) {
        return res.status(400).json({ error: 'Not setup' });
    }
    
    var data = JSON.parse(dataStr);
    if (data.pin !== pin) {
        return res.status(401).json({ error: 'Invalid PIN' });
    }

    jf.userStore.delete(userId, 'parental');
    return res.json({ ok: true });
});

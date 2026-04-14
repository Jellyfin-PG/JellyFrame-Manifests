
var QUEUE_KEY = 'quickqueue:data';
var QUEUE_VERSION = 1;

jf.onStart(function() {
    jf.log.info('Quick Queue mod started');
    
    jf.routes.get('/queue', handleGetQueue);
    jf.routes.post('/queue', handleAddToQueue);
    jf.routes.put('/queue', handleUpdateQueue);
    jf.routes.delete('/queue/:index', handleRemoveFromQueue);
    jf.routes.delete('/queue', handleClearQueue);
    jf.routes.post('/queue/next', handleGetNextItem);
    
    if (jf.vars['AUTO_PLAY_NEXT'] === '1') {
        jf.jellyfin.on('playback.stopped', onPlaybackStopped);
    }
});

jf.onStop(function() {
    jf.jellyfin.off('playback.stopped');
    jf.log.info('Quick Queue mod stopped');
});

function handleGetQueue(req, res) {
    var userId = req.query['userId'];
    if (!userId) {
        return res.status(400).json({ error: 'userId required' });
    }
    
    var queue = loadQueue(userId);
    return res.json({ items: queue.items || [], version: queue.version });
}

function handleAddToQueue(req, res) {
    var userId = req.query['userId'];
    var body = req.body || {};
    
    if (!userId || !body.itemId) {
        return res.status(400).json({ error: 'userId and itemId required' });
    }
    
    var item = jf.jellyfin.getItem(String(body.itemId), userId);
    if (!item) {
        return res.status(404).json({ error: 'item not found' });
    }
    
    var queue = loadQueue(userId);
    var newItem = {
        id: item.id,
        name: item.name,
        type: item.type,
        addedAt: new Date().toISOString()
    };
    
    for (var i = 0; i < queue.items.length; i++) {
        if (queue.items[i].id === item.id) {
            return res.json({ items: queue.items, version: queue.version, duplicate: true });
        }
    }
    
    queue.items.push(newItem);
    queue.updatedAt = new Date().toISOString();
    saveQueue(userId, queue);
    notifyQueueUpdate(userId);
    
    return res.json({ items: queue.items, version: queue.version, added: newItem });
}

function handleUpdateQueue(req, res) {
    var userId = req.query['userId'];
    var body = req.body || {};
    
    if (!userId || !body.items) {
        return res.status(400).json({ error: 'userId and items array required' });
    }
    
    var queue = loadQueue(userId);
    queue.items = body.items;
    queue.updatedAt = new Date().toISOString();
    saveQueue(userId, queue);
    notifyQueueUpdate(userId);
    
    return res.json({ items: queue.items, version: queue.version });
}

function handleRemoveFromQueue(req, res) {
    var userId = req.query['userId'];
    var index = parseInt(req.pathParams['index'], 10);
    
    if (!userId || isNaN(index)) {
        return res.status(400).json({ error: 'userId and valid index required' });
    }
    
    var queue = loadQueue(userId);
    if (index < 0 || index >= queue.items.length) {
        return res.status(404).json({ error: 'index out of bounds' });
    }
    
    var removed = queue.items.splice(index, 1)[0];
    queue.updatedAt = new Date().toISOString();
    saveQueue(userId, queue);
    notifyQueueUpdate(userId);
    
    return res.json({ items: queue.items, version: queue.version, removed: removed });
}

function handleClearQueue(req, res) {
    var userId = req.query['userId'];
    if (!userId) {
        return res.status(400).json({ error: 'userId required' });
    }
    
    saveQueue(userId, { items: [], version: QUEUE_VERSION, updatedAt: new Date().toISOString() });
    notifyQueueUpdate(userId);
    
    return res.json({ items: [], version: QUEUE_VERSION, cleared: true });
}

function handleGetNextItem(req, res) {
    var userId = req.query['userId'];
    var body = req.body || {};
    var currentItemId = body.currentItemId ? String(body.currentItemId) : null;
    
    var queue = loadQueue(userId);
    if (!queue.items || queue.items.length === 0) {
        return res.json({ next: null, queueEmpty: true });
    }

    if (currentItemId) {
        for (var i = 0; i < queue.items.length; i++) {
            if (queue.items[i].id === currentItemId) {
                queue.items.splice(i, 1);
                break;
            }
        }
        queue.updatedAt = new Date().toISOString();
        saveQueue(userId, queue);
        notifyQueueUpdate(userId);
    }
    
    var next = queue.items[0] || null;
    return res.json({ next: next, remaining: queue.items.length });
}

function loadQueue(userId) {
    var raw = jf.userStore.get(userId, QUEUE_KEY);
    if (!raw) {
        return { items: [], version: QUEUE_VERSION, updatedAt: null };
    }
    
    try {
        var queue = JSON.parse(raw);
        var ttlHours = parseInt(jf.vars['PERSIST_TTL_HOURS'] || '24', 10);
        if (queue.updatedAt && ttlHours > 0) {
            var ageHours = (new Date() - new Date(queue.updatedAt)) / 3600000;
            if (ageHours > ttlHours) {
                return { items: [], version: QUEUE_VERSION, updatedAt: null };
            }
        }
        return queue;
    } catch (e) {
        jf.log.warn('Failed to parse queue for user ' + userId + ': ' + e.message);
        return { items: [], version: QUEUE_VERSION, updatedAt: null };
    }
}

function saveQueue(userId, queue) {
    if (jf.vars['PERSIST_QUEUE'] !== '1') {
        jf.cache.set('queue:' + userId, JSON.stringify(queue), 300000);
        return;
    }
    jf.userStore.set(userId, QUEUE_KEY, JSON.stringify(queue));
}

function notifyQueueUpdate(userId) {
    if (jf.vars['SYNC_ACROSS_DEVICES'] !== '1') {
        return;
    }
    var count = jf.jellyfin.notify(userId, {
        title: 'Queue Updated',
        body: 'Your quick queue has changed',
        type: 'queue:update',
        modId: 'quick-queue',
        data: { timestamp: new Date().toISOString() }
    });
    jf.log.debug('Notified ' + count + ' sessions of queue update for user ' + userId);
}

function onPlaybackStopped(data) {
    var userId = data.userId;
    if (!userId) return;
    
    var queue = loadQueue(userId);
    if (!queue.items || queue.items.length === 0) return;
    
    var next = queue.items[0];
    var sessions = jf.jellyfin.getSessionsForUser(userId) || [];
    
    for (var i = 0; i < sessions.length; i++) {
        var session = sessions[i];
        if (session.id === data.sessionId && session.supportsMediaControl) {
            queue.items.shift();
            queue.updatedAt = new Date().toISOString();
            saveQueue(userId, queue);
            notifyQueueUpdate(userId);
            
            jf.jellyfin.playItem(session.id, next.id);
            jf.log.info('Auto-played next queue item: ' + next.name + ' for user ' + userId);
            break;
        }
    }
}

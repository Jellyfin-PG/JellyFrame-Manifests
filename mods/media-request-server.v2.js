var STORE_KEY = 'requests';

function loadRequests() {
    var raw = jf.store.get(STORE_KEY);
    if (!raw) {
        return [];
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function saveRequests(list) {
    jf.store.set(STORE_KEY, JSON.stringify(list));
}

function nextId(list) {
    var max = 0;
    for (var i = 0; i < list.length; i++) {
        var n = parseInt(list[i].id, 10) || 0;
        if (n > max) {
            max = n;
        }
    }
    return String(max + 1);
}

// Automatically filter lists based on privileges to prevent data leaks
jf.routes.get('/requests', function (req, res) {
    var userId = (req.query && req.query['userId']) ? String(req.query['userId']).trim() : '';
    var list = loadRequests();

    var user = jf.jellyfin.getUser(userId);
    var isAdmin = false;
    
    if (user && user.policy && user.policy.isAdministrator) {
        isAdmin = true;
    }

    var filtered = [];
    for (var i = 0; i < list.length; i++) {
        // Admins see everything. Standard users only see their own.
        if (isAdmin || list[i].userId === userId) {
            filtered.push(list[i]);
        }
    }

    return res.json({ 
        count: filtered.length, 
        requests: filtered,
        isAdmin: isAdmin
    });
});

jf.routes.post('/requests', function (req, res) {
    var body = req.body || {};

    var title    = body.title    ? String(body.title).trim()    : '';
    var type     = body.type     ? String(body.type).trim()     : '';
    var year     = body.year     ? String(body.year).trim()     : '';
    var note     = body.note     ? String(body.note).trim()     : '';
    var userId   = body.userId   ? String(body.userId).trim()   : '';
    var userName = body.userName ? String(body.userName).trim() : '';

    if (!title || !type) {
        return res.status(400).json({ error: 'title and type are required' });
    }

    var list  = loadRequests();
    var entry = {
        id:        nextId(list),
        title:     title,
        type:      type,
        year:      year,
        note:      note,
        userId:    userId,
        userName:  userName,
        status:    'pending',
        createdAt: new Date().toISOString()
    };
    list.push(entry);
    saveRequests(list);

    jf.log.info('[media-request] New request: ' + title + ' (' + type + ') from ' + (userName || userId || 'unknown'));

    var webhookUrl = (jf.vars['WEBHOOK_URL'] || '').trim();
    if (webhookUrl) {
        var payload = {
            content: 'New media request from ' + (userName || 'unknown') + ': ' + title + ' (' + type + (year ? ', ' + year : '') + ')',
            request: entry
        };
        var webhookSecret = (jf.vars['WEBHOOK_SECRET'] || '').trim();
        var opts = { timeout: 8000 };
        if (webhookSecret) {
            opts.secret = webhookSecret;
        }
        var result = jf.webhooks.send(webhookUrl, payload, opts);
        if (!result.ok) {
            jf.log.warn('[media-request] Webhook delivery failed: ' + result.status);
        }
    }

    return res.json({ ok: true, request: entry });
});

// Secured: Only Administrators can Patch/Update Statuses
jf.routes.patch('/requests/:id', function (req, res) {
    var id      = req.pathParams['id'];
    var body    = req.body || {};
    var status  = body.status ? String(body.status).trim() : '';
    var adminId = body.adminId ? String(body.adminId).trim() : '';

    var adminUser = jf.jellyfin.getUser(adminId);
    if (!adminUser || !adminUser.policy || !adminUser.policy.isAdministrator) {
        return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
    }

    var valid    = ['pending', 'approved', 'declined', 'available'];
    var isValid  = false;
    for (var i = 0; i < valid.length; i++) {
        if (valid[i] === status) {
            isValid = true;
            break;
        }
    }
    
    if (!isValid) {
        return res.status(400).json({ error: 'status must be pending, approved, declined, or available' });
    }

    var list  = loadRequests();
    var found = false;
    for (var j = 0; j < list.length; j++) {
        if (list[j].id === id) {
            list[j].status    = status;
            list[j].updatedAt = new Date().toISOString();
            found = true;
            break;
        }
    }

    if (!found) {
        return res.status(404).json({ error: 'request not found' });
    }
    
    saveRequests(list);
    return res.json({ ok: true });
});

// Secured: Only Administrators can Delete Requests
jf.routes.delete('/requests/:id', function (req, res) {
    var id      = req.pathParams['id'];
    var adminId = (req.query && req.query['adminId']) ? String(req.query['adminId']).trim() : '';

    var adminUser = jf.jellyfin.getUser(adminId);
    if (!adminUser || !adminUser.policy || !adminUser.policy.isAdministrator) {
        return res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
    }

    var list    = loadRequests();
    var newList = [];
    var found   = false;
    
    for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) {
            found = true;
        } else {
            newList.push(list[i]);
        }
    }
    
    if (!found) {
        return res.status(404).json({ error: 'request not found' });
    }
    
    saveRequests(newList);
    return res.json({ ok: true });
});

jf.onStart(function () {
    jf.log.info('[media-request] started');
});

jf.onStop(function () {
    jf.log.info('[media-request] stopped');
});

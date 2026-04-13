// Jint 4.1.0 Backend - Must use ES5 Syntax (var, function)

jf.onStart(function() {
    jf.log.info('Hot Library Heatmap Backend initialized.');
});

jf.onStop(function() {
    jf.log.info('Hot Library Heatmap Backend stopped.');
});

jf.routes.post('/heat', function(req, res) {
    if (!req.body || !req.body.ids) {
        return res.status(400).json({ error: 'Missing ids array' });
    }

    var ids = req.body.ids; 
    var results = {};
    
    var users = jf.jellyfin.getUsers() || [];

    for (var i = 0; i < ids.length; i++) {
        var id = String(ids[i]);
        var cacheKey = 'global_heat_' + id;
        
        var cachedHeat = jf.cache.get(cacheKey);
        
        if (cachedHeat !== null) {
            results[id] = cachedHeat;
        } else {
            var totalPlays = 0;
            
            for (var u = 0; u < users.length; u++) {
                var userData = jf.jellyfin.getUserData(id, users[u].id);
                if (userData && userData.playCount) {
                    totalPlays += userData.playCount;
                }
            }
            
            results[id] = totalPlays;
            
            jf.cache.set(cacheKey, totalPlays, 600000);
        }
    }

    return res.json({ heat: results });
});

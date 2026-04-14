var DEFAULT_THEMES_URL = 'https://cdn.jsdelivr.net/gh/Jellyfin-PG/JellyFrame-Resources@main/themes.json';

function getThemes() {
    var cached = jf.cache.get('themes');
    if (cached) {
        return cached;
    }

    // You can optionally override this using a mod variable "THEMES_URL"
    var url = jf.vars['THEMES_URL'] || DEFAULT_THEMES_URL;
    var r = jf.http.get(url, { timeout: 10000 });
    
    if (r.ok) {
        var themes = r.json();
        // Cache for 1 hour (3,600,000 ms) to prevent spamming the URL
        jf.cache.set('themes', themes, 60 * 60 * 1000); 
        return themes;
    } else {
        jf.log.error('Failed to fetch themes from ' + url + ': HTTP ' + r.status);
        return [];
    }
}

jf.onStart(function() {
    jf.log.info('User Theme Selector started.');
    getThemes(); // Pre-fetch the themes on server startup
});

// Serve the list of themes
jf.routes.get('/themes', function(req, res) {
    return res.json(getThemes());
});

// Get a user's selected theme
jf.routes.get('/selection/:user', function(req, res) {
    var userId = req.pathParams['user'];
    var themeId = jf.userStore.get(userId, 'selected_theme') || '';
    return res.json({ theme: themeId });
});

// Save a user's selected theme
jf.routes.post('/selection/:user', function(req, res) {
    var userId = req.pathParams['user'];
    var body = req.body || {};
    var themeId = body.theme ? String(body.theme) : '';
    
    jf.userStore.set(userId, 'selected_theme', themeId);
    return res.json({ ok: true, theme: themeId });
});

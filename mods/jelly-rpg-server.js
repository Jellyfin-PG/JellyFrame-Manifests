// Runs inside Jellyfin via Jint 4.1.0
// Features: Manual Stats, Level Points, Classes, and Genre-based Realms.

jf.onStart(function() {
    jf.log.info('Jelly RPG Realms Engine Started');
    jf.jellyfin.on('playback.stopped', handlePlaybackStopped);
});

jf.onStop(function() {
    jf.jellyfin.off('playback.stopped');
});

function getLevelData(xp) {
    var level = Math.floor(Math.sqrt(xp / 50)) + 1;
    var currentLevelXp = Math.pow(level - 1, 2) * 50;
    var nextLevelXp = Math.pow(level, 2) * 50;
    var progress = 0;
    if (nextLevelXp > currentLevelXp) {
        progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
    }
    return { level: level, progress: Math.min(Math.max(progress, 0), 100), xp: xp, nextXp: nextLevelXp };
}

function getPlayerClass(stats) {
    var maxStat = 'str';
    var maxVal = stats.str;
    var keys = ['int', 'cha', 'dex', 'wis', 'con'];
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (stats[k] > maxVal) { maxVal = stats[k]; maxStat = k; }
    }
    if (maxVal === 0) return "Novice";
    if (maxStat === 'str') return "Barbarian";
    if (maxStat === 'int') return "Wizard";
    if (maxStat === 'cha') return "Bard";
    if (maxStat === 'dex') return "Rogue";
    if (maxStat === 'wis') return "Cleric";
    if (maxStat === 'con') return "Paladin";
    return "Novice";
}

function updateRealmScores(realmScores, genres) {
    if (!genres || genres.length === 0) return realmScores;
    
    for (var i = 0; i < genres.length; i++) {
        var g = genres[i].toLowerCase();
        if (g.indexOf('action') !== -1 || g.indexOf('adventure') !== -1 || g.indexOf('sport') !== -1 || g.indexOf('war') !== -1) { realmScores.iron++; }
        else if (g.indexOf('documentary') !== -1 || g.indexOf('sci-fi') !== -1 || g.indexOf('science fiction') !== -1 || g.indexOf('mystery') !== -1 || g.indexOf('thriller') !== -1) { realmScores.arcane++; }
        else if (g.indexOf('comedy') !== -1 || g.indexOf('romance') !== -1 || g.indexOf('music') !== -1 || g.indexOf('reality') !== -1) { realmScores.hearts++; }
        else if (g.indexOf('drama') !== -1 || g.indexOf('history') !== -1 || g.indexOf('fantasy') !== -1 || g.indexOf('crime') !== -1) { realmScores.grove++; }
        else if (g.indexOf('horror') !== -1 || g.indexOf('suspense') !== -1) { realmScores.shadow++; }
        else if (g.indexOf('animation') !== -1 || g.indexOf('anime') !== -1 || g.indexOf('family') !== -1 || g.indexOf('kids') !== -1) { realmScores.dream++; }
    }
    return realmScores;
}

function getDominantRealm(scores) {
    var maxRealm = 'Nomad';
    var maxVal = 0;
    
    var map = {
        'iron': 'Realm of Iron',
        'arcane': 'Arcane Academy',
        'hearts': 'Court of Hearts',
        'grove': 'Grove of Whispers',
        'shadow': 'Shadowed Depths',
        'dream': 'The Woven Dream'
    };

    var keys = ['iron', 'arcane', 'hearts', 'grove', 'shadow', 'dream'];
    for (var i = 0; i < keys.length; i++) {
        if (scores[keys[i]] > maxVal) {
            maxVal = scores[keys[i]];
            maxRealm = map[keys[i]];
        }
    }
    return maxRealm;
}

function getOrCreateProfile(userId) {
    var str = jf.userStore.get(userId, 'rpg_char');
    if (str) return JSON.parse(str);

    var newProf = { 
        xp: 0, 
        stats: { str: 0, int: 0, cha: 0, dex: 0, wis: 0, con: 0 },
        availablePoints: 0,
        realmScores: { iron: 0, arcane: 0, hearts: 0, grove: 0, shadow: 0, dream: 0 },
        history: { movies: 0, episodes: 0 }
    };

    var items = jf.jellyfin.getItems({
        userId: userId, sortBy: 'PlayCount', sortOrder: 'Descending', limit: '500', recursive: 'true'
    }) || [];

    for (var i = 0; i < items.length; i++) {
        var ud = jf.jellyfin.getUserData(items[i].id, userId);
        if (ud && ud.playCount > 0) {
            if (items[i].type === 'Movie') { newProf.xp += 150; newProf.history.movies++; }
            if (items[i].type === 'Episode') { newProf.xp += 50; newProf.history.episodes++; }
            
            if (items[i].genres) {
                for(var p=0; p < ud.playCount; p++) {
                    newProf.realmScores = updateRealmScores(newProf.realmScores, items[i].genres);
                }
            }
        }
    }

    var initialLevel = getLevelData(newProf.xp).level;
    if (initialLevel > 1) { newProf.availablePoints = (initialLevel - 1) * 3; }

    jf.userStore.set(userId, 'rpg_char', JSON.stringify(newProf));
    return newProf;
}

function handlePlaybackStopped(data) {
    try {
        if (!data || !data.userId || !data.itemId) return;
        var userId = data.userId;
        var minutes = (data.positionTicks / 10000000) / 60;
        if (!data.playedToEnd && minutes < 5) return; 

        var item = jf.jellyfin.getItem(data.itemId, userId);
        if (!item) return;

        var profile = getOrCreateProfile(userId);
        var earnedXP = (item.type === 'Movie') ? 150 : (item.type === 'Episode') ? 50 : 20;

        if (item.type === 'Movie') profile.history.movies++;
        if (item.type === 'Episode') profile.history.episodes++;

        var oldLvl = getLevelData(profile.xp).level;
        profile.xp += earnedXP;
        var newLvlData = getLevelData(profile.xp);
        
        if (item.genres) {
            profile.realmScores = updateRealmScores(profile.realmScores, item.genres);
        }
        
        var isLevelUp = false;
        if (newLvlData.level > oldLvl) {
            isLevelUp = true;
            profile.availablePoints += ((newLvlData.level - oldLvl) * 3);
        }

        var pClass = getPlayerClass(profile.stats);
        var realm = getDominantRealm(profile.realmScores);
        jf.userStore.set(userId, 'rpg_char', JSON.stringify(profile));

        var bodyMsg = "+" + earnedXP + " XP";
        if (isLevelUp) bodyMsg = "LEVEL UP! +3 Stat Points!";

        jf.jellyfin.notify(userId, {
            type: "JellyRPG_Update",
            title: "Character Progress",
            body: bodyMsg,
            data: { xp: profile.xp, level: newLvlData.level, progress: newLvlData.progress, pClass: pClass, realm: realm, isLevelUp: isLevelUp }
        });
    } catch (e) {
        jf.log.error('RPG Engine Error: ' + e.message);
    }
}

jf.routes.get('/sheet', function(req, res) {
    var userId = req.query['userId'];
    if (!userId) return res.status(400).json({ error: 'userId required' });

    var profile = getOrCreateProfile(userId);
    var lvl = getLevelData(profile.xp);
    var pClass = getPlayerClass(profile.stats);
    var realm = getDominantRealm(profile.realmScores);

    return res.json({
        id: userId,
        level: lvl.level,
        progress: lvl.progress,
        xp: lvl.xp,
        nextXp: lvl.nextXp,
        pClass: pClass,
        realm: realm,
        stats: profile.stats,
        availablePoints: profile.availablePoints
    });
});

jf.routes.post('/allocate', function(req, res) {
    var userId = req.body ? String(req.body.userId) : null;
    var stat = req.body ? String(req.body.stat) : null;
    if (!userId || !stat || ['str', 'int', 'cha', 'dex', 'wis', 'con'].indexOf(stat) === -1) return res.status(400).json({ error: 'Invalid payload' });

    var profileStr = jf.userStore.get(userId, 'rpg_char');
    if (!profileStr) return res.status(404).json({ error: 'Profile not found' });

    var profile = JSON.parse(profileStr);
    if (profile.availablePoints <= 0) return res.status(400).json({ error: 'No points available' });

    profile.availablePoints -= 1;
    profile.stats[stat] += 1;
    jf.userStore.set(userId, 'rpg_char', JSON.stringify(profile));
    return res.json({ ok: true });
});

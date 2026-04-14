// Runs inside Jellyfin via Jint 4.1.0
// Features: Quests, Tiered Achievements, Prestige, and Stat Allocation.

jf.onStart(function() {
    jf.log.info('Jelly RPG Extended Engine Started');
    jf.jellyfin.on('playback.stopped', handlePlaybackStopped);
});

jf.onStop(function() {
    jf.jellyfin.off('playback.stopped');
});

var ACHIEVEMENTS = [
    // Movies
    { id: 'm10', type: 'movies', req: 10, title: '🍿 Popcorn Initiate (10 Movies)', xp: 500 },
    { id: 'm50', type: 'movies', req: 50, title: '🎞️ Silver Screen Fan (50 Movies)', xp: 1500 },
    { id: 'm100', type: 'movies', req: 100, title: '🎬 Cinephile (100 Movies)', xp: 4000 },
    { id: 'm250', type: 'movies', req: 250, title: '🎥 Film Critic (250 Movies)', xp: 10000 },
    { id: 'm500', type: 'movies', req: 500, title: '👑 Supreme Cinephile (500 Movies)', xp: 25000 },
    { id: 'm1000', type: 'movies', req: 1000, title: '🌟 Cinematic Legend (1,000 Movies)', xp: 75000 },
    
    // Episodes
    { id: 'e25', type: 'episodes', req: 25, title: '📺 Casual Binger (25 Episodes)', xp: 500 },
    { id: 'e100', type: 'episodes', req: 100, title: '🛋️ Season Veteran (100 Episodes)', xp: 1500 },
    { id: 'e500', type: 'episodes', req: 500, title: '🍕 Couch Potato (500 Episodes)', xp: 5000 },
    { id: 'e1000', type: 'episodes', req: 1000, title: '🧟 Season Zombie (1,000 Episodes)', xp: 12000 },
    { id: 'e2500', type: 'episodes', req: 2500, title: '🌌 Infinite Watcher (2,500 Episodes)', xp: 30000 },
    { id: 'e5000', type: 'episodes', req: 5000, title: '⏳ Master of Time (5,000 Episodes)', xp: 60000 },
    { id: 'e10000', type: 'episodes', req: 10000, title: '♾️ The Eternal Viewer (10,000 Episodes)', xp: 150000 },
    
    // Quests Completed (New Tracker)
    { id: 'q10', type: 'quests', req: 10, title: '📜 Bounty Hunter (10 Quests)', xp: 1000 },
    { id: 'q50', type: 'quests', req: 50, title: '🗡️ Mercenary (50 Quests)', xp: 4000 },
    { id: 'q100', type: 'quests', req: 100, title: '🦅 Guild Master (100 Quests)', xp: 10000 },
    { id: 'q365', type: 'quests', req: 365, title: '🌞 A Year of Effort (365 Quests)', xp: 50000 },

    // Realm of Iron (Action, Adventure, War, Sports)
    { id: 'r_iron_50', type: 'realm_iron', req: 50, title: '⚔️ Iron Footman (50 Action/War)', xp: 1000 },
    { id: 'r_iron_200', type: 'realm_iron', req: 200, title: '🛡️ Iron Knight (200 Action/War)', xp: 5000 },
    { id: 'r_iron_500', type: 'realm_iron', req: 500, title: '🏰 Iron General (500 Action/War)', xp: 15000 },
    { id: 'r_iron_1000', type: 'realm_iron', req: 1000, title: '🌋 Warlord of Iron (1,000 Action/War)', xp: 40000 },

    // Arcane Academy (Sci-Fi, Documentary, Mystery)
    { id: 'r_arcane_50', type: 'realm_arcane', req: 50, title: '🔮 Arcane Apprentice (50 Sci-Fi/Doc)', xp: 1000 },
    { id: 'r_arcane_200', type: 'realm_arcane', req: 200, title: '🧙‍♂️ Arcane Mage (200 Sci-Fi/Doc)', xp: 5000 },
    { id: 'r_arcane_500', type: 'realm_arcane', req: 500, title: '👁️ Archmage (500 Sci-Fi/Doc)', xp: 15000 },
    { id: 'r_arcane_1000', type: 'realm_arcane', req: 1000, title: '🌌 Cosmic Scholar (1,000 Sci-Fi/Doc)', xp: 40000 },

    // Shadowed Depths (Horror, Suspense)
    { id: 'r_shadow_50', type: 'realm_shadow', req: 50, title: '👻 Spooked (50 Horror/Suspense)', xp: 1000 },
    { id: 'r_shadow_200', type: 'realm_shadow', req: 200, title: '🧛 Nightwalker (200 Horror/Suspense)', xp: 5000 },
    { id: 'r_shadow_500', type: 'realm_shadow', req: 500, title: '🦇 Creature of the Night (500 Horror)', xp: 15000 },
    { id: 'r_shadow_1000', type: 'realm_shadow', req: 1000, title: '💀 Lord of the Abyss (1,000 Horror)', xp: 40000 },

    // Court of Hearts (Comedy, Romance, Music)
    { id: 'r_hearts_50', type: 'realm_hearts', req: 50, title: '💖 Romantic (50 Comedy/Romance)', xp: 1000 },
    { id: 'r_hearts_200', type: 'realm_hearts', req: 200, title: '🎭 Heartbreaker (200 Comedy/Romance)', xp: 5000 },
    { id: 'r_hearts_500', type: 'realm_hearts', req: 500, title: '🍷 Royal Jester (500 Comedy/Romance)', xp: 15000 },
    { id: 'r_hearts_1000', type: 'realm_hearts', req: 1000, title: '💘 Cupid\'s Champion (1,000 Comedy)', xp: 40000 },

    // Grove of Whispers (Drama, Fantasy, History, Crime)
    { id: 'r_grove_50', type: 'realm_grove', req: 50, title: '🌿 Grove Wanderer (50 Drama/Fantasy)', xp: 1000 },
    { id: 'r_grove_200', type: 'realm_grove', req: 200, title: '🦉 Forest Oracle (200 Drama/Fantasy)', xp: 5000 },
    { id: 'r_grove_500', type: 'realm_grove', req: 500, title: '🌲 Ancient Treant (500 Drama/Fantasy)', xp: 15000 },
    { id: 'r_grove_1000', type: 'realm_grove', req: 1000, title: '🐉 Guardian of the Grove (1,000 Drama)', xp: 40000 },

    // The Woven Dream (Animation, Anime, Kids, Family)
    { id: 'r_dream_50', type: 'realm_dream', req: 50, title: '☁️ Dreamer (50 Animation/Anime)', xp: 1000 },
    { id: 'r_dream_200', type: 'realm_dream', req: 200, title: '🦄 Lucid Walker (200 Animation/Anime)', xp: 5000 },
    { id: 'r_dream_500', type: 'realm_dream', req: 500, title: '🎨 Master Animator (500 Animation/Anime)', xp: 15000 },
    { id: 'r_dream_1000', type: 'realm_dream', req: 1000, title: '🌟 The Weaver of Dreams (1,000 Animation)', xp: 40000 }
];

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

function getDominantRealm(scores) {
    var maxRealm = 'Nomad';
    var maxVal = 0;
    var map = { 'iron': 'Realm of Iron', 'arcane': 'Arcane Academy', 'hearts': 'Court of Hearts', 'grove': 'Grove of Whispers', 'shadow': 'Shadowed Depths', 'dream': 'The Woven Dream' };
    var keys = ['iron', 'arcane', 'hearts', 'grove', 'shadow', 'dream'];
    for (var i = 0; i < keys.length; i++) {
        if (scores[keys[i]] > maxVal) { maxVal = scores[keys[i]]; maxRealm = map[keys[i]]; }
    }
    return maxRealm;
}

function getOrCreateProfile(userId) {
    var str = jf.userStore.get(userId, 'rpg_char');
    if (str) return JSON.parse(str);

    var newProf = { 
        xp: 0, prestige: 0,
        stats: { str: 0, int: 0, cha: 0, dex: 0, wis: 0, con: 0 },
        availablePoints: 0,
        realmScores: { iron: 0, arcane: 0, hearts: 0, grove: 0, shadow: 0, dream: 0 },
        history: { movies: 0, episodes: 0, questsDone: 0 },
        unlockedAchievements: [],
        unlockedBanners: ['default'],
        equippedBanner: 'default',
        quests: { date: '', tasks: [] }
    };
    jf.userStore.set(userId, 'rpg_char', JSON.stringify(newProf));
    return newProf;
}

function ensureQuests(profile) {
    var today = new Date().toISOString().split('T')[0];
    if (!profile.quests || profile.quests.date !== today) {
        profile.quests = { date: today, tasks: [] };
        
        var configQuestCount = parseInt(jf.vars['DAILY_QUEST_COUNT'] || '3', 10);
        if (configQuestCount < 1) configQuestCount = 1;
        if (configQuestCount > 6) configQuestCount = 6;
        
        var pool = [
            { id: 'q1', desc: 'Feature Presentation (1 Movie)', type: 'Movie', goal: 1, progress: 0, xp: 250, done: false },
            { id: 'q2', desc: 'Double Feature (2 Movies)', type: 'Movie', goal: 2, progress: 0, xp: 600, done: false },
            { id: 'q3', desc: 'Film Fest (3 Movies)', type: 'Movie', goal: 3, progress: 0, xp: 1000, done: false },
            { id: 'q4', desc: 'Quick Watch (1 Episode)', type: 'Episode', goal: 1, progress: 0, xp: 100, done: false },
            { id: 'q5', desc: 'Casual Viewing (2 Episodes)', type: 'Episode', goal: 2, progress: 0, xp: 250, done: false },
            { id: 'q6', desc: 'Mini-Binge (4 Episodes)', type: 'Episode', goal: 4, progress: 0, xp: 550, done: false },
            { id: 'q7', desc: 'Weekend Warrior (8 Episodes)', type: 'Episode', goal: 8, progress: 0, xp: 1200, done: false },
            { id: 'q8', desc: 'Adrenaline Rush (1 Action/Adventure)', type: 'genre', target: 'Action', fallback: 'Adventure', goal: 1, progress: 0, xp: 200, done: false },
            { id: 'q9', desc: 'Action Hero (3 Action Items)', type: 'genre', target: 'Action', fallback: 'War', goal: 3, progress: 0, xp: 750, done: false },
            { id: 'q10', desc: 'Have a Laugh (1 Comedy)', type: 'genre', target: 'Comedy', fallback: 'Comedy', goal: 1, progress: 0, xp: 200, done: false },
            { id: 'q11', desc: 'Comedy Marathon (3 Comedies)', type: 'genre', target: 'Comedy', fallback: 'Romance', goal: 3, progress: 0, xp: 750, done: false },
            { id: 'q12', desc: 'Expand your Mind (1 Sci-Fi/Doc)', type: 'genre', target: 'Sci-Fi', fallback: 'Documentary', goal: 1, progress: 0, xp: 250, done: false },
            { id: 'q13', desc: 'To the Stars (3 Sci-Fi Items)', type: 'genre', target: 'Sci-Fi', fallback: 'Science Fiction', goal: 3, progress: 0, xp: 850, done: false },
            { id: 'q14', desc: 'Face your Fears (1 Horror/Suspense)', type: 'genre', target: 'Horror', fallback: 'Suspense', goal: 1, progress: 0, xp: 300, done: false },
            { id: 'q15', desc: 'Screamfest (3 Horror Items)', type: 'genre', target: 'Horror', fallback: 'Horror', goal: 3, progress: 0, xp: 1000, done: false },
            { id: 'q16', desc: 'Animated Afternoon (1 Animation/Anime)', type: 'genre', target: 'Animation', fallback: 'Anime', goal: 1, progress: 0, xp: 200, done: false },
            { id: 'q17', desc: 'Toon Binge (5 Animated Items)', type: 'genre', target: 'Animation', fallback: 'Anime', goal: 5, progress: 0, xp: 1100, done: false },
            { id: 'q18', desc: 'Deep Story (1 Drama/Fantasy)', type: 'genre', target: 'Drama', fallback: 'Fantasy', goal: 1, progress: 0, xp: 200, done: false },
            { id: 'q19', desc: 'Whodunnit? (1 Mystery/Crime)', type: 'genre', target: 'Mystery', fallback: 'Crime', goal: 1, progress: 0, xp: 250, done: false },
            { id: 'q20', desc: 'Detective Work (3 Mystery Items)', type: 'genre', target: 'Mystery', fallback: 'Crime', goal: 3, progress: 0, xp: 850, done: false },
            { id: 'q21', desc: 'History Buff (1 History/Doc)', type: 'genre', target: 'History', fallback: 'Documentary', goal: 1, progress: 0, xp: 300, done: false },
            { id: 'q22', desc: 'Date Night (1 Romance)', type: 'genre', target: 'Romance', fallback: 'Romance', goal: 1, progress: 0, xp: 250, done: false },
            { id: 'q23', desc: 'Family Time (1 Kids/Family)', type: 'genre', target: 'Family', fallback: 'Kids', goal: 1, progress: 0, xp: 200, done: false }
        ];
        
        var selected = [];
        for (var i = 0; i < configQuestCount; i++) {
            if (pool.length === 0) break;
            var idx = Math.floor(Math.random() * pool.length);
            selected.push(pool[idx]);
            pool.splice(idx, 1); 
        }
        profile.quests.tasks = selected;
        return true;
    }
    return false;
}

function processQuests(profile, item) {
    ensureQuests(profile);
    var notifications = [];
    var genresStr = item.genres ? item.genres.join(', ') : '';
    
    if (typeof profile.history.questsDone === 'undefined') {
        profile.history.questsDone = 0;
    }

    for (var i = 0; i < profile.quests.tasks.length; i++) {
        var q = profile.quests.tasks[i];
        if (q.done) continue;

        if (q.type === item.type) {
            q.progress++;
        } else if (q.type === 'genre') {
            if (genresStr.indexOf(q.target) !== -1 || (q.fallback && genresStr.indexOf(q.fallback) !== -1)) {
                q.progress++;
            }
        }

        if (q.progress >= q.goal) {
            q.done = true;
            earnedQuestXP += q.xp;
            profile.history.questsDone++;
            notifications.push("🎯 Bounty Complete: " + q.desc);
        }
    }
    return { xp: earnedQuestXP, notifications: notifications };
}

function processAchievements(profile) {
    var earnedXP = 0;
    var notifications = [];
    if (!profile.unlockedAchievements) profile.unlockedAchievements = [];

    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
        var a = ACHIEVEMENTS[i];
        if (profile.unlockedAchievements.indexOf(a.id) === -1) {
            var unlocked = false;
            
            if (a.type === 'movies' && profile.history.movies >= a.req) unlocked = true;
            else if (a.type === 'episodes' && profile.history.episodes >= a.req) unlocked = true;
            else if (a.type === 'quests' && (profile.history.questsDone || 0) >= a.req) unlocked = true;
            else if (a.type === 'realm_iron' && (profile.realmScores.iron || 0) >= a.req) unlocked = true;
            else if (a.type === 'realm_arcane' && (profile.realmScores.arcane || 0) >= a.req) unlocked = true;
            else if (a.type === 'realm_shadow' && (profile.realmScores.shadow || 0) >= a.req) unlocked = true;
            else if (a.type === 'realm_hearts' && (profile.realmScores.hearts || 0) >= a.req) unlocked = true;
            else if (a.type === 'realm_grove' && (profile.realmScores.grove || 0) >= a.req) unlocked = true;
            else if (a.type === 'realm_dream' && (profile.realmScores.dream || 0) >= a.req) unlocked = true;

            if (unlocked) {
                profile.unlockedAchievements.push(a.id);
                earnedXP += a.xp;
                notifications.push("🏅 " + a.title);
            }
        }
    }
    return { xp: earnedXP, notifications: notifications };
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
        
        var globalXpMult = parseFloat(jf.vars['GLOBAL_XP_MULTIPLIER'] || '1.0');
        var baseMovieXp = parseInt(jf.vars['BASE_XP_MOVIE'] || '150', 10);
        var baseEpXp = parseInt(jf.vars['BASE_XP_EPISODE'] || '50', 10);
        var baseOtherXp = 20;

        var prestigeMult = 1.0 + ((profile.prestige || 0) * 0.10);
        var totalMult = prestigeMult * globalXpMult;
        
        var rawXP = (item.type === 'Movie') ? baseMovieXp : (item.type === 'Episode') ? baseEpXp : baseOtherXp;
        var earnedXP = Math.floor(rawXP * totalMult);

        if (item.type === 'Movie') profile.history.movies++;
        if (item.type === 'Episode') profile.history.episodes++;

        var oldLvl = getLevelData(profile.xp).level;
        
        var questRes = processQuests(profile, item);
        var achRes = processAchievements(profile);
        
        earnedXP += Math.floor(questRes.xp * globalXpMult);
        earnedXP += Math.floor(achRes.xp * globalXpMult);

        profile.xp += earnedXP;
        var newLvlData = getLevelData(profile.xp);
        
        if (item.genres) {
            for(var g=0; g<item.genres.length; g++) {
                var gn = item.genres[g].toLowerCase();
                if (gn.indexOf('action') !== -1 || gn.indexOf('adventure') !== -1 || gn.indexOf('war') !== -1) profile.realmScores.iron++;
                else if (gn.indexOf('sci-fi') !== -1 || gn.indexOf('documentary') !== -1 || gn.indexOf('mystery') !== -1) profile.realmScores.arcane++;
                else if (gn.indexOf('comedy') !== -1 || gn.indexOf('romance') !== -1 || gn.indexOf('music') !== -1) profile.realmScores.hearts++;
                else if (gn.indexOf('drama') !== -1 || gn.indexOf('fantasy') !== -1 || gn.indexOf('crime') !== -1) profile.realmScores.grove++;
                else if (gn.indexOf('horror') !== -1 || gn.indexOf('suspense') !== -1) profile.realmScores.shadow++;
                else if (gn.indexOf('animation') !== -1 || gn.indexOf('anime') !== -1 || gn.indexOf('family') !== -1) profile.realmScores.dream++;
            }
        }
        
        var isLevelUp = false;
        if (newLvlData.level > oldLvl) {
            isLevelUp = true;
            profile.availablePoints += ((newLvlData.level - oldLvl) * 3);
        }

        // Banner Unlocks based on Level
        if (!profile.unlockedBanners) profile.unlockedBanners = ['default'];
        if (!profile.equippedBanner) profile.equippedBanner = 'default';
        
        if (newLvlData.level >= 25 && profile.unlockedBanners.indexOf('iron_hex') === -1) {
            profile.unlockedBanners.push('iron_hex');
        }
        if (newLvlData.level >= 50 && profile.unlockedBanners.indexOf('arcane_runes') === -1) {
            profile.unlockedBanners.push('arcane_runes');
        }

        jf.userStore.set(userId, 'rpg_char', JSON.stringify(profile));

        var bodyMsg = "+" + earnedXP + " XP";
        if (achRes.notifications.length > 0) bodyMsg = achRes.notifications[0];
        else if (questRes.notifications.length > 0) bodyMsg = questRes.notifications[0];
        else if (isLevelUp) bodyMsg = "LEVEL UP! +3 Stat Points!";

        jf.jellyfin.notify(userId, {
            type: "JellyRPG_Update", title: "Character Progress", body: bodyMsg,
            data: { xp: profile.xp, level: newLvlData.level, progress: newLvlData.progress, isLevelUp: isLevelUp }
        });
    } catch (e) { jf.log.error('RPG Engine Error: ' + e.message); }
}

jf.routes.get('/sheet', function(req, res) {
    var userId = req.query['userId'];
    if (!userId) return res.status(400).json({ error: 'userId required' });

    var profile = getOrCreateProfile(userId);
    
    if (ensureQuests(profile)) {
        jf.userStore.set(userId, 'rpg_char', JSON.stringify(profile));
    }
    
    var lvl = getLevelData(profile.xp);
    
    var titles = [];
    for(var i=0; i<(profile.unlockedAchievements||[]).length; i++) {
        for(var j=0; j<ACHIEVEMENTS.length; j++) {
            if(ACHIEVEMENTS[j].id === profile.unlockedAchievements[i]) titles.push(ACHIEVEMENTS[j].title);
        }
    }

    return res.json({
        id: userId, level: lvl.level, progress: lvl.progress, xp: lvl.xp, nextXp: lvl.nextXp,
        pClass: getPlayerClass(profile.stats),
        realm: getDominantRealm(profile.realmScores),
        stats: profile.stats, availablePoints: profile.availablePoints, prestige: profile.prestige || 0,
        quests: profile.quests, 
        achievements: titles,
        unlockedAchievements: profile.unlockedAchievements || [],
        history: profile.history || { movies: 0, episodes: 0, questsDone: 0 },
        realmScores: profile.realmScores || {},
        unlockedBanners: profile.unlockedBanners || ['default'], equippedBanner: profile.equippedBanner || 'default'
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

jf.routes.post('/prestige', function(req, res) {
    var userId = req.body ? String(req.body.userId) : null;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    var profileStr = jf.userStore.get(userId, 'rpg_char');
    if (!profileStr) return res.status(404).json({ error: 'Profile not found' });
    var profile = JSON.parse(profileStr);

    if (getLevelData(profile.xp).level < 100) return res.status(400).json({ error: 'Level 100 required' });

    profile.xp = 0;
    profile.stats = { str: 0, int: 0, cha: 0, dex: 0, wis: 0, con: 0 };
    profile.availablePoints = 0;
    profile.prestige = (profile.prestige || 0) + 1;
    
    if (!profile.unlockedBanners) profile.unlockedBanners = ['default'];
    if (profile.prestige >= 1 && profile.unlockedBanners.indexOf('prestige_gold') === -1) profile.unlockedBanners.push('prestige_gold');
    if (profile.prestige >= 2 && profile.unlockedBanners.indexOf('obsidian_matrix') === -1) profile.unlockedBanners.push('obsidian_matrix');
    
    jf.userStore.set(userId, 'rpg_char', JSON.stringify(profile));
    return res.json({ ok: true });
});

jf.routes.post('/equip_banner', function(req, res) {
    var userId = req.body ? String(req.body.userId) : null;
    var bannerId = req.body ? String(req.body.bannerId) : null;
    
    if (!userId || !bannerId) return res.status(400).json({ error: 'Missing parameters' });

    var profileStr = jf.userStore.get(userId, 'rpg_char');
    if (!profileStr) return res.status(404).json({ error: 'Profile not found' });

    var profile = JSON.parse(profileStr);
    if (!profile.unlockedBanners || profile.unlockedBanners.indexOf(bannerId) === -1) {
        return res.status(403).json({ error: 'Banner not unlocked' });
    }

    profile.equippedBanner = bannerId;
    jf.userStore.set(userId, 'rpg_char', JSON.stringify(profile));
    return res.json({ ok: true });
});

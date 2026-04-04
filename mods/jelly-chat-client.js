// browser.js - The UI and Polling logic
(function() {
    var MOD_ID = 'jelly-chat';
    var lastSync = 0;

    function createChatUI() {
        if (document.getElementById('jf-chat-main')) return;

        var chatWrap = document.createElement('div');
        chatWrap.id = 'jf-chat-main';
        // Facebook-style bottom-right docked UI
        chatWrap.setAttribute('style', 'position:fixed; bottom:0; right:30px; width:280px; background:#101010; border:1px solid #333; border-bottom:0; z-index:10000; font-family:sans-serif; color:#eee; border-radius:8px 8px 0 0; box-shadow: 0 0 15px rgba(0,0,0,0.5);');

        chatWrap.innerHTML = 
            '<div id="chat-head" style="padding:10px; background:{{ACCENT_COLOR}}; cursor:pointer; font-weight:bold; border-radius:8px 8px 0 0;">JellyChat (<span id="online-count">0</span>)</div>' +
            '<div id="chat-body" style="display:none; height:350px; flex-direction:column;">' +
                '<div id="chat-online-list" style="padding:5px; background:#1a1a1a; font-size:11px; border-bottom:1px solid #333; max-height:60px; overflow-y:auto;"></div>' +
                '<div id="chat-msgs" style="flex:1; overflow-y:auto; padding:10px; font-size:13px; display:flex; flex-direction:column; gap:8px;"></div>' +
                '<div style="padding:10px; border-top:1px solid #333;">' +
                    '<input type="text" id="chat-input" placeholder="Say something..." style="width:100%; background:#222; border:1px solid #444; color:white; padding:8px; box-sizing:border-box; border-radius:4px;">' +
                '</div>' +
            '</div>';

        document.body.appendChild(chatWrap);

        var head = document.getElementById('chat-head');
        var body = document.getElementById('chat-body');
        head.addEventListener('click', function() {
            body.style.display = body.style.display === 'none' ? 'flex' : 'none';
        });

        var input = document.getElementById('chat-input');
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && input.value) {
                postMessage(input.value);
                input.value = '';
            }
        });
    }

    function postMessage(txt) {
        // ApiClient is global in Jellyfin web
        var user = ApiClient._currentUser;
        var payload = JSON.stringify({
            text: txt,
            userId: user.Id,
            userName: user.Name
        });

        fetch('/JellyFrame/mods/' + MOD_ID + '/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        });
    }

    function sync() {
        fetch('/JellyFrame/mods/' + MOD_ID + '/api/sync')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                updateView(data);
            });
    }

    function updateView(data) {
        document.getElementById('online-count').innerText = data.online.length;
        
        var list = document.getElementById('chat-online-list');
        list.innerHTML = '';
        for (var i = 0; i < data.online.length; i++) {
            var u = data.online[i];
            var color = u.isWatching ? '#3fb950' : '#888'; // Green if watching
            list.innerHTML += '<span style="margin-right:8px;"><span style="color:'+color+';">●</span> ' + u.name + '</span>';
        }

        var msgBox = document.getElementById('chat-msgs');
        if (data.messages.length !== lastSync) {
            msgBox.innerHTML = '';
            for (var j = 0; j < data.messages.length; j++) {
                var m = data.messages[j];
                var isMe = m.userId === ApiClient._currentUser.Id;
                var align = isMe ? 'align-self:flex-end; background:{{ACCENT_COLOR}};' : 'align-self:flex-start; background:#333;';
                msgBox.innerHTML += '<div style="padding:6px 10px; border-radius:12px; max-width:80%; font-size:12px; '+align+'">' +
                    '<div style="font-size:10px; opacity:0.7; margin-bottom:2px;">' + m.userName + '</div>' + m.text + '</div>';
            }
            msgBox.scrollTop = msgBox.scrollHeight;
            lastSync = data.messages.length;
        }
    }

    createChatUI();
    setInterval(sync, 4000); // Polling every 4s to balance real-time feel and CPU load
})();
